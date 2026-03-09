using System.ComponentModel.DataAnnotations;

namespace TripMaster.Api.Dtos;

public class LoginRequest
{
    [Required]
    [MinLength(3)]
    [MaxLength(256)]
    public string Identifier { get; set; } = string.Empty;

    [Required]
    [MinLength(6)]
    [MaxLength(128)]
    public string Password { get; set; } = string.Empty;
}
