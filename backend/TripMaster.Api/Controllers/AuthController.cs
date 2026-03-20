using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TripMaster.Api.Data;
using TripMaster.Api.Dtos;
using TripMaster.Api.Models;
using TripMaster.Api.Services;

namespace TripMaster.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly TripMasterDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly EmailVerificationService _emailVerificationService;

    public AuthController(
        TripMasterDbContext db,
        IConfiguration configuration,
        EmailVerificationService emailVerificationService)
    {
        _db = db;
        _configuration = configuration;
        _emailVerificationService = emailVerificationService;
    }

    [HttpPost("register")]
    public async Task<ActionResult<RegisterResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var normalizedUsername = request.Username.Trim();
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var exists = await _db.Users.AnyAsync(u => u.Username == normalizedUsername);
        if (exists)
        {
            ModelState.AddModelError(nameof(request.Username), "Username is already in use.");
            return ValidationProblem(ModelState);
        }
        var emailExists = await _db.Users.AnyAsync(u => u.Email == normalizedEmail);
        if (emailExists)
        {
            ModelState.AddModelError(nameof(request.Email), "Email is already in use.");
            return ValidationProblem(ModelState);
        }

        var user = new User
        {
            Username = normalizedUsername,
            Email = normalizedEmail,
            PasswordHash = PasswordHasher.HashPassword(request.Password),
            IsEmailVerified = false,
            EmailVerificationToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(24)),
            EmailVerificationTokenExpiresUtc = DateTime.UtcNow.AddHours(24)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);
        await _emailVerificationService.SendVerificationEmailAsync(user, cancellationToken);

        return Accepted(new RegisterResponse
        {
            Message = "Account created. Please confirm your email before signing in.",
            VerificationToken = _emailVerificationService.ShouldExposeVerificationToken()
                ? user.EmailVerificationToken
                : null
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var identifier = request.Identifier.Trim();
        var normalizedEmail = identifier.ToLowerInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Username == identifier || u.Email == normalizedEmail);
        if (user is null || !PasswordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }

        if (!user.IsEmailVerified)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Please confirm your email before signing in."
            });
        }

        return Ok(new AuthResponse
        {
            Username = user.Username,
            Email = user.Email,
            Token = GenerateToken(user)
        });
    }

    [HttpPost("forgot-password")]
    public async Task<ActionResult<object>> ForgotPassword(ForgotPasswordRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user is not null)
        {
            user.PasswordResetToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(24));
            user.PasswordResetTokenExpiresUtc = DateTime.UtcNow.AddMinutes(30);
            await _db.SaveChangesAsync();

            if (HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>().IsDevelopment())
            {
                return Ok(new
                {
                    message = "Password reset token generated.",
                    resetToken = user.PasswordResetToken
                });
            }
        }

        return Ok(new { message = "If this email exists, a reset token has been created." });
    }

    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string email, [FromQuery] string token)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var normalizedToken = token.Trim().ToUpperInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user is null ||
            user.IsEmailVerified ||
            string.IsNullOrWhiteSpace(user.EmailVerificationToken) ||
            !string.Equals(user.EmailVerificationToken, normalizedToken, StringComparison.Ordinal) ||
            user.EmailVerificationTokenExpiresUtc is null ||
            user.EmailVerificationTokenExpiresUtc < DateTime.UtcNow)
        {
            return Content(BuildVerificationHtml(
                "Email confirmation failed",
                "This verification link is invalid or expired."),
                "text/html");
        }

        user.IsEmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiresUtc = null;
        await _db.SaveChangesAsync();

        return Content(BuildVerificationHtml(
            "Email confirmed",
            "Your TripMaster email is confirmed. You can now return to the app and sign in."),
            "text/html");
    }

    [HttpPost("reset-password")]
    public async Task<ActionResult<object>> ResetPassword(ResetPasswordRequest request)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var token = request.Token.Trim().ToUpperInvariant();
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user is null ||
            string.IsNullOrWhiteSpace(user.PasswordResetToken) ||
            !string.Equals(user.PasswordResetToken, token, StringComparison.Ordinal) ||
            user.PasswordResetTokenExpiresUtc is null ||
            user.PasswordResetTokenExpiresUtc < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invalid or expired reset token." });
        }

        user.PasswordHash = PasswordHasher.HashPassword(request.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpiresUtc = null;
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password has been reset." });
    }

    private string GenerateToken(User user)
    {
        var key = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("Missing Jwt:Key configuration.");
        var issuer = _configuration["Jwt:Issuer"] ?? "TripMaster.Api";
        var audience = _configuration["Jwt:Audience"] ?? "TripMaster.Web";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username)
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string BuildVerificationHtml(string title, string message)
    {
        var encodedTitle = HtmlEncoder.Default.Encode(title);
        var encodedMessage = HtmlEncoder.Default.Encode(message);
        return $$"""
            <!doctype html>
            <html lang="en">
              <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>{{encodedTitle}}</title>
                <style>
                  body { font-family: Arial, sans-serif; background: #fff7ed; color: #431407; margin: 0; padding: 32px; }
                  .card { max-width: 520px; margin: 40px auto; background: white; border: 1px solid #fdba74; border-radius: 16px; padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
                  h1 { margin-top: 0; color: #c2410c; }
                </style>
              </head>
              <body>
                <div class="card">
                  <h1>{{encodedTitle}}</h1>
                  <p>{{encodedMessage}}</p>
                </div>
              </body>
            </html>
            """;
    }
}
