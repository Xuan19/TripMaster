using System.ComponentModel.DataAnnotations;

namespace TripMaster.Api.Dtos;

public class ForgotPasswordRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;
}
