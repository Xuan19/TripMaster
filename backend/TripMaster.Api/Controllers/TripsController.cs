using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using TripMaster.Api.Data;
using TripMaster.Api.Dtos;
using TripMaster.Api.Models;

namespace TripMaster.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TripsController : ControllerBase
{
    private readonly TripMasterDbContext _db;

    public TripsController(TripMasterDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TripResponse>>> GetAll()
    {
        var trips = await _db.Trips
            .OrderBy(t => t.StartDate)
            .ToListAsync();

        return Ok(trips.Select(ToResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TripResponse>> GetById(int id)
    {
        var trip = await _db.Trips.FindAsync(id);
        if (trip is null) return NotFound();

        return Ok(ToResponse(trip));
    }

    [HttpPost]
    public async Task<ActionResult<TripResponse>> Create(CreateTripRequest request)
    {
        if (request.EndDate < request.StartDate)
        {
            ModelState.AddModelError(nameof(request.EndDate), "End date must be after start date.");
            return ValidationProblem(ModelState);
        }

        var trip = new Trip
        {
            Name = request.Name,
            Country = request.Country,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Budget = request.Budget,
            DetailsJson = request.Details?.GetRawText()
        };

        _db.Trips.Add(trip);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = trip.Id }, ToResponse(trip));
    }

    private static TripResponse ToResponse(Trip trip)
    {
        JsonElement? details = null;
        if (!string.IsNullOrWhiteSpace(trip.DetailsJson))
        {
            try
            {
                details = JsonSerializer.Deserialize<JsonElement>(trip.DetailsJson);
            }
            catch
            {
                details = null;
            }
        }

        return new TripResponse
        {
            Id = trip.Id,
            Name = trip.Name,
            Country = trip.Country,
            StartDate = trip.StartDate,
            EndDate = trip.EndDate,
            Budget = trip.Budget,
            Details = details
        };
    }
}
