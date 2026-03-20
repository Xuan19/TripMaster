using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using TripMaster.Api.Configuration;
using TripMaster.Api.Models;

namespace TripMaster.Api.Services;

public sealed class EmailVerificationService
{
    private readonly EmailOptions _options;
    private readonly ILogger<EmailVerificationService> _logger;
    private readonly IWebHostEnvironment _environment;

    public EmailVerificationService(
        IOptions<EmailOptions> options,
        ILogger<EmailVerificationService> logger,
        IWebHostEnvironment environment)
    {
        _options = options.Value;
        _logger = logger;
        _environment = environment;
    }

    public async Task SendVerificationEmailAsync(User user, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(user.EmailVerificationToken))
        {
            return;
        }

        var verificationUrl = BuildVerificationUrl(user.Email, user.EmailVerificationToken);
        var subject = "Confirm your TripMaster email";
        var body = $"""
            Welcome to TripMaster.

            Please confirm your email by opening this link:
            {verificationUrl}

            This link expires in 24 hours.
            """;

        if (string.IsNullOrWhiteSpace(_options.SmtpHost) || string.IsNullOrWhiteSpace(_options.FromAddress))
        {
            _logger.LogInformation("Email verification for {Email}: {VerificationUrl}", user.Email, verificationUrl);
            return;
        }

        using var message = new MailMessage
        {
            From = new MailAddress(_options.FromAddress, _options.FromName),
            Subject = subject,
            Body = body
        };
        message.To.Add(user.Email);

        using var client = new SmtpClient(_options.SmtpHost, _options.Port)
        {
            EnableSsl = _options.EnableSsl
        };

        if (!string.IsNullOrWhiteSpace(_options.Username))
        {
            client.Credentials = new NetworkCredential(_options.Username, _options.Password);
        }

        cancellationToken.ThrowIfCancellationRequested();
        await client.SendMailAsync(message, cancellationToken);
    }

    public string BuildVerificationUrl(string email, string token)
    {
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var separator = baseUrl.Contains('?') ? '&' : '?';
        return $"{baseUrl}/api/auth/verify-email{separator}email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
    }

    public bool ShouldExposeVerificationToken()
    {
        return _environment.IsDevelopment() || string.IsNullOrWhiteSpace(_options.SmtpHost);
    }
}
