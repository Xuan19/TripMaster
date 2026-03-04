using System.ComponentModel.DataAnnotations;

namespace TripMaster.Api.Dtos;

public class CreateTripRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Country { get; set; } = string.Empty;

    [Required]
    public DateOnly StartDate { get; set; }

    [Required]
    public DateOnly EndDate { get; set; }

    [Range(0, 9999999)]
    public decimal Budget { get; set; }
}
