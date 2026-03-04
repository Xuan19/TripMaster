using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    public async Task<ActionResult<IEnumerable<Trip>>> GetAll()
    {
        var trips = await _db.Trips
            .OrderBy(t => t.StartDate)
            .ToListAsync();

        return Ok(trips);
    }

    [HttpPost]
    public async Task<ActionResult<Trip>> Create(CreateTripRequest request)
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
            Budget = request.Budget
        };

        _db.Trips.Add(trip);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = trip.Id }, trip);
    }
}
