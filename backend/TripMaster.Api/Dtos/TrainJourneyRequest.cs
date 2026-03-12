using System.ComponentModel.DataAnnotations;

namespace TripMaster.Api.Dtos;

public sealed class TrainJourneyRequest
{
    [Required]
    public string From { get; set; } = string.Empty;

    [Required]
    public string To { get; set; } = string.Empty;

    [Required]
    public DateTimeOffset DepartureDateTime { get; set; }
}
