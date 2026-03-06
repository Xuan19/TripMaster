using System.Text.Json;

namespace TripMaster.Api.Dtos;

public class TripResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal Budget { get; set; }
    public JsonElement? Details { get; set; }
}
