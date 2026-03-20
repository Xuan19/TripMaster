using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using TripMaster.Api.Configuration;
using TripMaster.Api.Models;

namespace TripMaster.Api.Services;

public sealed class EmailVerificationService
{
    private readonly EmailOptions _options;
    private readonly ILogger<EmailVerificationService> _logger;
    private readonly IWebHostEnvironment _environment;
    private readonly HttpClient _httpClient;

    public EmailVerificationService(
        IOptions<EmailOptions> options,
        ILogger<EmailVerificationService> logger,
        IWebHostEnvironment environment,
        HttpClient httpClient)
    {
        _options = options.Value;
        _logger = logger;
        _environment = environment;
        _httpClient = httpClient;
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

        if (!IsEmailProviderConfigured())
        {
            _logger.LogInformation("Email verification for {Email}: {VerificationUrl}", user.Email, verificationUrl);
            return;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.resend.com/emails")
        {
            Content = JsonContent.Create(new
            {
                from = string.IsNullOrWhiteSpace(_options.FromName)
                    ? _options.FromAddress
                    : $"{_options.FromName} <{_options.FromAddress}>",
                to = new[] { user.Email },
                subject,
                text = body
            })
        };
        request.Headers.Add("Authorization", $"Bearer {_options.ResendApiKey}");

        cancellationToken.ThrowIfCancellationRequested();
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Resend email request failed: {(int)response.StatusCode} {responseBody}");
        }
    }

    public string BuildVerificationUrl(string email, string token)
    {
        var baseUrl = _options.BaseUrl.TrimEnd('/');
        var separator = baseUrl.Contains('?') ? '&' : '?';
        return $"{baseUrl}/api/auth/verify-email{separator}email={Uri.EscapeDataString(email)}&token={Uri.EscapeDataString(token)}";
    }

    public bool ShouldExposeVerificationToken()
    {
        return _environment.IsDevelopment() && IsEmailProviderConfigured();
    }

    public bool IsEmailProviderConfigured()
    {
        return !string.IsNullOrWhiteSpace(_options.ResendApiKey) &&
               !string.IsNullOrWhiteSpace(_options.FromAddress);
    }
}
