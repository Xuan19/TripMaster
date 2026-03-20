namespace TripMaster.Api.Configuration;

public sealed class EmailOptions
{
    public const string SectionName = "Email";

    public string BaseUrl { get; set; } = "http://localhost:5173";
    public string? FromAddress { get; set; }
    public string? FromName { get; set; }
    public string? ResendApiKey { get; set; }
}
