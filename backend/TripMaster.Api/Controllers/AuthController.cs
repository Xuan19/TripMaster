using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
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

    public AuthController(TripMasterDbContext db, IConfiguration configuration)
    {
        _db = db;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
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
            PasswordHash = PasswordHasher.HashPassword(request.Password)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Ok(new AuthResponse
        {
            Username = user.Username,
            Email = user.Email,
            Token = GenerateToken(user)
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
}
