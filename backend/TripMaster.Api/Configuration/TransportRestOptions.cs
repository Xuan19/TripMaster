namespace TripMaster.Api.Configuration;

public sealed class TransportRestOptions
{
    public const string SectionName = "TransportRest";

    public string BaseUrl { get; set; } = "https://v6.db.transport.rest";
}
