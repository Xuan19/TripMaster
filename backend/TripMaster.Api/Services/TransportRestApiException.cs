namespace TripMaster.Api.Services;

public sealed class TransportRestApiException : Exception
{
    public TransportRestApiException(int statusCode, string responseBody)
        : base($"transport.rest request failed with status code {statusCode}.")
    {
        StatusCode = statusCode;
        ResponseBody = responseBody;
    }

    public int StatusCode { get; }

    public string ResponseBody { get; }
}
