namespace TripMaster.Api.Models;

public class Trip
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal Budget { get; set; }
    public string? DetailsJson { get; set; }
    public int? UserId { get; set; }
    public User? User { get; set; }
}
