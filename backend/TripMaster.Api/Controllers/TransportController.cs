using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TripMaster.Api.Dtos;
using TripMaster.Api.Services;

namespace TripMaster.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class TransportController : ControllerBase
{
    private readonly TransportRestJourneyService _journeyService;

    public TransportController(TransportRestJourneyService journeyService)
    {
        _journeyService = journeyService;
    }

    [HttpPost("train-journey")]
    public async Task<ActionResult<TrainJourneyResponse>> GetTrainJourney(
        TrainJourneyRequest request,
        CancellationToken cancellationToken)
    {
        TrainJourneyResponse? journey;
        try
        {
            journey = await _journeyService.GetTrainJourneyAsync(request, cancellationToken);
        }
        catch (TransportRestApiException exception)
        {
            return Problem(
                title: "Train journey request failed",
                detail: exception.ResponseBody,
                statusCode: exception.StatusCode >= 400 && exception.StatusCode < 600
                    ? exception.StatusCode
                    : StatusCodes.Status502BadGateway);
        }

        if (journey is null)
        {
            return NotFound();
        }

        return Ok(journey);
    }
}
