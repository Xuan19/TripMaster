using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.Json;
using TripMaster.Api.Data;
using TripMaster.Api.Dtos;
using TripMaster.Api.Models;

namespace TripMaster.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
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
        var userId = GetCurrentUserId();
        var trips = await _db.Trips
            .Where(t => t.UserId == userId)
            .OrderBy(t => t.StartDate)
            .ToListAsync();

        return Ok(trips.Select(ToResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<TripResponse>> GetById(int id)
    {
        var userId = GetCurrentUserId();
        var trip = await _db.Trips.SingleOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (trip is null) return NotFound();

        return Ok(ToResponse(trip));
    }

    [HttpPost]
    public async Task<ActionResult<TripResponse>> Create(CreateTripRequest request)
    {
        var userId = GetCurrentUserId();
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
            DetailsJson = request.Details?.GetRawText(),
            UserId = userId
        };

        _db.Trips.Add(trip);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = trip.Id }, ToResponse(trip));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<TripResponse>> Update(int id, CreateTripRequest request)
    {
        var userId = GetCurrentUserId();
        if (request.EndDate < request.StartDate)
        {
            ModelState.AddModelError(nameof(request.EndDate), "End date must be after start date.");
            return ValidationProblem(ModelState);
        }

        var trip = await _db.Trips.SingleOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (trip is null) return NotFound();

        trip.Name = request.Name;
        trip.Country = request.Country;
        trip.StartDate = request.StartDate;
        trip.EndDate = request.EndDate;
        trip.Budget = request.Budget;
        trip.DetailsJson = request.Details?.GetRawText();

        await _db.SaveChangesAsync();

        return Ok(ToResponse(trip));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetCurrentUserId();
        var trip = await _db.Trips.SingleOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (trip is null) return NotFound();

        _db.Trips.Remove(trip);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private int GetCurrentUserId()
    {
        var rawId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!int.TryParse(rawId, out var userId))
        {
            throw new UnauthorizedAccessException("Missing user id claim.");
        }

        return userId;
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
