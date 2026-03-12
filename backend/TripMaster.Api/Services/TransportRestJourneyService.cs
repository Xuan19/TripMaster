using System.Text.Json;
using Microsoft.Extensions.Options;
using TripMaster.Api.Configuration;
using TripMaster.Api.Dtos;

namespace TripMaster.Api.Services;

public sealed class TransportRestJourneyService
{
    private static readonly string[] TrainProducts =
    {
        "nationalexpress",
        "national",
        "regionalexpress",
        "regional",
        "suburban"
    };

    private readonly HttpClient _httpClient;

    public TransportRestJourneyService(
        HttpClient httpClient,
        IOptions<TransportRestOptions> options)
    {
        _httpClient = httpClient;
        var configuredBaseUrl = options.Value.BaseUrl.TrimEnd('/');
        _httpClient.BaseAddress = new Uri($"{configuredBaseUrl}/");
    }

    public async Task<TrainJourneyResponse?> GetTrainJourneyAsync(
        TrainJourneyRequest request,
        CancellationToken cancellationToken)
    {
        var fromId = await ResolveLocationIdAsync(request.From, cancellationToken);
        var toId = await ResolveLocationIdAsync(request.To, cancellationToken);

        if (string.IsNullOrWhiteSpace(fromId) || string.IsNullOrWhiteSpace(toId))
        {
            return null;
        }

        var departureIso = Uri.EscapeDataString(request.DepartureDateTime.ToString("O"));
        var response = await _httpClient.GetAsync(
            $"journeys?from={Uri.EscapeDataString(fromId)}&to={Uri.EscapeDataString(toId)}&departure={departureIso}&results=4&stopovers=false&remarks=false&tickets=true&language=en",
            cancellationToken);

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new TransportRestApiException((int)response.StatusCode, responseBody);
        }

        using var document = JsonDocument.Parse(responseBody);
        if (!document.RootElement.TryGetProperty("journeys", out var journeysElement) ||
            journeysElement.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var journeyElement in journeysElement.EnumerateArray())
        {
            if (!journeyElement.TryGetProperty("legs", out var legsElement) ||
                legsElement.ValueKind != JsonValueKind.Array)
            {
                continue;
            }

            var sections = new List<string>();
            JsonElement? chosenLeg = null;

            foreach (var legElement in legsElement.EnumerateArray())
            {
                var sectionLabel = BuildSectionLabel(legElement);
                if (!string.IsNullOrWhiteSpace(sectionLabel))
                {
                    sections.Add(sectionLabel);
                }

                if (chosenLeg is null && IsTrainLeg(legElement))
                {
                    chosenLeg = legElement;
                }
            }

            if (chosenLeg is null)
            {
                continue;
            }

            var leg = chosenLeg.Value;
            var ticketPrice = ReadTicketPrice(journeyElement, out var ticketCurrency);
            return new TrainJourneyResponse
            {
                TrainReference = GetLineName(leg),
                TrainLabel = GetLineLabel(leg),
                DepartureDateTime = ReadDateTimeOffset(leg, "departure"),
                ArrivalDateTime = ReadDateTimeOffset(leg, "arrival"),
                DurationSeconds = GetDurationSeconds(journeyElement, leg),
                TicketPrice = ticketPrice,
                TicketCurrency = ticketCurrency,
                Sections = sections.Count > 0 ? sections : Array.Empty<string>()
            };
        }

        return null;
    }

    private async Task<string?> ResolveLocationIdAsync(string query, CancellationToken cancellationToken)
    {
        var response = await _httpClient.GetAsync(
            $"locations?query={Uri.EscapeDataString(query)}&results=6&addresses=false&poi=false&language=en",
            cancellationToken);

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            throw new TransportRestApiException((int)response.StatusCode, responseBody);
        }

        using var document = JsonDocument.Parse(responseBody);
        if (document.RootElement.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        JsonElement? bestMatch = null;

        foreach (var candidate in document.RootElement.EnumerateArray())
        {
            if (!candidate.TryGetProperty("id", out var idElement) ||
                idElement.ValueKind != JsonValueKind.String)
            {
                continue;
            }

            var type = ReadString(candidate, "type");
            if (!string.Equals(type, "station", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(type, "stop", StringComparison.OrdinalIgnoreCase))
            {
                if (bestMatch is not null)
                {
                    continue;
                }
            }

            bestMatch = candidate;
            if (string.Equals(type, "station", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(type, "stop", StringComparison.OrdinalIgnoreCase))
            {
                break;
            }
        }

        return bestMatch is { } match && match.TryGetProperty("id", out var bestId)
            ? bestId.GetString()
            : null;
    }

    private static bool IsTrainLeg(JsonElement legElement)
    {
        var walking = ReadBoolean(legElement, "walking");
        if (walking == true)
        {
            return false;
        }

        if (!legElement.TryGetProperty("line", out var lineElement) ||
            lineElement.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        var mode = ReadString(lineElement, "mode");
        if (string.Equals(mode, "train", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var product = ReadString(lineElement, "product");
        return !string.IsNullOrWhiteSpace(product) &&
               TrainProducts.Contains(product, StringComparer.OrdinalIgnoreCase);
    }

    private static string BuildSectionLabel(JsonElement legElement)
    {
        var originName = ReadNestedString(legElement, "origin", "name");
        var destinationName = ReadNestedString(legElement, "destination", "name");
        var lineLabel = GetLineLabel(legElement);

        if (!string.IsNullOrWhiteSpace(lineLabel) &&
            !string.IsNullOrWhiteSpace(originName) &&
            !string.IsNullOrWhiteSpace(destinationName))
        {
            return $"{lineLabel}: {originName} -> {destinationName}";
        }

        if (!string.IsNullOrWhiteSpace(originName) && !string.IsNullOrWhiteSpace(destinationName))
        {
            return $"{originName} -> {destinationName}";
        }

        return lineLabel ?? string.Empty;
    }

    private static string? GetLineName(JsonElement legElement)
    {
        return legElement.TryGetProperty("line", out var lineElement)
            ? ReadString(lineElement, "name")
            : null;
    }

    private static string? GetLineLabel(JsonElement legElement)
    {
        if (!legElement.TryGetProperty("line", out var lineElement) ||
            lineElement.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var productName = ReadString(lineElement, "productName");
        var lineName = ReadString(lineElement, "name");

        if (!string.IsNullOrWhiteSpace(productName) && !string.IsNullOrWhiteSpace(lineName))
        {
            return $"{productName} {lineName}";
        }

        return productName ?? lineName;
    }

    private static int? GetDurationSeconds(JsonElement journeyElement, JsonElement legElement)
    {
        if (journeyElement.TryGetProperty("duration", out var durationElement) &&
            durationElement.TryGetInt32(out var journeyDuration))
        {
            return journeyDuration;
        }

        var departure = ReadDateTimeOffset(legElement, "departure");
        var arrival = ReadDateTimeOffset(legElement, "arrival");

        return departure.HasValue && arrival.HasValue
            ? (int)Math.Max(0, (arrival.Value - departure.Value).TotalSeconds)
            : null;
    }

    private static decimal? ReadTicketPrice(JsonElement journeyElement, out string? currency)
    {
        currency = null;

        if (journeyElement.TryGetProperty("price", out var priceElement) &&
            TryReadPrice(priceElement, out var directPrice, out currency))
        {
            return directPrice;
        }

        if (!journeyElement.TryGetProperty("tickets", out var ticketsElement) ||
            ticketsElement.ValueKind != JsonValueKind.Array)
        {
            return null;
        }

        foreach (var ticketElement in ticketsElement.EnumerateArray())
        {
            if (ticketElement.TryGetProperty("price", out var nestedPriceElement) &&
                TryReadPrice(nestedPriceElement, out var nestedPrice, out currency))
            {
                return nestedPrice;
            }

            if (TryReadPrice(ticketElement, out var ticketPrice, out currency))
            {
                return ticketPrice;
            }
        }

        return null;
    }

    private static bool TryReadPrice(JsonElement element, out decimal price, out string? currency)
    {
        price = 0;
        currency = null;

        if (element.ValueKind == JsonValueKind.Number && element.TryGetDecimal(out var numericPrice))
        {
            price = numericPrice;
            return true;
        }

        if (element.ValueKind != JsonValueKind.Object)
        {
            return false;
        }

        currency = ReadString(element, "currency");

        if (element.TryGetProperty("amount", out var amountElement))
        {
            if (amountElement.ValueKind == JsonValueKind.Number && amountElement.TryGetDecimal(out var amountPrice))
            {
                price = amountPrice;
                return true;
            }

            if (amountElement.ValueKind == JsonValueKind.String &&
                decimal.TryParse(amountElement.GetString(), out var parsedAmountPrice))
            {
                price = parsedAmountPrice;
                return true;
            }
        }

        if (element.TryGetProperty("cents", out var centsElement) && centsElement.TryGetInt32(out var cents))
        {
            price = cents / 100m;
            return true;
        }

        if (element.TryGetProperty("price", out var nestedPriceElement))
        {
            return TryReadPrice(nestedPriceElement, out price, out currency);
        }

        return false;
    }

    private static DateTimeOffset? ReadDateTimeOffset(JsonElement element, string propertyName)
    {
        var value = ReadString(element, propertyName);
        return DateTimeOffset.TryParse(value, out var parsedValue) ? parsedValue : null;
    }

    private static bool? ReadBoolean(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var property) &&
               (property.ValueKind == JsonValueKind.True || property.ValueKind == JsonValueKind.False)
            ? property.GetBoolean()
            : null;
    }

    private static string? ReadNestedString(JsonElement element, string parentName, string propertyName)
    {
        return element.TryGetProperty(parentName, out var parentElement) &&
               parentElement.ValueKind == JsonValueKind.Object
            ? ReadString(parentElement, propertyName)
            : null;
    }

    private static string? ReadString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var property) &&
               property.ValueKind == JsonValueKind.String
            ? property.GetString()
            : null;
    }
}
