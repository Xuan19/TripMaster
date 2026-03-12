namespace TripMaster.Api.Dtos;

public sealed class TrainJourneyResponse
{
    public string? TrainReference { get; set; }

    public string? TrainLabel { get; set; }

    public DateTimeOffset? DepartureDateTime { get; set; }

    public DateTimeOffset? ArrivalDateTime { get; set; }

    public int? DurationSeconds { get; set; }

    public decimal? TicketPrice { get; set; }

    public string? TicketCurrency { get; set; }

    public IReadOnlyList<string> Sections { get; set; } = Array.Empty<string>();
}
