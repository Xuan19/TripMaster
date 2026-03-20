namespace TripMaster.Api.Configuration;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public string BaseUrl { get; set; } = "http://localhost:5173";
    public string? FromAddress { get; set; }
    public string? FromName { get; set; }
    public string? SmtpHost { get; set; }
    public int Port { get; set; } = 587;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public bool EnableSsl { get; set; } = true;
}
