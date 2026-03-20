namespace TripMaster.Api.Dtos;

public class RegisterResponse
{
    public string Message { get; set; } = string.Empty;
    public string? VerificationToken { get; set; }
}
