export type TransportMode = 'walk' | 'local' | 'train' | 'drive' | 'flight' | 'unknown'

type MoneyFormatter = (value: number) => string

interface MealOption {
  dish: string
  averageCost: number
}

interface MealEstimate {
  name: string
  cost: number
  pricingBasis: string
}

interface TrainFareProfile {
  label: string
  baseFare: number
  shortRate: number
  mediumRate: number
  longRate: number
  shortFloor: number
  mediumFloor: number
  longFloor: number
  extraLongFloor: number
}

export const fallbackCountryOptions = [
  'China',
  'France',
  'Japan',
  'United States',
  'United Kingdom',
  'Italy',
  'Spain',
  'Germany',
  'Canada',
  'Australia'
]

export const fallbackCitiesByCountry: Record<string, string[]> = {
  China: ['Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou'],
  France: ['Paris', 'Lyon', 'Marseille', 'Nice'],
  Japan: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'San Francisco'],
  'United Kingdom': ['London', 'Manchester', 'Liverpool', 'Edinburgh'],
  Italy: ['Rome', 'Milan', 'Venice', 'Florence'],
  Spain: ['Madrid', 'Barcelona', 'Valencia', 'Seville'],
  Germany: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'],
  Canada: ['Toronto', 'Montreal', 'Vancouver', 'Calgary'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth']
}

const cityCountryByName = Object.fromEntries(
  Object.entries(fallbackCitiesByCountry).flatMap(([country, cities]) =>
    cities.map((city) => [city.toLowerCase(), country] as const)
  )
)

const countryFuelPriceByLiter: Record<string, number> = {
  China: 1.1,
  France: 1.8,
  Japan: 1.15,
  'United States': 1.05,
  'United Kingdom': 1.75,
  Italy: 1.78,
  Spain: 1.62,
  Germany: 1.82,
  Canada: 1.22,
  Australia: 1.85
}

const countryTollRatePerKm: Record<string, number> = {
  France: 0.1,
  Italy: 0.09,
  Spain: 0.04,
  Germany: 0,
  'United Kingdom': 0.02,
  Japan: 0.16,
  Australia: 0.02,
  'United States': 0.03,
  Canada: 0.02,
  China: 0.07
}

const countryVehicleLitersPer100Km: Record<string, number> = {
  China: 7,
  France: 6.8,
  Japan: 6.1,
  'United States': 8.2,
  'United Kingdom': 6.9,
  Italy: 6.7,
  Spain: 6.6,
  Germany: 6.9,
  Canada: 7.8,
  Australia: 7.4
}

const countryLocalTransitBaseFare: Record<string, number> = {
  China: 2,
  France: 2.5,
  Japan: 2.2,
  'United States': 3,
  'United Kingdom': 3.2,
  Italy: 2.2,
  Spain: 2.1,
  Germany: 3,
  Canada: 3,
  Australia: 3.1
}

const cityHighlightsByName: Record<string, string[]> = {
  beijing: ['Forbidden City', 'Temple of Heaven', 'Summer Palace', 'Mutianyu Great Wall'],
  shanghai: ['The Bund', 'Yu Garden', 'Shanghai Tower', 'Nanjing Road'],
  shenzhen: ['Window of the World', 'OCT Loft', 'Dameisha Beach', 'Ping An Finance Centre'],
  guangzhou: ['Canton Tower', 'Shamian Island', 'Chen Clan Ancestral Hall', 'Yuexiu Park'],
  paris: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame Cathedral', 'Montmartre'],
  lyon: ['Basilica of Notre-Dame de Fourviere', 'Vieux Lyon', "Parc de la Tete d'Or", 'Place Bellecour'],
  marseille: ['Old Port', 'Notre-Dame de la Garde', 'Le Panier', 'Mucem'],
  nice: ['Promenade des Anglais', 'Castle Hill', 'Old Nice', 'Marc Chagall National Museum'],
  tokyo: ['Senso-ji Temple', 'Shibuya Crossing', 'Tokyo Skytree', 'Meiji Jingu'],
  osaka: ['Dotonbori', 'Osaka Castle', 'Shinsekai', 'Umeda Sky Building'],
  kyoto: ['Fushimi Inari Taisha', 'Kiyomizu-dera', 'Arashiyama Bamboo Grove', 'Kinkaku-ji'],
  yokohama: ['Minato Mirai', 'Sankeien Garden', 'Yokohama Chinatown', 'Cup Noodles Museum'],
  'new york': ['Statue of Liberty', 'Central Park', 'Times Square', 'Metropolitan Museum of Art'],
  'los angeles': ['Griffith Observatory', 'Santa Monica Pier', 'Getty Center', 'Hollywood Walk of Fame'],
  chicago: ['Millennium Park', 'Art Institute of Chicago', 'Navy Pier', 'Willis Tower Skydeck'],
  'san francisco': ['Golden Gate Bridge', 'Alcatraz Island', "Fisherman's Wharf", 'Palace of Fine Arts'],
  london: ['Buckingham Palace', 'Tower of London', 'British Museum', 'Westminster Abbey'],
  manchester: ['John Rylands Library', 'Science and Industry Museum', 'Northern Quarter', 'Old Trafford'],
  liverpool: ['Royal Albert Dock', 'The Beatles Story', 'Liverpool Cathedral', 'Walker Art Gallery'],
  edinburgh: ['Edinburgh Castle', 'Royal Mile', "Arthur's Seat", 'Palace of Holyroodhouse'],
  rome: ['Colosseum', 'Vatican Museums', 'Trevi Fountain', 'Pantheon'],
  milan: ['Duomo di Milano', 'Galleria Vittorio Emanuele II', 'Sforza Castle', 'Navigli'],
  venice: ["St Mark's Basilica", "Doge's Palace", 'Grand Canal', 'Rialto Bridge'],
  florence: ['Uffizi Gallery', 'Florence Cathedral', 'Ponte Vecchio', 'Piazzale Michelangelo'],
  madrid: ['Prado Museum', 'Royal Palace of Madrid', 'Plaza Mayor', 'Retiro Park'],
  barcelona: ['Sagrada Familia', 'Park Guell', 'Gothic Quarter', 'Casa Batllo'],
  valencia: ['City of Arts and Sciences', 'Valencia Cathedral', 'Central Market', 'Turia Gardens'],
  seville: ['Real Alcazar', 'Seville Cathedral', 'Plaza de Espana', 'Metropol Parasol'],
  berlin: ['Brandenburg Gate', 'Museum Island', 'Reichstag Building', 'East Side Gallery'],
  munich: ['Marienplatz', 'Nymphenburg Palace', 'English Garden', 'Deutsches Museum'],
  frankfurt: ['Romerberg', 'Stadel Museum', 'Palmengarten', 'Main Tower'],
  hamburg: ['Miniatur Wunderland', 'Elbphilharmonie', 'Speicherstadt', 'Port of Hamburg'],
  toronto: ['CN Tower', 'Royal Ontario Museum', 'Distillery District', 'St. Lawrence Market'],
  montreal: ['Old Montreal', 'Notre-Dame Basilica', 'Mount Royal', 'Jean-Talon Market'],
  vancouver: ['Stanley Park', 'Granville Island', 'Capilano Suspension Bridge', 'Gastown'],
  calgary: ['Calgary Tower', 'Heritage Park', "Prince's Island Park", 'Glenbow Museum'],
  sydney: ['Sydney Opera House', 'Harbour Bridge', 'The Rocks', 'Bondi Beach'],
  melbourne: ['Federation Square', 'Royal Botanic Gardens', 'Queen Victoria Market', 'Hosier Lane'],
  brisbane: ['South Bank Parklands', 'Lone Pine Koala Sanctuary', 'Story Bridge', 'City Botanic Gardens'],
  perth: ['Kings Park', 'Fremantle Markets', 'Cottesloe Beach', 'Elizabeth Quay']
}

const cityMealsByName: Record<string, MealOption[]> = {
  beijing: [{ dish: 'Jiaozi', averageCost: 10 }, { dish: 'Zhajiangmian', averageCost: 9 }],
  shanghai: [{ dish: 'Xiaolongbao', averageCost: 11 }, { dish: 'Shengjianbao', averageCost: 10 }],
  shenzhen: [{ dish: 'Dim sum', averageCost: 12 }, { dish: 'Seafood congee', averageCost: 10 }],
  guangzhou: [{ dish: 'Dim sum', averageCost: 11 }, { dish: 'Wonton noodles', averageCost: 9 }],
  paris: [{ dish: 'Croque-monsieur', averageCost: 14 }, { dish: 'French onion soup', averageCost: 13 }],
  lyon: [{ dish: 'Quenelles', averageCost: 16 }, { dish: 'Salade lyonnaise', averageCost: 14 }],
  marseille: [{ dish: 'Bouillabaisse', averageCost: 24 }, { dish: 'Panisse', averageCost: 10 }],
  nice: [{ dish: 'Socca', averageCost: 9 }, { dish: 'Salade nicoise', averageCost: 15 }],
  tokyo: [{ dish: 'Sushi', averageCost: 18 }, { dish: 'Ramen', averageCost: 11 }],
  osaka: [{ dish: 'Takoyaki', averageCost: 8 }, { dish: 'Okonomiyaki', averageCost: 11 }],
  kyoto: [{ dish: 'Kaiseki', averageCost: 30 }, { dish: 'Yudofu', averageCost: 14 }],
  yokohama: [{ dish: 'Shumai', averageCost: 9 }, { dish: 'Seafood donburi', averageCost: 15 }],
  'new york': [{ dish: 'Bagel with lox', averageCost: 14 }, { dish: 'Pastrami sandwich', averageCost: 17 }],
  'los angeles': [{ dish: 'Fish tacos', averageCost: 12 }, { dish: 'French dip sandwich', averageCost: 15 }],
  chicago: [{ dish: 'Deep-dish pizza', averageCost: 16 }, { dish: 'Italian beef', averageCost: 14 }],
  'san francisco': [{ dish: 'Clam chowder', averageCost: 14 }, { dish: 'Mission burrito', averageCost: 13 }],
  london: [{ dish: 'Fish and chips', averageCost: 16 }, { dish: 'Sunday roast', averageCost: 20 }],
  manchester: [{ dish: 'Pie and mash', averageCost: 12 }, { dish: 'Manchester tart', averageCost: 8 }],
  liverpool: [{ dish: 'Scouse', averageCost: 12 }, { dish: 'Butter pie', averageCost: 9 }],
  edinburgh: [{ dish: 'Haggis', averageCost: 15 }, { dish: 'Cullen skink', averageCost: 13 }],
  rome: [{ dish: 'Cacio e pepe', averageCost: 13 }, { dish: 'Carbonara', averageCost: 15 }],
  milan: [{ dish: 'Risotto alla Milanese', averageCost: 16 }, { dish: 'Cotoletta', averageCost: 19 }],
  venice: [{ dish: 'Cicchetti', averageCost: 12 }, { dish: 'Risotto al nero di seppia', averageCost: 18 }],
  florence: [{ dish: 'Bistecca alla Fiorentina', averageCost: 24 }, { dish: 'Lampredotto', averageCost: 10 }],
  madrid: [{ dish: 'Bocadillo de calamares', averageCost: 10 }, { dish: 'Cocido madrileno', averageCost: 14 }],
  barcelona: [{ dish: 'Pa amb tomaquet', averageCost: 8 }, { dish: 'Seafood paella', averageCost: 19 }],
  valencia: [{ dish: 'Paella Valenciana', averageCost: 17 }, { dish: 'Fideua', averageCost: 16 }],
  seville: [{ dish: 'Salmorejo', averageCost: 9 }, { dish: 'Espinacas con garbanzos', averageCost: 11 }],
  berlin: [{ dish: 'Currywurst', averageCost: 9 }, { dish: 'Schnitzel', averageCost: 16 }],
  munich: [{ dish: 'Weisswurst', averageCost: 11 }, { dish: 'Schweinshaxe', averageCost: 19 }],
  frankfurt: [{ dish: 'Frankfurter sausages', averageCost: 10 }, { dish: 'Handkase mit Musik', averageCost: 9 }],
  hamburg: [{ dish: 'Fischbrotchen', averageCost: 9 }, { dish: 'Labskaus', averageCost: 14 }],
  toronto: [{ dish: 'Peameal bacon sandwich', averageCost: 11 }, { dish: 'Poutine', averageCost: 10 }],
  montreal: [{ dish: 'Montreal bagel', averageCost: 8 }, { dish: 'Smoked meat sandwich', averageCost: 13 }],
  vancouver: [{ dish: 'Salmon bowl', averageCost: 15 }, { dish: 'Sushi combo', averageCost: 17 }],
  calgary: [{ dish: 'Alberta beef', averageCost: 19 }, { dish: 'Bison burger', averageCost: 15 }],
  sydney: [{ dish: 'Meat pie', averageCost: 9 }, { dish: 'Barramundi', averageCost: 17 }],
  melbourne: [{ dish: 'Chicken parmigiana', averageCost: 15 }, { dish: 'Dim sim', averageCost: 8 }],
  brisbane: [{ dish: 'Moreton Bay bug roll', averageCost: 17 }, { dish: 'Steak sandwich', averageCost: 14 }],
  perth: [{ dish: 'Fish and chips', averageCost: 12 }, { dish: 'Barramundi', averageCost: 17 }]
}

const countryMealsByName: Record<string, MealOption[]> = {
  China: [{ dish: 'Mapo tofu', averageCost: 9 }, { dish: 'Hot pot', averageCost: 16 }, { dish: 'Biangbiang noodles', averageCost: 10 }],
  France: [{ dish: 'Crepe complete', averageCost: 11 }, { dish: 'Boeuf bourguignon', averageCost: 19 }, { dish: 'Quiche Lorraine', averageCost: 10 }],
  Japan: [{ dish: 'Udon', averageCost: 9 }, { dish: 'Katsu curry', averageCost: 12 }, { dish: 'Tempura don', averageCost: 13 }],
  'United States': [{ dish: 'Cheeseburger', averageCost: 13 }, { dish: 'BBQ plate', averageCost: 18 }, { dish: 'Mac and cheese', averageCost: 10 }],
  'United Kingdom': [{ dish: 'Bangers and mash', averageCost: 14 }, { dish: 'Cornish pasty', averageCost: 8 }, { dish: "Shepherd's pie", averageCost: 14 }],
  Italy: [{ dish: 'Lasagna', averageCost: 14 }, { dish: 'Margherita pizza', averageCost: 11 }, { dish: 'Gnocchi', averageCost: 13 }],
  Spain: [{ dish: 'Tortilla espanola', averageCost: 8 }, { dish: 'Croquetas', averageCost: 10 }, { dish: 'Gazpacho', averageCost: 7 }],
  Germany: [{ dish: 'Bratwurst', averageCost: 9 }, { dish: 'Kasespatzle', averageCost: 12 }, { dish: 'Sauerbraten', averageCost: 17 }],
  Canada: [{ dish: 'Tourtiere', averageCost: 11 }, { dish: 'Poutine', averageCost: 10 }, { dish: 'BeaverTail', averageCost: 7 }],
  Australia: [{ dish: 'Chicken parmigiana', averageCost: 15 }, { dish: 'Sausage roll', averageCost: 7 }, { dish: 'Barramundi', averageCost: 17 }]
}

const countryMealCostMultiplier: Record<string, number> = {
  China: 0.85,
  France: 1.05,
  Japan: 0.95,
  'United States': 1.1,
  'United Kingdom': 1.08,
  Italy: 0.95,
  Spain: 0.9,
  Germany: 0.98,
  Canada: 1.03,
  Australia: 1.04
}

const cityMealCostMultiplier: Record<string, number> = {
  beijing: 0.92,
  shanghai: 0.78,
  shenzhen: 0.86,
  guangzhou: 0.82,
  paris: 1.12,
  lyon: 1.02,
  marseille: 1.01,
  nice: 1.08,
  tokyo: 1.05,
  osaka: 0.94,
  kyoto: 1.04,
  yokohama: 0.96,
  'new york': 1.2,
  'los angeles': 1.15,
  chicago: 1.08,
  'san francisco': 1.18,
  london: 1.18,
  manchester: 1.0,
  liverpool: 0.96,
  edinburgh: 1.04,
  rome: 1.0,
  milan: 1.08,
  venice: 1.12,
  florence: 1.04,
  madrid: 0.96,
  barcelona: 1.02,
  valencia: 0.92,
  seville: 0.9,
  berlin: 1.0,
  munich: 1.05,
  frankfurt: 1.02,
  hamburg: 1.0,
  toronto: 1.08,
  montreal: 0.98,
  vancouver: 1.1,
  calgary: 1.01,
  sydney: 1.12,
  melbourne: 1.08,
  brisbane: 1.0,
  perth: 1.02
}

const attractionPriceByName: Record<string, number> = {
  'Forbidden City': 8,
  'Temple of Heaven': 5,
  'Summer Palace': 7,
  'Mutianyu Great Wall': 12,
  'The Bund': 0,
  'Yu Garden': 6,
  'Shanghai Tower': 24,
  'Nanjing Road': 0,
  'Window of the World': 28,
  'OCT Loft': 0,
  'Dameisha Beach': 0,
  'Ping An Finance Centre': 20,
  'Canton Tower': 20,
  'Shamian Island': 0,
  'Chen Clan Ancestral Hall': 2,
  'Yuexiu Park': 0,
  'Eiffel Tower': 29,
  'Louvre Museum': 22,
  'Notre-Dame Cathedral': 0,
  Montmartre: 0,
  'Basilica of Notre-Dame de Fourviere': 0,
  'Vieux Lyon': 0,
  "Parc de la Tete d'Or": 0,
  'Place Bellecour': 0,
  'Old Port': 0,
  'Notre-Dame de la Garde': 0,
  'Le Panier': 0,
  Mucem: 11,
  'Promenade des Anglais': 0,
  'Castle Hill': 0,
  'Old Nice': 0,
  'Marc Chagall National Museum': 10,
  'Senso-ji Temple': 0,
  'Shibuya Crossing': 0,
  'Tokyo Skytree': 14,
  'Meiji Jingu': 0,
  Dotonbori: 0,
  'Osaka Castle': 4,
  Shinsekai: 0,
  'Umeda Sky Building': 10,
  'Fushimi Inari Taisha': 0,
  'Kiyomizu-dera': 3,
  'Arashiyama Bamboo Grove': 0,
  'Kinkaku-ji': 3,
  'Minato Mirai': 0,
  'Sankeien Garden': 6,
  'Yokohama Chinatown': 0,
  'Cup Noodles Museum': 3,
  'Statue of Liberty': 24,
  'Central Park': 0,
  'Times Square': 0,
  'Metropolitan Museum of Art': 30,
  'Griffith Observatory': 0,
  'Santa Monica Pier': 0,
  'Getty Center': 0,
  'Hollywood Walk of Fame': 0,
  'Millennium Park': 0,
  'Art Institute of Chicago': 32,
  'Navy Pier': 0,
  'Willis Tower Skydeck': 32,
  'Golden Gate Bridge': 0,
  'Alcatraz Island': 45,
  "Fisherman's Wharf": 0,
  'Palace of Fine Arts': 0,
  'Buckingham Palace': 0,
  'Tower of London': 41,
  'British Museum': 0,
  'Westminster Abbey': 34,
  'John Rylands Library': 0,
  'Science and Industry Museum': 0,
  'Northern Quarter': 0,
  'Old Trafford': 35,
  'Royal Albert Dock': 0,
  'The Beatles Story': 22,
  'Liverpool Cathedral': 0,
  'Walker Art Gallery': 0,
  'Edinburgh Castle': 24,
  'Royal Mile': 0,
  "Arthur's Seat": 0,
  'Palace of Holyroodhouse': 25,
  Colosseum: 18,
  'Vatican Museums': 25,
  'Trevi Fountain': 0,
  Pantheon: 5,
  'Duomo di Milano': 10,
  'Galleria Vittorio Emanuele II': 0,
  'Sforza Castle': 5,
  Navigli: 0,
  "St Mark's Basilica": 0,
  "Doge's Palace": 30,
  'Grand Canal': 0,
  'Rialto Bridge': 0,
  'Uffizi Gallery': 25,
  'Florence Cathedral': 0,
  'Ponte Vecchio': 0,
  'Piazzale Michelangelo': 0,
  'Prado Museum': 15,
  'Royal Palace of Madrid': 14,
  'Plaza Mayor': 0,
  'Retiro Park': 0,
  'Sagrada Familia': 26,
  'Park Guell': 18,
  'Gothic Quarter': 0,
  'Casa Batllo': 35,
  'City of Arts and Sciences': 26,
  'Valencia Cathedral': 10,
  'Central Market': 0,
  'Turia Gardens': 0,
  'Real Alcazar': 15,
  'Seville Cathedral': 12,
  'Plaza de Espana': 0,
  'Metropol Parasol': 15,
  'Brandenburg Gate': 0,
  'Museum Island': 24,
  'Reichstag Building': 0,
  'East Side Gallery': 0,
  Marienplatz: 0,
  'Nymphenburg Palace': 18,
  'English Garden': 0,
  'Deutsches Museum': 15,
  Romerberg: 0,
  'Stadel Museum': 18,
  Palmengarten: 9,
  'Main Tower': 12,
  'Miniatur Wunderland': 25,
  Elbphilharmonie: 0,
  Speicherstadt: 0,
  'Port of Hamburg': 0,
  'CN Tower': 33,
  'Royal Ontario Museum': 18,
  'Distillery District': 0,
  'St. Lawrence Market': 0,
  'Old Montreal': 0,
  'Notre-Dame Basilica': 12,
  'Mount Royal': 0,
  'Jean-Talon Market': 0,
  'Stanley Park': 0,
  'Granville Island': 0,
  'Capilano Suspension Bridge': 50,
  Gastown: 0,
  'Calgary Tower': 15,
  'Heritage Park': 20,
  "Prince's Island Park": 0,
  'Glenbow Museum': 14,
  'Sydney Opera House': 28,
  'Harbour Bridge': 0,
  'The Rocks': 0,
  'Bondi Beach': 0,
  'Federation Square': 0,
  'Royal Botanic Gardens': 0,
  'Queen Victoria Market': 0,
  'Hosier Lane': 0,
  'South Bank Parklands': 0,
  'Lone Pine Koala Sanctuary': 31,
  'Story Bridge': 0,
  'City Botanic Gardens': 0,
  'Kings Park': 0,
  'Fremantle Markets': 0,
  'Cottesloe Beach': 0,
  'Elizabeth Quay': 0
}

export function inferCountryForCity(city: string, fallbackCountry = 'France') {
  return cityCountryByName[city.trim().toLowerCase()] ?? fallbackCountry
}

export function isTouristHub(cityName: string) {
  return Object.values(fallbackCitiesByCountry).some((cities) => cities.slice(0, 2).includes(cityName))
}

function getSeasonMultiplier(isoDate?: string) {
  if (!isoDate) return 1

  const date = new Date(`${isoDate}T12:00:00`)
  const month = date.getMonth() + 1

  if ([6, 7, 8, 12].includes(month)) return 1.18
  if ([4, 5, 9, 10].includes(month)) return 1.06
  return 0.94
}

function getSelectedVisitHighlights(city: string, visitIndex: number) {
  const highlights = cityHighlightsByName[city.trim().toLowerCase()]
  if (!highlights?.length) return []

  const chunkSize = Math.min(3, highlights.length)
  const startIndex = (visitIndex * chunkSize) % highlights.length
  return Array.from({ length: chunkSize }, (_, offset) => highlights[(startIndex + offset) % highlights.length])
}

export function getGeneratedVisitName(city: string, visitIndex: number) {
  const selected = getSelectedVisitHighlights(city, visitIndex)
  return selected.length === 0 ? `${city} highlights` : selected.join(', ')
}

export function getGeneratedVisitCost(city: string, visitIndex: number, travelDate?: string) {
  const selected = getSelectedVisitHighlights(city, visitIndex)
  const seasonMultiplier = getSeasonMultiplier(travelDate)

  if (selected.length === 0) {
    return Math.round(18 * seasonMultiplier * 100) / 100
  }

  const knownPrices = selected
    .map((highlight) => attractionPriceByName[highlight])
    .filter((price): price is number => typeof price === 'number')

  if (knownPrices.length === 0) {
    return Math.round(18 * seasonMultiplier * 100) / 100
  }

  const averagePrice = knownPrices.reduce((sum, price) => sum + price, 0) / knownPrices.length
  return Math.round(averagePrice * seasonMultiplier * 100) / 100
}

export function getGeneratedVisitCostDetails(
  city: string,
  visitIndex: number,
  travelDate: string | undefined,
  formatMoney: MoneyFormatter
) {
  const selected = getSelectedVisitHighlights(city, visitIndex)
  const seasonMultiplier = getSeasonMultiplier(travelDate)

  if (selected.length === 0) {
    return `Estimated price. Average ticket cost in ${city}`
  }

  const priced = selected
    .map((highlight) => {
      const price = attractionPriceByName[highlight]
      return typeof price === 'number' ? `${highlight}: ${formatMoney(price)}` : null
    })
    .filter((value): value is string => Boolean(value))

  if (priced.length === 0) {
    return `Estimated price. Average ticket cost in ${city}`
  }

  const seasonLabel = seasonMultiplier > 1.1 ? 'high season adjusted' : seasonMultiplier < 1 ? 'low season adjusted' : 'standard season'
  return `Estimated price. ${priced.join(' | ')} (${seasonLabel})`
}

function getMealOptionsForCity(city: string, fallbackCountry?: string) {
  const normalizedCity = city.trim().toLowerCase()
  const cityOptions = cityMealsByName[normalizedCity] ?? []
  const countryOptions = countryMealsByName[inferCountryForCity(city, fallbackCountry)] ?? []
  const seen = new Set<string>()

  return [...cityOptions, ...countryOptions].filter((mealOption) => {
    const key = mealOption.dish.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function getMealEstimate(city: string, mealIndex: number, fallbackCountry?: string): MealEstimate {
  const mealOptions = getMealOptionsForCity(city, fallbackCountry)
  const country = inferCountryForCity(city, fallbackCountry)
  const normalizedCity = city.trim().toLowerCase()

  if (!mealOptions.length) {
    const countryMultiplier = countryMealCostMultiplier[country] ?? 1
    const cityMultiplier = cityMealCostMultiplier[normalizedCity] ?? countryMultiplier

    return {
      name: city,
      cost: Math.round(20 * cityMultiplier * 100) / 100,
      pricingBasis:
        cityMealCostMultiplier[normalizedCity] !== undefined
          ? `${city} sample-city meal profile`
          : `${country} country meal profile`
    }
  }

  const mealPlan = mealOptions[mealIndex % mealOptions.length]
  const countryMultiplier = countryMealCostMultiplier[country] ?? 1
  const cityMultiplier = cityMealCostMultiplier[normalizedCity] ?? countryMultiplier
  const adjustedCost = Math.max(4, Math.round(mealPlan.averageCost * cityMultiplier * 100) / 100)

  return {
    name: mealPlan.dish,
    cost: adjustedCost,
    pricingBasis:
      cityMealCostMultiplier[normalizedCity] !== undefined
        ? `${city} sample-city meal profile`
        : `${country} country meal profile`
  }
}

export function getGeneratedMealPlan(city: string, mealIndex: number, fallbackCountry?: string) {
  const estimate = getMealEstimate(city, mealIndex, fallbackCountry)
  return {
    name: estimate.name,
    cost: estimate.cost
  }
}

export function getGeneratedMealCostDetails(city: string, mealIndex: number, fallbackCountry?: string) {
  const estimate = getMealEstimate(city, mealIndex, fallbackCountry)
  return `Estimated price. Average price for 1 person: ${estimate.name} (${estimate.pricingBasis})`
}

function resolveTrainFareProfile(country: string, trainLabel?: string | null): TrainFareProfile {
  const normalizedLabel = (trainLabel ?? '').toLowerCase()

  if (country === 'France') {
    if (normalizedLabel.includes('tgv') || normalizedLabel.includes('inoui') || normalizedLabel.includes('ouigo')) {
      return { label: 'France high-speed rail (sample-fare calibrated)', baseFare: 12, shortRate: 0.12, mediumRate: 0.14, longRate: 0.16, shortFloor: 16, mediumFloor: 22, longFloor: 34, extraLongFloor: 48 }
    }
    return { label: 'France TER regional rail (sample-fare calibrated)', baseFare: 8, shortRate: 0.08, mediumRate: 0.1, longRate: 0.12, shortFloor: 9, mediumFloor: 16, longFloor: 26, extraLongFloor: 36 }
  }

  if (country === 'Germany') {
    if (normalizedLabel.includes('ice') || normalizedLabel.includes('ic') || normalizedLabel.includes('ec')) {
      return { label: 'Germany long-distance rail (sample-fare calibrated)', baseFare: 10, shortRate: 0.1, mediumRate: 0.12, longRate: 0.14, shortFloor: 14, mediumFloor: 22, longFloor: 34, extraLongFloor: 48 }
    }
    return { label: 'Germany regional rail (sample-fare calibrated)', baseFare: 7, shortRate: 0.08, mediumRate: 0.1, longRate: 0.12, shortFloor: 8, mediumFloor: 14, longFloor: 22, extraLongFloor: 30 }
  }

  if (country === 'Spain') {
    if (normalizedLabel.includes('ave') || normalizedLabel.includes('avlo') || normalizedLabel.includes('iryo') || normalizedLabel.includes('ouigo')) {
      return { label: 'Spain high-speed rail (sample-fare calibrated)', baseFare: 9, shortRate: 0.09, mediumRate: 0.11, longRate: 0.13, shortFloor: 12, mediumFloor: 20, longFloor: 30, extraLongFloor: 42 }
    }
    return { label: 'Spain regional rail (sample-fare calibrated)', baseFare: 6, shortRate: 0.07, mediumRate: 0.08, longRate: 0.1, shortFloor: 7, mediumFloor: 12, longFloor: 20, extraLongFloor: 28 }
  }

  if (country === 'Italy') {
    if (normalizedLabel.includes('freccia') || normalizedLabel.includes('italo')) {
      return { label: 'Italy high-speed rail (sample-fare calibrated)', baseFare: 10, shortRate: 0.1, mediumRate: 0.12, longRate: 0.14, shortFloor: 12, mediumFloor: 20, longFloor: 30, extraLongFloor: 42 }
    }
    return { label: 'Italy regional rail (sample-fare calibrated)', baseFare: 6, shortRate: 0.07, mediumRate: 0.09, longRate: 0.11, shortFloor: 7, mediumFloor: 13, longFloor: 20, extraLongFloor: 28 }
  }

  if (country === 'United Kingdom') {
    return { label: 'United Kingdom rail (sample-fare calibrated)', baseFare: 16, shortRate: 0.13, mediumRate: 0.16, longRate: 0.18, shortFloor: 18, mediumFloor: 28, longFloor: 40, extraLongFloor: 56 }
  }

  if (country === 'Japan') {
    if (normalizedLabel.includes('shinkansen') || normalizedLabel.includes('nozomi') || normalizedLabel.includes('hikari') || normalizedLabel.includes('kodama')) {
      return { label: 'Japan Shinkansen ordinary class (sample-fare calibrated)', baseFare: 8, shortRate: 0.09, mediumRate: 0.11, longRate: 0.13, shortFloor: 10, mediumFloor: 18, longFloor: 30, extraLongFloor: 44 }
    }
    return { label: 'Japan limited express / regional rail (sample-fare calibrated)', baseFare: 5, shortRate: 0.06, mediumRate: 0.08, longRate: 0.1, shortFloor: 6, mediumFloor: 12, longFloor: 20, extraLongFloor: 30 }
  }

  if (country === 'China') {
    return { label: 'China high-speed rail second class (sample-fare calibrated)', baseFare: 2.5, shortRate: 0.03, mediumRate: 0.05, longRate: 0.06, shortFloor: 5.5, mediumFloor: 9.5, longFloor: 24, extraLongFloor: 46 }
  }

  if (country === 'United States') {
    return { label: 'United States intercity rail (sample-fare calibrated)', baseFare: 12, shortRate: 0.1, mediumRate: 0.12, longRate: 0.15, shortFloor: 14, mediumFloor: 24, longFloor: 38, extraLongFloor: 56 }
  }

  if (country === 'Canada') {
    return { label: 'Canada intercity rail (sample-fare calibrated)', baseFare: 11, shortRate: 0.1, mediumRate: 0.12, longRate: 0.15, shortFloor: 13, mediumFloor: 22, longFloor: 36, extraLongFloor: 52 }
  }

  if (country === 'Australia') {
    return { label: 'Australia intercity rail (sample-fare calibrated)', baseFare: 10, shortRate: 0.09, mediumRate: 0.11, longRate: 0.14, shortFloor: 12, mediumFloor: 20, longFloor: 32, extraLongFloor: 48 }
  }

  return { label: `${country} rail estimate`, baseFare: 14, shortRate: 0.16, mediumRate: 0.2, longRate: 0.24, shortFloor: 14, mediumFloor: 24, longFloor: 36, extraLongFloor: 48 }
}

export function estimateTransportCost(
  mode: TransportMode,
  distance: number | null,
  fromCity: string,
  fallbackCountry: string | undefined,
  travelDate?: string,
  trainLabel?: string | null
) {
  if (mode === 'walk') return 0

  const normalizedDistance = Math.max(0, distance ?? 80)
  const country = inferCountryForCity(fromCity, fallbackCountry)
  const seasonMultiplier = getSeasonMultiplier(travelDate)
  const fuelPrice = countryFuelPriceByLiter[country] ?? 1.7
  const tollRate = countryTollRatePerKm[country] ?? 0.03
  const litersPer100Km = countryVehicleLitersPer100Km[country] ?? 7.2
  const localTransitBaseFare = countryLocalTransitBaseFare[country] ?? 2.5
  const roundPrice = (value: number) => Math.max(0, Math.round(value * 100) / 100)

  if (mode === 'local') {
    return roundPrice(Math.max(localTransitBaseFare, localTransitBaseFare + normalizedDistance * 0.045))
  }

  if (mode === 'train') {
    const profile = resolveTrainFareProfile(country, trainLabel)
    const distanceRate =
      normalizedDistance <= 80
        ? profile.shortRate
        : normalizedDistance <= 180
          ? profile.mediumRate
          : profile.longRate
    const rawFare = (profile.baseFare + normalizedDistance * distanceRate) * seasonMultiplier
    const routeFloor =
      normalizedDistance <= 60
        ? profile.shortFloor
        : normalizedDistance <= 120
          ? profile.mediumFloor
          : normalizedDistance <= 220
            ? profile.longFloor
            : profile.extraLongFloor
    return roundPrice(Math.max(rawFare, routeFloor * seasonMultiplier))
  }

  if (mode === 'drive') {
    const fuelCost = (normalizedDistance / 100) * litersPer100Km * fuelPrice
    const tollCost = normalizedDistance > 80 ? normalizedDistance * tollRate : 0
    return roundPrice((fuelCost + tollCost + 4.5) * seasonMultiplier)
  }

  if (mode === 'flight') {
    return roundPrice((40 + normalizedDistance * 0.09) * (seasonMultiplier + 0.12))
  }

  return roundPrice((6 + normalizedDistance * 0.08) * seasonMultiplier)
}

export function getEstimatedTransportCostDetails(
  mode: TransportMode,
  distance: number | null,
  fromCity: string,
  fallbackCountry: string | undefined,
  formatMoney: MoneyFormatter,
  travelDate?: string,
  trainLabel?: string | null
) {
  const normalizedDistance = Math.max(0, distance ?? 80)
  const country = inferCountryForCity(fromCity, fallbackCountry)
  const seasonMultiplier = getSeasonMultiplier(travelDate)
  const fuelPrice = countryFuelPriceByLiter[country] ?? 1.7
  const tollRate = countryTollRatePerKm[country] ?? 0.03
  const litersPer100Km = countryVehicleLitersPer100Km[country] ?? 7.2
  const seasonLabel = seasonMultiplier > 1.1 ? 'high season' : seasonMultiplier < 1 ? 'low season' : 'standard season'

  if (mode === 'walk') return 'No transport cost'
  if (mode === 'local') {
    return `Estimated price. Local fare based on ${Math.round(normalizedDistance)} km and ${country} base transit fare assumptions`
  }
  if (mode === 'train') {
    const profile = resolveTrainFareProfile(country, trainLabel)
    return `Estimated price. ${profile.label} fare based on ${Math.round(normalizedDistance)} km, ${seasonLabel}, operator/region profile, and route-length fare floors`
  }
  if (mode === 'drive') {
    return `Estimated price. Driving cost: fuel ${formatMoney(fuelPrice)}/L, ${litersPer100Km.toFixed(1)}L/100km, toll ${formatMoney(tollRate)}/km, distance ${Math.round(normalizedDistance)} km`
  }
  if (mode === 'flight') return `Estimated price. Flight fare based on ${Math.round(normalizedDistance)} km in ${seasonLabel}`
  return `Estimated price. Travel cost based on ${Math.round(normalizedDistance)} km`
}
