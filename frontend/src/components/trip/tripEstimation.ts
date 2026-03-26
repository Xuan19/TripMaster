import type { Currency } from '../../locales/i18n'
import { convertAmount } from '../../utils/currency'

export type TransportMode = 'walk' | 'local' | 'train' | 'drive' | 'flight' | 'unknown'

type MoneyFormatter = (value: number) => string

interface OccupancyInputs {
  adults?: number | null
  children?: number | null
  rooms?: number | null
}

interface MealOption {
  dish: string
  averageCost: number
}

interface MealEstimate {
  name: string
  cost: number
  pricingBasis: string
}

interface HotelEstimate {
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

interface VisitSiteMetadata {
  durationMinutes?: number
  areaGroup?: string
}

interface VisitTransferInfo {
  mode: 'walk' | 'local' | 'drive'
  durationMinutes: number
}

interface EnRouteStopSuggestion {
  city: string
  site: string
  durationMinutes: number
  estimatedCost: number
  pricingBasis: string
}

export const fallbackCountryOptions = [
  'Switzerland',
  'China',
  'France',
  'Japan',
  'United States',
  'United Kingdom',
  'Italy',
  'Spain',
  'Germany',
  'Netherlands',
  'Belgium',
  'Austria',
  'Portugal',
  'Ireland',
  'Czechia',
  'Greece',
  'Turkey',
  'Canada',
  'Australia',
  'South Korea',
  'Thailand',
  'Singapore',
  'United Arab Emirates',
  'Mexico',
  'Brazil'
]

function normalizeOccupancy(occupancy?: OccupancyInputs) {
  const adults = Math.max(1, Math.floor(occupancy?.adults ?? 1))
  const children = Math.max(0, Math.floor(occupancy?.children ?? 0))
  const rooms = Math.max(1, Math.floor(occupancy?.rooms ?? 1))
  return { adults, children, rooms }
}

function getMealPartyUnits(occupancy?: OccupancyInputs) {
  const { adults, children } = normalizeOccupancy(occupancy)
  return adults + children * 0.65
}

function getVisitPartyUnits(occupancy?: OccupancyInputs) {
  const { adults, children } = normalizeOccupancy(occupancy)
  return adults + children * 0.5
}

function getPassengerUnits(occupancy?: OccupancyInputs) {
  const { adults, children } = normalizeOccupancy(occupancy)
  return adults + children * 0.75
}

export const fallbackCitiesByCountry: Record<string, string[]> = {
  Switzerland: ['Zurich', 'Geneva', 'Lucerne', 'Interlaken', 'Bern', 'Lausanne'],
  China: ['Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou'],
  France: ['Paris', 'Lyon', 'Marseille', 'Nice'],
  Japan: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama'],
  'United States': ['New York', 'Los Angeles', 'Chicago', 'San Francisco'],
  'United Kingdom': ['London', 'Manchester', 'Liverpool', 'Edinburgh'],
  Italy: ['Rome', 'Milan', 'Venice', 'Florence'],
  Spain: ['Madrid', 'Barcelona', 'Valencia', 'Seville'],
  Germany: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'],
  Netherlands: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'],
  Belgium: ['Brussels', 'Bruges', 'Ghent', 'Antwerp'],
  Austria: ['Vienna', 'Salzburg', 'Innsbruck', 'Graz'],
  Portugal: ['Lisbon', 'Porto', 'Sintra', 'Faro'],
  Ireland: ['Dublin', 'Galway', 'Cork', 'Killarney'],
  Czechia: ['Prague', 'Brno', 'Cesky Krumlov', 'Karlovy Vary'],
  Greece: ['Athens', 'Thessaloniki', 'Santorini', 'Heraklion'],
  Turkey: ['Istanbul', 'Ankara', 'Izmir', 'Antalya'],
  Canada: ['Toronto', 'Montreal', 'Vancouver', 'Calgary'],
  Australia: ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
  'South Korea': ['Seoul', 'Busan', 'Incheon', 'Jeju City'],
  Thailand: ['Bangkok', 'Chiang Mai', 'Phuket', 'Krabi'],
  Singapore: ['Singapore'],
  'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah'],
  Mexico: ['Mexico City', 'Guadalajara', 'Merida', 'Cancun'],
  Brazil: ['Rio de Janeiro', 'Sao Paulo', 'Salvador', 'Florianopolis']
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

const countryHotelNightlyBaseRate: Record<string, number> = {
  China: 72,
  France: 138,
  Japan: 122,
  'United States': 148,
  'United Kingdom': 145,
  Italy: 128,
  Spain: 112,
  Germany: 132,
  Canada: 136,
  Australia: 142
}

const hotelStarMultiplier: Record<number, number> = {
  1: 0.5,
  2: 0.72,
  3: 1,
  4: 1.42,
  5: 2.1
}

const cityHotelNightlyRateByStar: Record<string, Partial<Record<number, number>>> = {
  beijing: { 2: 17, 3: 41, 4: 66, 5: 100 },
  shanghai: { 2: 30, 3: 85, 4: 177, 5: 269 },
  paris: { 2: 92, 3: 115, 4: 160, 5: 470 },
  tokyo: { 1: 26, 2: 37, 3: 40, 4: 82, 5: 267 },
  'new york': { 1: 92, 2: 141, 3: 158, 4: 207, 5: 464 },
  london: { 1: 79, 2: 71, 3: 110, 4: 164, 5: 375 },
  rome: { 1: 101, 2: 92, 3: 97, 4: 119, 5: 209 },
  barcelona: { 1: 136, 2: 78, 3: 159, 4: 147, 5: 222 },
  berlin: { 1: 101, 2: 62, 3: 85, 4: 97, 5: 189 },
  toronto: { 1: 73, 2: 94, 3: 141, 4: 205, 5: 497 },
  sydney: { 1: 85, 2: 51, 3: 84, 4: 111, 5: 169 }
}

const hotelCityRateMultiplier: Record<string, number> = {
  paris: 1.28,
  nice: 1.24,
  london: 1.32,
  edinburgh: 1.12,
  rome: 1.2,
  venice: 1.26,
  milan: 1.16,
  florence: 1.18,
  barcelona: 1.18,
  madrid: 1.08,
  seville: 1.05,
  tokyo: 1.24,
  kyoto: 1.16,
  osaka: 1.08,
  'new york': 1.34,
  'san francisco': 1.28,
  'los angeles': 1.18,
  sydney: 1.22,
  melbourne: 1.12,
  vancouver: 1.14
}

const hotelNameSuffixes = ['Grand Hotel', 'Central House', 'City Suites', 'Residence', 'Boutique Stay']

const cityHighlightsByName: Record<string, string[]> = {
  beijing: ['Forbidden City', 'Temple of Heaven', 'Summer Palace', 'Mutianyu Great Wall', 'Tiananmen Square', 'Jingshan Park', 'Beihai Park'],
  shanghai: ['The Bund', 'Yu Garden', 'Shanghai Tower', 'Nanjing Road', 'Jade Buddha Temple', 'Xintiandi', 'Tianzifang'],
  shenzhen: ['Window of the World', 'OCT Loft', 'Dameisha Beach', 'Ping An Finance Centre', 'Lianhuashan Park', 'Splendid China Folk Village', 'Shenzhen Bay Park'],
  guangzhou: ['Canton Tower', 'Shamian Island', 'Chen Clan Ancestral Hall', 'Yuexiu Park', 'Beijing Road', 'Sun Yat-sen Memorial Hall', 'Pearl River Night Cruise'],
  paris: ['Eiffel Tower', 'Louvre Museum', 'Notre-Dame Cathedral', 'Montmartre', "Musee d'Orsay", 'Arc de Triomphe', 'Luxembourg Gardens', 'Sainte-Chapelle', 'Palace of Versailles', 'Gardens of Versailles', 'Claude Monet House', 'Disneyland Paris'],
  tours: ['Cathedrale Saint-Gatien', 'Place Plumereau', 'Basilique Saint-Martin', 'Musee des Beaux-Arts de Tours', 'Chateau de Tours'],
  blois: ['Chateau de Chambord', 'Chateau Royal de Blois', 'Maison de la Magie', 'Blois old town', 'Fondation du Doute'],
  chartres: ['Chartres Cathedral', 'Maison Picassiette', "Chartres old town", "Centre International du Vitrail", 'Eure river banks'],
  orleans: ['Cathedrale Sainte-Croix d Orleans', 'Place du Martroi', 'Maison de Jeanne d Arc', 'Loire riverfront', 'Hotel Groslot'],
  bordeaux: ['Place de la Bourse', 'Miroir d eau', 'Cite du Vin', 'Bordeaux Cathedral', 'Rue Sainte-Catherine'],
  toulouse: ['Place du Capitole', 'Basilique Saint-Sernin', 'Couvent des Jacobins', 'Canal du Midi', 'Cite de l Espace'],
  strasbourg: ['Strasbourg Cathedral', 'La Petite France', 'Palais Rohan', 'Parc de l Orangerie', 'European Parliament'],
  lille: ['Grand Place Lille', 'Vieux-Lille', 'Palais des Beaux-Arts de Lille', 'La Vieille Bourse', 'Citadelle de Lille'],
  nantes: ['Chateau des ducs de Bretagne', 'Les Machines de l Ile', 'Passage Pommeraye', 'Cathedrale Saint-Pierre-et-Saint-Paul', 'Ile de Versailles'],
  rouen: ['Rouen Cathedral', 'Gros-Horloge', 'Place du Vieux-Marche', 'Musee des Beaux-Arts de Rouen', 'Aitre Saint-Maclou'],
  lyon: ['Basilica of Notre-Dame de Fourviere', 'Vieux Lyon', "Parc de la Tete d'Or", 'Place Bellecour', 'Les Halles de Lyon Paul Bocuse', 'Musee des Confluences', 'Traboules of Lyon'],
  marseille: ['Old Port', 'Notre-Dame de la Garde', 'Le Panier', 'Mucem', 'Calanques National Park', 'Palais Longchamp', 'La Corniche'],
  nice: ['Promenade des Anglais', 'Castle Hill', 'Old Nice', 'Marc Chagall National Museum', 'Cours Saleya Market', 'Place Massena', 'Matisse Museum'],
  tokyo: ['Senso-ji Temple', 'Shibuya Crossing', 'Tokyo Skytree', 'Meiji Jingu', 'Tsukiji Outer Market', 'Tokyo Tower', 'Ueno Park', 'teamLab Planets'],
  osaka: ['Dotonbori', 'Osaka Castle', 'Shinsekai', 'Umeda Sky Building', 'Kuromon Market', 'Sumiyoshi Taisha', 'Abeno Harukas'],
  kyoto: ['Fushimi Inari Taisha', 'Kiyomizu-dera', 'Arashiyama Bamboo Grove', 'Kinkaku-ji', 'Gion', 'Nijo Castle', 'Philosophers Path'],
  yokohama: ['Minato Mirai', 'Sankeien Garden', 'Yokohama Chinatown', 'Cup Noodles Museum', 'Yamashita Park', 'Red Brick Warehouse', 'Landmark Tower'],
  'new york': ['Statue of Liberty', 'Central Park', 'Times Square', 'Metropolitan Museum of Art', 'Brooklyn Bridge', 'High Line', 'Grand Central Terminal', 'Top of the Rock'],
  'los angeles': ['Griffith Observatory', 'Santa Monica Pier', 'Getty Center', 'Hollywood Walk of Fame', 'The Broad', 'Venice Beach', 'Runyon Canyon', 'LACMA'],
  chicago: ['Millennium Park', 'Art Institute of Chicago', 'Navy Pier', 'Willis Tower Skydeck', 'Riverwalk', 'Cloud Gate', 'Field Museum', 'Magnificent Mile'],
  'san francisco': ['Golden Gate Bridge', 'Alcatraz Island', "Fisherman's Wharf", 'Palace of Fine Arts', 'Golden Gate Park', 'Chinatown', 'Lombard Street', 'Coit Tower'],
  london: ['Buckingham Palace', 'Tower of London', 'British Museum', 'Westminster Abbey', 'St Pauls Cathedral', 'Camden Market', 'Covent Garden', 'Tate Modern'],
  manchester: ['John Rylands Library', 'Science and Industry Museum', 'Northern Quarter', 'Old Trafford', 'Manchester Cathedral', 'Castlefield', 'National Football Museum'],
  liverpool: ['Royal Albert Dock', 'The Beatles Story', 'Liverpool Cathedral', 'Walker Art Gallery', 'Cavern Club', 'Merseyside Maritime Museum', 'Pier Head'],
  edinburgh: ['Edinburgh Castle', 'Royal Mile', "Arthur's Seat", 'Palace of Holyroodhouse', 'Calton Hill', 'Dean Village', 'National Museum of Scotland'],
  rome: ['Colosseum', 'Vatican Museums', 'Trevi Fountain', 'Pantheon', 'Roman Forum', 'Piazza Navona', 'Spanish Steps', 'Castel SantAngelo'],
  milan: ['Duomo di Milano', 'Galleria Vittorio Emanuele II', 'Sforza Castle', 'Navigli', 'Brera', 'The Last Supper', 'Porta Nuova'],
  venice: ["St Mark's Basilica", "Doge's Palace", 'Grand Canal', 'Rialto Bridge', 'Burano', 'Murano', 'Peggy Guggenheim Collection'],
  florence: ['Uffizi Gallery', 'Florence Cathedral', 'Ponte Vecchio', 'Piazzale Michelangelo', 'Accademia Gallery', 'Palazzo Pitti', 'Boboli Gardens'],
  madrid: ['Prado Museum', 'Royal Palace of Madrid', 'Plaza Mayor', 'Retiro Park', 'Mercado de San Miguel', 'Reina Sofia Museum', 'Gran Via'],
  barcelona: ['Sagrada Familia', 'Park Guell', 'Gothic Quarter', 'Casa Batllo', 'La Rambla', 'Palau Guell', 'Barceloneta Beach', 'Montjuic'],
  valencia: ['City of Arts and Sciences', 'Valencia Cathedral', 'Central Market', 'Turia Gardens', 'Lonja de la Seda', 'Malvarrosa Beach', 'Bioparc Valencia'],
  seville: ['Real Alcazar', 'Seville Cathedral', 'Plaza de Espana', 'Metropol Parasol', 'Triana', 'Archivo de Indias', 'Maria Luisa Park'],
  berlin: ['Brandenburg Gate', 'Museum Island', 'Reichstag Building', 'East Side Gallery', 'Berlin Cathedral', 'Checkpoint Charlie', 'Tiergarten', 'Charlottenburg Palace'],
  munich: ['Marienplatz', 'Nymphenburg Palace', 'English Garden', 'Deutsches Museum', 'Viktualienmarkt', 'Residenz Munich', 'Olympic Park'],
  frankfurt: ['Romerberg', 'Stadel Museum', 'Palmengarten', 'Main Tower', 'Frankfurt Cathedral', 'Museumsufer', 'Goethe House'],
  hamburg: ['Miniatur Wunderland', 'Elbphilharmonie', 'Speicherstadt', 'Port of Hamburg', 'St Michaelis Church', 'Planten un Blomen', 'Jungfernstieg'],
  toronto: ['CN Tower', 'Royal Ontario Museum', 'Distillery District', 'St. Lawrence Market', 'Toronto Islands', 'Art Gallery of Ontario', 'Casa Loma'],
  montreal: ['Old Montreal', 'Notre-Dame Basilica', 'Mount Royal', 'Jean-Talon Market', 'Montreal Museum of Fine Arts', 'Old Port of Montreal', 'Plateau Mont-Royal'],
  vancouver: ['Stanley Park', 'Granville Island', 'Capilano Suspension Bridge', 'Gastown', 'Vancouver Lookout', 'VanDusen Botanical Garden', 'Canada Place'],
  calgary: ['Calgary Tower', 'Heritage Park', "Prince's Island Park", 'Glenbow Museum', 'Calgary Zoo', 'Stephen Avenue', 'Peace Bridge'],
  sydney: ['Sydney Opera House', 'Harbour Bridge', 'The Rocks', 'Bondi Beach', 'Darling Harbour', 'Royal Botanic Garden Sydney', 'Manly Beach'],
  melbourne: ['Federation Square', 'Royal Botanic Gardens', 'Queen Victoria Market', 'Hosier Lane', 'National Gallery of Victoria', 'St Kilda Beach', 'Southbank Promenade'],
  brisbane: ['South Bank Parklands', 'Lone Pine Koala Sanctuary', 'Story Bridge', 'City Botanic Gardens', 'Queensland Art Gallery', 'Mount Coot-tha Lookout', 'Roma Street Parkland'],
  perth: ['Kings Park', 'Fremantle Markets', 'Cottesloe Beach', 'Elizabeth Quay', 'Perth Mint', 'Swan River', 'Art Gallery of Western Australia']
}

const cityNearbyDayTripsByName: Record<string, string[]> = {
  tours: ['Chateau de Chenonceau', 'Chateau d Amboise', 'Chateau de Villandry'],
  blois: ['Chateau de Cheverny', 'Chateau de Chaumont-sur-Loire'],
  chartres: ['Chateau de Maintenon'],
  orleans: ['Chateau de Chambord'],
  bordeaux: ['Saint-Emilion'],
  toulouse: ['Carcassonne'],
  strasbourg: ['Colmar old town'],
  lille: ['Lens Louvre-Lens'],
  nantes: ['Clisson old town'],
  rouen: ['Giverny'],
  beijing: ['Badaling Great Wall', 'Universal Beijing Resort'],
  shanghai: ['Zhujiajiao Water Town', 'Suzhou Classical Gardens'],
  shenzhen: ['Nantou Ancient Town', 'Dapeng Fortress'],
  guangzhou: ['Chimelong Safari Park', 'Kaiping Diaolou'],
  lyon: ['Annecy Old Town', 'Perouges'],
  marseille: ['Aix-en-Provence Old Town', 'Cassis Harbour'],
  nice: ['Monaco Old Town', 'Eze Village'],
  tokyo: ['Nikko Toshogu Shrine', 'Hakone Open-Air Museum'],
  osaka: ['Nara Park', 'Himeji Castle'],
  kyoto: ['Uji Byodo-in', 'Amanohashidate'],
  yokohama: ['Kamakura Great Buddha', 'Enoshima'],
  'new york': ['Coney Island', 'Storm King Art Center'],
  'los angeles': ['Malibu Pier', 'Disneyland Resort'],
  chicago: ['Indiana Dunes', 'Frank Lloyd Wright Home and Studio'],
  'san francisco': ['Muir Woods', 'Napa Valley'],
  london: ['Windsor Castle', 'Hampton Court Palace'],
  manchester: ['Chatsworth House', 'Chester Cathedral'],
  liverpool: ['Port Sunlight Village', 'Chester Cathedral'],
  edinburgh: ['Rosslyn Chapel', 'Stirling Castle'],
  rome: ['Villa dEste', 'Ostia Antica'],
  milan: ['Lake Como Bellagio', 'Bergamo Citta Alta'],
  venice: ['Verona Arena', 'Treviso Historic Center'],
  florence: ['Leaning Tower of Pisa', 'Siena Piazza del Campo'],
  madrid: ['Toledo Cathedral', 'Segovia Alcazar'],
  barcelona: ['Montserrat Monastery', 'Girona Old Town'],
  valencia: ['Albufera Natural Park', 'Xativa Castle'],
  seville: ['Cordoba Mezquita', 'Jerez Alcazar'],
  berlin: ['Sanssouci Palace', 'Dresden Old Town'],
  munich: ['Neuschwanstein Castle', 'Dachau Memorial Site'],
  frankfurt: ['Heidelberg Castle', 'Rudesheim am Rhein'],
  hamburg: ['Lubeck Old Town', 'Schwerin Castle'],
  toronto: ['Niagara Falls', 'Blue Mountain Village'],
  montreal: ['Quebec City Old Town', 'Mont-Tremblant Village'],
  vancouver: ['Whistler Village', 'Victoria Inner Harbour'],
  calgary: ['Banff Town', 'Lake Louise'],
  sydney: ['Blue Mountains Three Sisters', 'Hunter Valley'],
  melbourne: ['Great Ocean Road', 'Phillip Island Penguin Parade'],
  brisbane: ['Gold Coast Surfers Paradise', 'Australia Zoo'],
  perth: ['Rottnest Island', 'Swan Valley']
}

const enRouteStopByRoute: Record<string, EnRouteStopSuggestion> = {
  'paris|tours': {
    city: 'Blois',
    site: 'Chateau de Chambord',
    durationMinutes: 90,
    estimatedCost: 19,
    pricingBasis: 'iconic Loire Valley stop near Blois on the way to Tours'
  }
}

const cityMealsByName: Record<string, MealOption[]> = {
  beijing: [{ dish: 'Jiaozi', averageCost: 6 }, { dish: 'Zhajiangmian', averageCost: 5.5 }],
  shanghai: [{ dish: 'Xiaolongbao', averageCost: 7 }, { dish: 'Shengjianbao', averageCost: 6 }],
  shenzhen: [{ dish: 'Dim sum', averageCost: 7.5 }, { dish: 'Seafood congee', averageCost: 6 }],
  guangzhou: [{ dish: 'Dim sum', averageCost: 7 }, { dish: 'Wonton noodles', averageCost: 5.5 }],
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
  China: [{ dish: 'Mapo tofu', averageCost: 6 }, { dish: 'Hot pot', averageCost: 11 }, { dish: 'Biangbiang noodles', averageCost: 5.5 }],
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
  'Palace of Versailles': 21,
  'Gardens of Versailles': 10,
  'Claude Monet House': 11,
  'Disneyland Paris': 65,
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

const visitSiteMetadataByName: Record<string, VisitSiteMetadata> = {
  'Forbidden City': { durationMinutes: 210, areaGroup: 'beijing-central' },
  'Temple of Heaven': { durationMinutes: 120, areaGroup: 'beijing-south' },
  'Summer Palace': { durationMinutes: 180, areaGroup: 'beijing-west' },
  'Mutianyu Great Wall': { durationMinutes: 240, areaGroup: 'beijing-outskirts' },
  'Tiananmen Square': { durationMinutes: 45, areaGroup: 'beijing-central' },
  'Jingshan Park': { durationMinutes: 75, areaGroup: 'beijing-central' },
  'Beihai Park': { durationMinutes: 105, areaGroup: 'beijing-central' },
  'The Bund': { durationMinutes: 75, areaGroup: 'shanghai-bund' },
  'Yu Garden': { durationMinutes: 90, areaGroup: 'shanghai-bund' },
  'Shanghai Tower': { durationMinutes: 120, areaGroup: 'shanghai-lujiazui' },
  'Nanjing Road': { durationMinutes: 75, areaGroup: 'shanghai-bund' },
  'Jade Buddha Temple': { durationMinutes: 75, areaGroup: 'shanghai-center' },
  Xintiandi: { durationMinutes: 75, areaGroup: 'shanghai-center' },
  Tianzifang: { durationMinutes: 75, areaGroup: 'shanghai-center' },
  'Window of the World': { durationMinutes: 180, areaGroup: 'shenzhen-west' },
  'OCT Loft': { durationMinutes: 75, areaGroup: 'shenzhen-west' },
  'Dameisha Beach': { durationMinutes: 120, areaGroup: 'shenzhen-east' },
  'Ping An Finance Centre': { durationMinutes: 75, areaGroup: 'shenzhen-futian' },
  'Lianhuashan Park': { durationMinutes: 75, areaGroup: 'shenzhen-futian' },
  'Splendid China Folk Village': { durationMinutes: 180, areaGroup: 'shenzhen-west' },
  'Shenzhen Bay Park': { durationMinutes: 75, areaGroup: 'shenzhen-bay' },
  'Canton Tower': { durationMinutes: 90, areaGroup: 'guangzhou-river' },
  'Shamian Island': { durationMinutes: 75, areaGroup: 'guangzhou-river' },
  'Chen Clan Ancestral Hall': { durationMinutes: 75, areaGroup: 'guangzhou-old-town' },
  'Yuexiu Park': { durationMinutes: 90, areaGroup: 'guangzhou-center' },
  'Beijing Road': { durationMinutes: 60, areaGroup: 'guangzhou-center' },
  'Sun Yat-sen Memorial Hall': { durationMinutes: 60, areaGroup: 'guangzhou-center' },
  'Pearl River Night Cruise': { durationMinutes: 90, areaGroup: 'guangzhou-river' },
  'Eiffel Tower': { durationMinutes: 150, areaGroup: 'paris-left-bank' },
  'Louvre Museum': { durationMinutes: 90, areaGroup: 'paris-center' },
  'Notre-Dame Cathedral': { durationMinutes: 75, areaGroup: 'paris-center' },
  Montmartre: { durationMinutes: 105, areaGroup: 'paris-north' },
  "Musee d'Orsay": { durationMinutes: 90, areaGroup: 'paris-left-bank' },
  'Arc de Triomphe': { durationMinutes: 45, areaGroup: 'paris-west' },
  'Luxembourg Gardens': { durationMinutes: 75, areaGroup: 'paris-left-bank' },
  'Sainte-Chapelle': { durationMinutes: 60, areaGroup: 'paris-center' },
  'Palace of Versailles': { durationMinutes: 180, areaGroup: 'paris-daytrip-versailles' },
  'Gardens of Versailles': { durationMinutes: 120, areaGroup: 'paris-daytrip-versailles' },
  'Claude Monet House': { durationMinutes: 120, areaGroup: 'paris-daytrip-giverny' },
  'Disneyland Paris': { durationMinutes: 240, areaGroup: 'paris-daytrip-disney' },
  'Basilica of Notre-Dame de Fourviere': { durationMinutes: 75, areaGroup: 'lyon-old-town' },
  'Vieux Lyon': { durationMinutes: 90, areaGroup: 'lyon-old-town' },
  "Parc de la Tete d'Or": { durationMinutes: 105, areaGroup: 'lyon-park' },
  'Place Bellecour': { durationMinutes: 45, areaGroup: 'lyon-center' },
  'Les Halles de Lyon Paul Bocuse': { durationMinutes: 75, areaGroup: 'lyon-center' },
  'Musee des Confluences': { durationMinutes: 120, areaGroup: 'lyon-confluence' },
  'Traboules of Lyon': { durationMinutes: 75, areaGroup: 'lyon-old-town' },
  'Old Port': { durationMinutes: 60, areaGroup: 'marseille-port' },
  'Notre-Dame de la Garde': { durationMinutes: 90, areaGroup: 'marseille-hill' },
  'Le Panier': { durationMinutes: 75, areaGroup: 'marseille-port' },
  Mucem: { durationMinutes: 120, areaGroup: 'marseille-port' },
  'Calanques National Park': { durationMinutes: 210, areaGroup: 'marseille-calanques' },
  'Palais Longchamp': { durationMinutes: 75, areaGroup: 'marseille-center' },
  'La Corniche': { durationMinutes: 60, areaGroup: 'marseille-coast' },
  'Promenade des Anglais': { durationMinutes: 75, areaGroup: 'nice-coast' },
  'Castle Hill': { durationMinutes: 90, areaGroup: 'nice-old-town' },
  'Old Nice': { durationMinutes: 75, areaGroup: 'nice-old-town' },
  'Marc Chagall National Museum': { durationMinutes: 105, areaGroup: 'nice-center' },
  'Cours Saleya Market': { durationMinutes: 60, areaGroup: 'nice-old-town' },
  'Place Massena': { durationMinutes: 45, areaGroup: 'nice-center' },
  'Matisse Museum': { durationMinutes: 90, areaGroup: 'nice-center' },
  'Senso-ji Temple': { durationMinutes: 90, areaGroup: 'tokyo-asakusa' },
  'Shibuya Crossing': { durationMinutes: 45, areaGroup: 'tokyo-shibuya' },
  'Tokyo Skytree': { durationMinutes: 105, areaGroup: 'tokyo-sumida' },
  'Meiji Jingu': { durationMinutes: 90, areaGroup: 'tokyo-shibuya' },
  'Tsukiji Outer Market': { durationMinutes: 75, areaGroup: 'tokyo-bay' },
  'Tokyo Tower': { durationMinutes: 75, areaGroup: 'tokyo-minato' },
  'Ueno Park': { durationMinutes: 90, areaGroup: 'tokyo-ueno' },
  'teamLab Planets': { durationMinutes: 120, areaGroup: 'tokyo-bay' },
  Dotonbori: { durationMinutes: 75, areaGroup: 'osaka-namba' },
  'Osaka Castle': { durationMinutes: 120, areaGroup: 'osaka-castle' },
  Shinsekai: { durationMinutes: 75, areaGroup: 'osaka-south' },
  'Umeda Sky Building': { durationMinutes: 75, areaGroup: 'osaka-umeda' },
  'Kuromon Market': { durationMinutes: 60, areaGroup: 'osaka-namba' },
  'Sumiyoshi Taisha': { durationMinutes: 75, areaGroup: 'osaka-south' },
  'Abeno Harukas': { durationMinutes: 75, areaGroup: 'osaka-south' },
  'Fushimi Inari Taisha': { durationMinutes: 150, areaGroup: 'kyoto-south' },
  'Kiyomizu-dera': { durationMinutes: 90, areaGroup: 'kyoto-east' },
  'Arashiyama Bamboo Grove': { durationMinutes: 90, areaGroup: 'kyoto-arashiyama' },
  'Kinkaku-ji': { durationMinutes: 60, areaGroup: 'kyoto-north' },
  Gion: { durationMinutes: 75, areaGroup: 'kyoto-east' },
  'Nijo Castle': { durationMinutes: 90, areaGroup: 'kyoto-center' },
  'Philosophers Path': { durationMinutes: 75, areaGroup: 'kyoto-east' },
  'Minato Mirai': { durationMinutes: 75, areaGroup: 'yokohama-bay' },
  'Sankeien Garden': { durationMinutes: 90, areaGroup: 'yokohama-south' },
  'Yokohama Chinatown': { durationMinutes: 60, areaGroup: 'yokohama-central' },
  'Cup Noodles Museum': { durationMinutes: 75, areaGroup: 'yokohama-bay' },
  'Yamashita Park': { durationMinutes: 60, areaGroup: 'yokohama-central' },
  'Red Brick Warehouse': { durationMinutes: 60, areaGroup: 'yokohama-bay' },
  'Landmark Tower': { durationMinutes: 60, areaGroup: 'yokohama-bay' },
  'Statue of Liberty': { durationMinutes: 150, areaGroup: 'new-york-harbor' },
  'Central Park': { durationMinutes: 120, areaGroup: 'new-york-midtown' },
  'Times Square': { durationMinutes: 45, areaGroup: 'new-york-midtown' },
  'Metropolitan Museum of Art': { durationMinutes: 150, areaGroup: 'new-york-upper-east' },
  'Brooklyn Bridge': { durationMinutes: 60, areaGroup: 'new-york-downtown' },
  'High Line': { durationMinutes: 75, areaGroup: 'new-york-west-side' },
  'Grand Central Terminal': { durationMinutes: 45, areaGroup: 'new-york-midtown' },
  'Top of the Rock': { durationMinutes: 75, areaGroup: 'new-york-midtown' },
  'Griffith Observatory': { durationMinutes: 75, areaGroup: 'los-angeles-hollywood' },
  'Santa Monica Pier': { durationMinutes: 75, areaGroup: 'los-angeles-westside' },
  'Getty Center': { durationMinutes: 120, areaGroup: 'los-angeles-westside' },
  'Hollywood Walk of Fame': { durationMinutes: 60, areaGroup: 'los-angeles-hollywood' },
  'The Broad': { durationMinutes: 90, areaGroup: 'los-angeles-downtown' },
  'Venice Beach': { durationMinutes: 90, areaGroup: 'los-angeles-westside' },
  'Runyon Canyon': { durationMinutes: 90, areaGroup: 'los-angeles-hollywood' },
  LACMA: { durationMinutes: 120, areaGroup: 'los-angeles-miracle-mile' },
  'Millennium Park': { durationMinutes: 75, areaGroup: 'chicago-loop' },
  'Art Institute of Chicago': { durationMinutes: 150, areaGroup: 'chicago-loop' },
  'Navy Pier': { durationMinutes: 90, areaGroup: 'chicago-lakefront' },
  'Willis Tower Skydeck': { durationMinutes: 75, areaGroup: 'chicago-loop' },
  Riverwalk: { durationMinutes: 75, areaGroup: 'chicago-loop' },
  'Cloud Gate': { durationMinutes: 30, areaGroup: 'chicago-loop' },
  'Field Museum': { durationMinutes: 120, areaGroup: 'chicago-museum-campus' },
  'Magnificent Mile': { durationMinutes: 60, areaGroup: 'chicago-river-north' },
  'Golden Gate Bridge': { durationMinutes: 60, areaGroup: 'san-francisco-north' },
  'Alcatraz Island': { durationMinutes: 180, areaGroup: 'san-francisco-bay' },
  "Fisherman's Wharf": { durationMinutes: 75, areaGroup: 'san-francisco-waterfront' },
  'Palace of Fine Arts': { durationMinutes: 45, areaGroup: 'san-francisco-marina' },
  'Golden Gate Park': { durationMinutes: 120, areaGroup: 'san-francisco-park' },
  Chinatown: { durationMinutes: 60, areaGroup: 'san-francisco-downtown' },
  'Lombard Street': { durationMinutes: 30, areaGroup: 'san-francisco-russian-hill' },
  'Coit Tower': { durationMinutes: 60, areaGroup: 'san-francisco-north-beach' },
  'Buckingham Palace': { durationMinutes: 60, areaGroup: 'london-westminster' },
  'Tower of London': { durationMinutes: 150, areaGroup: 'london-city' },
  'British Museum': { durationMinutes: 150, areaGroup: 'london-bloomsbury' },
  'Westminster Abbey': { durationMinutes: 75, areaGroup: 'london-westminster' },
  'St Pauls Cathedral': { durationMinutes: 75, areaGroup: 'london-city' },
  'Camden Market': { durationMinutes: 75, areaGroup: 'london-camden' },
  'Covent Garden': { durationMinutes: 60, areaGroup: 'london-west-end' },
  'Tate Modern': { durationMinutes: 120, areaGroup: 'london-south-bank' },
  'John Rylands Library': { durationMinutes: 60, areaGroup: 'manchester-center' },
  'Science and Industry Museum': { durationMinutes: 120, areaGroup: 'manchester-center' },
  'Northern Quarter': { durationMinutes: 60, areaGroup: 'manchester-center' },
  'Old Trafford': { durationMinutes: 120, areaGroup: 'manchester-west' },
  'Manchester Cathedral': { durationMinutes: 45, areaGroup: 'manchester-center' },
  Castlefield: { durationMinutes: 60, areaGroup: 'manchester-center' },
  'National Football Museum': { durationMinutes: 90, areaGroup: 'manchester-center' },
  'Royal Albert Dock': { durationMinutes: 75, areaGroup: 'liverpool-waterfront' },
  'The Beatles Story': { durationMinutes: 90, areaGroup: 'liverpool-waterfront' },
  'Liverpool Cathedral': { durationMinutes: 60, areaGroup: 'liverpool-center' },
  'Walker Art Gallery': { durationMinutes: 90, areaGroup: 'liverpool-center' },
  'Cavern Club': { durationMinutes: 45, areaGroup: 'liverpool-center' },
  'Merseyside Maritime Museum': { durationMinutes: 90, areaGroup: 'liverpool-waterfront' },
  'Pier Head': { durationMinutes: 45, areaGroup: 'liverpool-waterfront' },
  'Edinburgh Castle': { durationMinutes: 120, areaGroup: 'edinburgh-old-town' },
  'Royal Mile': { durationMinutes: 75, areaGroup: 'edinburgh-old-town' },
  "Arthur's Seat": { durationMinutes: 120, areaGroup: 'edinburgh-east' },
  'Palace of Holyroodhouse': { durationMinutes: 75, areaGroup: 'edinburgh-east' },
  'Calton Hill': { durationMinutes: 45, areaGroup: 'edinburgh-center' },
  'Dean Village': { durationMinutes: 45, areaGroup: 'edinburgh-west' },
  'National Museum of Scotland': { durationMinutes: 120, areaGroup: 'edinburgh-old-town' },
  Colosseum: { durationMinutes: 120, areaGroup: 'rome-center' },
  'Vatican Museums': { durationMinutes: 210, areaGroup: 'rome-vatican' },
  'Trevi Fountain': { durationMinutes: 45, areaGroup: 'rome-center' },
  Pantheon: { durationMinutes: 60, areaGroup: 'rome-center' },
  'Roman Forum': { durationMinutes: 120, areaGroup: 'rome-center' },
  'Piazza Navona': { durationMinutes: 45, areaGroup: 'rome-center' },
  'Spanish Steps': { durationMinutes: 45, areaGroup: 'rome-center' },
  'Castel SantAngelo': { durationMinutes: 90, areaGroup: 'rome-vatican' },
  'Duomo di Milano': { durationMinutes: 90, areaGroup: 'milan-center' },
  'Galleria Vittorio Emanuele II': { durationMinutes: 45, areaGroup: 'milan-center' },
  'Sforza Castle': { durationMinutes: 90, areaGroup: 'milan-center' },
  Navigli: { durationMinutes: 75, areaGroup: 'milan-navigli' },
  Brera: { durationMinutes: 60, areaGroup: 'milan-center' },
  'The Last Supper': { durationMinutes: 60, areaGroup: 'milan-west' },
  'Porta Nuova': { durationMinutes: 60, areaGroup: 'milan-center' },
  "St Mark's Basilica": { durationMinutes: 75, areaGroup: 'venice-san-marco' },
  "Doge's Palace": { durationMinutes: 120, areaGroup: 'venice-san-marco' },
  'Grand Canal': { durationMinutes: 60, areaGroup: 'venice-central' },
  'Rialto Bridge': { durationMinutes: 30, areaGroup: 'venice-central' },
  Burano: { durationMinutes: 120, areaGroup: 'venice-islands' },
  Murano: { durationMinutes: 120, areaGroup: 'venice-islands' },
  'Peggy Guggenheim Collection': { durationMinutes: 90, areaGroup: 'venice-dorsoduro' },
  'Uffizi Gallery': { durationMinutes: 150, areaGroup: 'florence-center' },
  'Florence Cathedral': { durationMinutes: 75, areaGroup: 'florence-center' },
  'Ponte Vecchio': { durationMinutes: 45, areaGroup: 'florence-center' },
  'Piazzale Michelangelo': { durationMinutes: 60, areaGroup: 'florence-hill' },
  'Accademia Gallery': { durationMinutes: 90, areaGroup: 'florence-center' },
  'Palazzo Pitti': { durationMinutes: 120, areaGroup: 'florence-oltrarno' },
  'Boboli Gardens': { durationMinutes: 105, areaGroup: 'florence-oltrarno' },
  'Prado Museum': { durationMinutes: 150, areaGroup: 'madrid-center' },
  'Royal Palace of Madrid': { durationMinutes: 90, areaGroup: 'madrid-center' },
  'Plaza Mayor': { durationMinutes: 45, areaGroup: 'madrid-center' },
  'Retiro Park': { durationMinutes: 90, areaGroup: 'madrid-center' },
  'Mercado de San Miguel': { durationMinutes: 45, areaGroup: 'madrid-center' },
  'Reina Sofia Museum': { durationMinutes: 120, areaGroup: 'madrid-center' },
  'Gran Via': { durationMinutes: 60, areaGroup: 'madrid-center' },
  'Sagrada Familia': { durationMinutes: 90, areaGroup: 'barcelona-eixample' },
  'Park Guell': { durationMinutes: 105, areaGroup: 'barcelona-gracia' },
  'Gothic Quarter': { durationMinutes: 75, areaGroup: 'barcelona-old-town' },
  'Casa Batllo': { durationMinutes: 75, areaGroup: 'barcelona-eixample' },
  'La Rambla': { durationMinutes: 60, areaGroup: 'barcelona-old-town' },
  'Palau Guell': { durationMinutes: 60, areaGroup: 'barcelona-old-town' },
  'Barceloneta Beach': { durationMinutes: 90, areaGroup: 'barcelona-coast' },
  Montjuic: { durationMinutes: 105, areaGroup: 'barcelona-montjuic' },
  'City of Arts and Sciences': { durationMinutes: 150, areaGroup: 'valencia-modern' },
  'Valencia Cathedral': { durationMinutes: 60, areaGroup: 'valencia-center' },
  'Central Market': { durationMinutes: 60, areaGroup: 'valencia-center' },
  'Turia Gardens': { durationMinutes: 90, areaGroup: 'valencia-center' },
  'Lonja de la Seda': { durationMinutes: 60, areaGroup: 'valencia-center' },
  'Malvarrosa Beach': { durationMinutes: 90, areaGroup: 'valencia-coast' },
  'Bioparc Valencia': { durationMinutes: 180, areaGroup: 'valencia-west' },
  'Real Alcazar': { durationMinutes: 120, areaGroup: 'seville-center' },
  'Seville Cathedral': { durationMinutes: 90, areaGroup: 'seville-center' },
  'Plaza de Espana': { durationMinutes: 60, areaGroup: 'seville-park' },
  'Metropol Parasol': { durationMinutes: 60, areaGroup: 'seville-center' },
  Triana: { durationMinutes: 75, areaGroup: 'seville-west' },
  'Archivo de Indias': { durationMinutes: 60, areaGroup: 'seville-center' },
  'Maria Luisa Park': { durationMinutes: 90, areaGroup: 'seville-park' },
  'Brandenburg Gate': { durationMinutes: 30, areaGroup: 'berlin-center' },
  'Museum Island': { durationMinutes: 180, areaGroup: 'berlin-center' },
  'Reichstag Building': { durationMinutes: 60, areaGroup: 'berlin-center' },
  'East Side Gallery': { durationMinutes: 60, areaGroup: 'berlin-east' },
  'Berlin Cathedral': { durationMinutes: 60, areaGroup: 'berlin-center' },
  'Checkpoint Charlie': { durationMinutes: 30, areaGroup: 'berlin-center' },
  Tiergarten: { durationMinutes: 90, areaGroup: 'berlin-center' },
  'Charlottenburg Palace': { durationMinutes: 120, areaGroup: 'berlin-west' },
  Marienplatz: { durationMinutes: 45, areaGroup: 'munich-center' },
  'Nymphenburg Palace': { durationMinutes: 120, areaGroup: 'munich-west' },
  'English Garden': { durationMinutes: 90, areaGroup: 'munich-center' },
  'Deutsches Museum': { durationMinutes: 150, areaGroup: 'munich-center' },
  Viktualienmarkt: { durationMinutes: 60, areaGroup: 'munich-center' },
  'Residenz Munich': { durationMinutes: 120, areaGroup: 'munich-center' },
  'Olympic Park': { durationMinutes: 90, areaGroup: 'munich-north' },
  Romerberg: { durationMinutes: 45, areaGroup: 'frankfurt-center' },
  'Stadel Museum': { durationMinutes: 105, areaGroup: 'frankfurt-river' },
  Palmengarten: { durationMinutes: 90, areaGroup: 'frankfurt-west' },
  'Main Tower': { durationMinutes: 60, areaGroup: 'frankfurt-center' },
  'Frankfurt Cathedral': { durationMinutes: 45, areaGroup: 'frankfurt-center' },
  Museumsufer: { durationMinutes: 75, areaGroup: 'frankfurt-river' },
  'Goethe House': { durationMinutes: 60, areaGroup: 'frankfurt-center' },
  'Miniatur Wunderland': { durationMinutes: 150, areaGroup: 'hamburg-port' },
  Elbphilharmonie: { durationMinutes: 60, areaGroup: 'hamburg-port' },
  Speicherstadt: { durationMinutes: 60, areaGroup: 'hamburg-port' },
  'Port of Hamburg': { durationMinutes: 75, areaGroup: 'hamburg-port' },
  'St Michaelis Church': { durationMinutes: 45, areaGroup: 'hamburg-center' },
  'Planten un Blomen': { durationMinutes: 75, areaGroup: 'hamburg-center' },
  Jungfernstieg: { durationMinutes: 45, areaGroup: 'hamburg-center' },
  'CN Tower': { durationMinutes: 75, areaGroup: 'toronto-center' },
  'Royal Ontario Museum': { durationMinutes: 120, areaGroup: 'toronto-midtown' },
  'Distillery District': { durationMinutes: 60, areaGroup: 'toronto-east' },
  'St. Lawrence Market': { durationMinutes: 60, areaGroup: 'toronto-center' },
  'Toronto Islands': { durationMinutes: 180, areaGroup: 'toronto-waterfront' },
  'Art Gallery of Ontario': { durationMinutes: 120, areaGroup: 'toronto-center' },
  'Casa Loma': { durationMinutes: 90, areaGroup: 'toronto-midtown' },
  'Old Montreal': { durationMinutes: 75, areaGroup: 'montreal-old-town' },
  'Notre-Dame Basilica': { durationMinutes: 60, areaGroup: 'montreal-old-town' },
  'Mount Royal': { durationMinutes: 105, areaGroup: 'montreal-center' },
  'Jean-Talon Market': { durationMinutes: 60, areaGroup: 'montreal-north' },
  'Montreal Museum of Fine Arts': { durationMinutes: 120, areaGroup: 'montreal-center' },
  'Old Port of Montreal': { durationMinutes: 60, areaGroup: 'montreal-old-town' },
  'Plateau Mont-Royal': { durationMinutes: 75, areaGroup: 'montreal-center' },
  'Stanley Park': { durationMinutes: 120, areaGroup: 'vancouver-west' },
  'Granville Island': { durationMinutes: 75, areaGroup: 'vancouver-center' },
  'Capilano Suspension Bridge': { durationMinutes: 120, areaGroup: 'vancouver-north' },
  Gastown: { durationMinutes: 60, areaGroup: 'vancouver-center' },
  'Vancouver Lookout': { durationMinutes: 45, areaGroup: 'vancouver-center' },
  'VanDusen Botanical Garden': { durationMinutes: 90, areaGroup: 'vancouver-south' },
  'Canada Place': { durationMinutes: 45, areaGroup: 'vancouver-center' },
  'Calgary Tower': { durationMinutes: 60, areaGroup: 'calgary-center' },
  'Heritage Park': { durationMinutes: 180, areaGroup: 'calgary-south' },
  "Prince's Island Park": { durationMinutes: 75, areaGroup: 'calgary-center' },
  'Glenbow Museum': { durationMinutes: 90, areaGroup: 'calgary-center' },
  'Calgary Zoo': { durationMinutes: 180, areaGroup: 'calgary-east' },
  'Stephen Avenue': { durationMinutes: 60, areaGroup: 'calgary-center' },
  'Peace Bridge': { durationMinutes: 30, areaGroup: 'calgary-center' },
  'Sydney Opera House': { durationMinutes: 90, areaGroup: 'sydney-harbour' },
  'Harbour Bridge': { durationMinutes: 60, areaGroup: 'sydney-harbour' },
  'The Rocks': { durationMinutes: 60, areaGroup: 'sydney-harbour' },
  'Bondi Beach': { durationMinutes: 120, areaGroup: 'sydney-east' },
  'Darling Harbour': { durationMinutes: 75, areaGroup: 'sydney-center' },
  'Royal Botanic Garden Sydney': { durationMinutes: 90, areaGroup: 'sydney-harbour' },
  'Manly Beach': { durationMinutes: 150, areaGroup: 'sydney-north' },
  'Federation Square': { durationMinutes: 45, areaGroup: 'melbourne-center' },
  'Royal Botanic Gardens': { durationMinutes: 90, areaGroup: 'melbourne-center' },
  'Queen Victoria Market': { durationMinutes: 60, areaGroup: 'melbourne-center' },
  'Hosier Lane': { durationMinutes: 30, areaGroup: 'melbourne-center' },
  'National Gallery of Victoria': { durationMinutes: 120, areaGroup: 'melbourne-center' },
  'St Kilda Beach': { durationMinutes: 120, areaGroup: 'melbourne-south' },
  'Southbank Promenade': { durationMinutes: 60, areaGroup: 'melbourne-center' },
  'South Bank Parklands': { durationMinutes: 90, areaGroup: 'brisbane-river' },
  'Lone Pine Koala Sanctuary': { durationMinutes: 180, areaGroup: 'brisbane-southwest' },
  'Story Bridge': { durationMinutes: 45, areaGroup: 'brisbane-center' },
  'City Botanic Gardens': { durationMinutes: 75, areaGroup: 'brisbane-center' },
  'Queensland Art Gallery': { durationMinutes: 90, areaGroup: 'brisbane-river' },
  'Mount Coot-tha Lookout': { durationMinutes: 60, areaGroup: 'brisbane-west' },
  'Roma Street Parkland': { durationMinutes: 75, areaGroup: 'brisbane-center' },
  'Kings Park': { durationMinutes: 120, areaGroup: 'perth-center' },
  'Fremantle Markets': { durationMinutes: 60, areaGroup: 'perth-fremantle' },
  'Cottesloe Beach': { durationMinutes: 105, areaGroup: 'perth-coast' },
  'Elizabeth Quay': { durationMinutes: 45, areaGroup: 'perth-center' },
  'Perth Mint': { durationMinutes: 60, areaGroup: 'perth-center' },
  'Swan River': { durationMinutes: 75, areaGroup: 'perth-river' },
  'Art Gallery of Western Australia': { durationMinutes: 90, areaGroup: 'perth-center' }
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

function getSeasonLabel(isoDate?: string) {
  const multiplier = getSeasonMultiplier(isoDate)

  if (multiplier >= 1.18) return 'peak season'
  if (multiplier > 1) return 'shoulder season'
  return 'low season'
}

function getWeekdayLabel(isoDate?: string) {
  if (!isoDate) return 'unspecified weekday'

  const date = new Date(`${isoDate}T12:00:00`)
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date)
}

function isPrimaryFlightHub(city: string) {
  const normalizedCity = city.trim().toLowerCase()
  return ['beijing', 'shanghai', 'paris', 'tokyo', 'london', 'frankfurt', 'new york', 'los angeles'].includes(normalizedCity)
}

function getFlightRouteFamily(fromCity: string, toCity: string, fallbackCountry?: string) {
  const fromCountry = inferCountryForCity(fromCity, fallbackCountry)
  const toCountry = inferCountryForCity(toCity, fallbackCountry)
  const europeCountries = new Set(['France', 'United Kingdom', 'Italy', 'Spain', 'Germany'])

  if (fromCountry === toCountry) return `domestic ${fromCountry.toLowerCase()}`
  if (europeCountries.has(fromCountry) && europeCountries.has(toCountry)) return 'intra-Europe'
  if (
    (fromCountry === 'China' && europeCountries.has(toCountry)) ||
    (toCountry === 'China' && europeCountries.has(fromCountry))
  ) {
    return 'Europe-China long-haul'
  }

  if (
    (fromCountry === 'Japan' && europeCountries.has(toCountry)) ||
    (toCountry === 'Japan' && europeCountries.has(fromCountry))
  ) {
    return 'Europe-Japan long-haul'
  }

  if (
    (fromCountry === 'United States' && europeCountries.has(toCountry)) ||
    (toCountry === 'United States' && europeCountries.has(fromCountry))
  ) {
    return 'Europe-North America long-haul'
  }

  return `${fromCountry}-${toCountry} corridor`
}

function getFlightConnectionPattern(fromCity: string, toCity: string, distance: number | null) {
  const normalizedDistance = Math.max(0, distance ?? 0)
  const hubPair = isPrimaryFlightHub(fromCity) && isPrimaryFlightHub(toCity)

  if (normalizedDistance >= 6500 && hubPair) return 'likely nonstop hub-to-hub flight'
  if (normalizedDistance >= 6500) return 'likely 1-stop long-haul connection'
  if (normalizedDistance >= 1800 && hubPair) return 'likely nonstop medium-haul flight'
  if (normalizedDistance >= 1800) return 'mixed nonstop / 1-stop medium-haul pattern'
  return 'short-haul schedule pattern'
}

export function getEstimatedTransportTimingDetails(
  mode: TransportMode,
  distance: number | null,
  fromCity: string,
  toCity: string,
  fallbackCountry?: string,
  travelDate?: string
) {
  const normalizedDistance = Math.max(0, distance ?? 80)
  const weekday = getWeekdayLabel(travelDate)
  const seasonLabel = getSeasonLabel(travelDate)

  if (mode === 'flight') {
    const routeFamily = getFlightRouteFamily(fromCity, toCity, fallbackCountry)
    const connectionPattern = getFlightConnectionPattern(fromCity, toCity, distance)
    return `Estimated time. ${fromCity} -> ${toCity}, ${Math.round(normalizedDistance)} km, ${routeFamily}, ${seasonLabel}, ${weekday} departure, ${connectionPattern}. Arrival is adjusted to destination local time when the route crosses time zones.`
  }

  if (mode === 'train') {
    return `Estimated time. ${fromCity} -> ${toCity}, ${Math.round(normalizedDistance)} km, ${seasonLabel}, ${weekday} departure. Train duration stays estimated until a real timetable is available.`
  }

  if (mode === 'drive') {
    return `Estimated time. ${fromCity} -> ${toCity}, ${Math.round(normalizedDistance)} km road segment, ${seasonLabel}, ${weekday} departure.`
  }

  if (mode === 'local') {
    return `Estimated time. ${fromCity} -> ${toCity}, ${Math.round(normalizedDistance)} km local transit segment, ${weekday}.`
  }

  return `Estimated time. ${fromCity} -> ${toCity}, ${Math.round(normalizedDistance)} km, ${weekday}.`
}

function inferVisitDurationMinutes(highlight: string) {
  const normalized = highlight.toLowerCase()

  if (normalized.includes('museum') || normalized.includes('gallery') || normalized.includes('musee')) return 105
  if (normalized.includes('tower') || normalized.includes('skytree') || normalized.includes('observatory')) return 75
  if (normalized.includes('cathedral') || normalized.includes('basilica') || normalized.includes('abbey') || normalized.includes('temple')) return 60
  if (normalized.includes('palace') || normalized.includes('castle') || normalized.includes('alcazar') || normalized.includes('museums')) return 120
  if (normalized.includes('park') || normalized.includes('gardens') || normalized.includes('garden') || normalized.includes('beach')) return 75
  if (normalized.includes('market') || normalized.includes('quarter') || normalized.includes('old ') || normalized.includes('chinatown')) return 60
  if (normalized.includes('bridge') || normalized.includes('square') || normalized.includes('fountain') || normalized.includes('gate')) return 45

  return 90
}

function getVisitDurationMinutes(highlight: string) {
  return visitSiteMetadataByName[highlight]?.durationMinutes ?? inferVisitDurationMinutes(highlight)
}

function getVisitAreaGroup(highlight: string) {
  return visitSiteMetadataByName[highlight]?.areaGroup ?? null
}

function getCityVisitPool(city: string) {
  const normalizedCity = city.trim().toLowerCase()
  const highlights = cityHighlightsByName[normalizedCity] ?? []
  const nearbyDayTrips = cityNearbyDayTripsByName[normalizedCity] ?? []
  const groupedHighlights = groupHighlightsByArea(highlights)
  if (nearbyDayTrips.length === 0) return groupedHighlights

  return [...groupedHighlights, ...nearbyDayTrips]
}

function groupHighlightsByArea(highlights: string[]) {
  const grouped: string[] = []
  const assigned = new Set<string>()

  highlights.forEach((highlight) => {
    if (assigned.has(highlight)) return

    const areaGroup = getVisitAreaGroup(highlight)
    const cluster = areaGroup
      ? highlights.filter((candidate) => !assigned.has(candidate) && getVisitAreaGroup(candidate) === areaGroup)
      : [highlight]

    cluster.forEach((candidate) => {
      if (assigned.has(candidate)) return
      assigned.add(candidate)
      grouped.push(candidate)
    })
  })

  return grouped
}

function getVisitTransferMinutesBetween(highlightA: string, highlightB: string) {
  const groupA = getVisitAreaGroup(highlightA)
  const groupB = getVisitAreaGroup(highlightB)

  if (!groupA || !groupB) return 25
  if (groupA === groupB) return 15

  const [cityA, zoneA] = groupA.split('-', 2)
  const [cityB, zoneB] = groupB.split('-', 2)
  if (!cityA || !cityB || cityA !== cityB) return 40

  const farZonePattern = /(outskirts|islands|calanques|coast|bay|north|south|east|west|hill|park|harbor|waterfront|river|beach)/i
  const isFarZoneA = farZonePattern.test(zoneA ?? '')
  const isFarZoneB = farZonePattern.test(zoneB ?? '')

  if (isFarZoneA || isFarZoneB) return 35
  return 25
}

function getCompanionCandidateScore(primary: string, candidate: string) {
  const transferMinutes = getVisitTransferMinutesBetween(primary, candidate)
  const primaryDuration = getVisitDurationMinutes(primary)
  const candidateDuration = getVisitDurationMinutes(candidate)
  const combinedDuration = primaryDuration + candidateDuration + transferMinutes
  const sameAreaBonus = getVisitAreaGroup(primary) && getVisitAreaGroup(primary) === getVisitAreaGroup(candidate) ? -10 : 0

  return {
    transferMinutes,
    combinedDuration,
    score: transferMinutes + candidateDuration / 12 + combinedDuration / 30 + sameAreaBonus
  }
}

function getBestCompanionHighlight(highlights: string[], primaryIndex: number) {
  const primary = highlights[primaryIndex]
  if (!primary) return null

  let bestCandidate: string | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (let index = primaryIndex + 1; index < highlights.length; index += 1) {
    const candidate = highlights[index]
    if (!candidate || candidate === primary) continue

    const { transferMinutes, combinedDuration, score } = getCompanionCandidateScore(primary, candidate)
    if (
      transferMinutes <= 25 &&
      combinedDuration <= 180 &&
      getVisitDurationMinutes(primary) <= 120 &&
      getVisitDurationMinutes(candidate) <= 90 &&
      score < bestScore
    ) {
      bestCandidate = candidate
      bestScore = score
    }
  }

  return bestCandidate
}

function getSelectedVisitHighlights(city: string, visitIndex: number) {
  const highlights = getCityVisitPool(city)
  if (!highlights?.length) return []
  if (visitIndex >= highlights.length) return []

  const startIndex = visitIndex
  const primary = highlights[startIndex]
  const selected = [primary]
  const companionHighlight = getBestCompanionHighlight(highlights, startIndex)

  if (companionHighlight && companionHighlight !== primary) {
    selected.push(companionHighlight)
  }

  return selected
}

export function getGeneratedVisitName(city: string, visitIndex: number) {
  const selected = getSelectedVisitHighlights(city, visitIndex)
  return selected.length === 0 ? `${city} highlights` : selected.join(', ')
}

export function getGeneratedVisitTransferInfo(city: string, visitIndex: number): VisitTransferInfo | null {
  const selected = getSelectedVisitHighlights(city, visitIndex)
  if (selected.length < 2) return null

  const durationMinutes = getVisitTransferMinutesBetween(selected[0], selected[1])
  const mode = durationMinutes <= 18 ? 'walk' : durationMinutes <= 30 ? 'local' : 'drive'
  return {
    mode,
    durationMinutes
  }
}

export function getGeneratedVisitSiteCount(city: string, visitIndex: number) {
  return Math.max(1, getSelectedVisitHighlights(city, visitIndex).length)
}

export function getGeneratedVisitDurationMinutes(city: string, visitIndex: number) {
  const selected = getSelectedVisitHighlights(city, visitIndex)
  if (selected.length === 0) return 120

  const totalDuration = selected.reduce((sum, highlight) => sum + getVisitDurationMinutes(highlight), 0)
  const transferBuffer =
    selected.length > 1
      ? selected.slice(1).reduce((sum, highlight, index) => {
          const previousHighlight = selected[index]
          return sum + getVisitTransferMinutesBetween(previousHighlight, highlight)
        }, 0)
      : 0
  return Math.max(60, Math.min(240, totalDuration + transferBuffer))
}

export function getGeneratedVisitCost(
  city: string,
  visitIndex: number,
  travelDate?: string,
  occupancy?: OccupancyInputs,
  currency: Currency = 'EUR'
) {
  const selected = getSelectedVisitHighlights(city, visitIndex)
  const seasonMultiplier = getSeasonMultiplier(travelDate)
  const partyUnits = getVisitPartyUnits(occupancy)

  if (selected.length === 0) {
    return convertAmount(Math.round(18 * seasonMultiplier * partyUnits * 100) / 100, 'EUR', currency)
  }

  const knownPrices = selected
    .map((highlight) => attractionPriceByName[highlight])
    .filter((price): price is number => typeof price === 'number')

  if (knownPrices.length === 0) {
    return convertAmount(Math.round(18 * seasonMultiplier * partyUnits * 100) / 100, 'EUR', currency)
  }

  const totalPrice = knownPrices.reduce((sum, price) => sum + price, 0)
  return convertAmount(Math.round(totalPrice * seasonMultiplier * partyUnits * 100) / 100, 'EUR', currency)
}

export function getGeneratedVisitCostDetails(
  city: string,
  visitIndex: number,
  travelDate: string | undefined,
  formatMoney: MoneyFormatter,
  occupancy?: OccupancyInputs,
  currency: Currency = 'EUR'
) {
  const selected = getSelectedVisitHighlights(city, visitIndex)
  const seasonMultiplier = getSeasonMultiplier(travelDate)
  const { adults, children } = normalizeOccupancy(occupancy)
  const partyLabel = `${adults} adult${adults === 1 ? '' : 's'}${children > 0 ? `, ${children} child${children === 1 ? '' : 'ren'}` : ''}`

  if (selected.length === 0) {
    return `Estimated price. Average ticket cost in ${city} for ${partyLabel}`
  }

  const priced = selected
    .map((highlight) => {
      const price = attractionPriceByName[highlight]
      return typeof price === 'number' ? `${highlight}: ${formatMoney(convertAmount(price, 'EUR', currency))}` : null
    })
    .filter((value): value is string => Boolean(value))

  if (priced.length === 0) {
    return `Estimated price. Average ticket cost in ${city} for ${partyLabel}`
  }

  const seasonLabel = seasonMultiplier > 1.1 ? 'high season adjusted' : seasonMultiplier < 1 ? 'low season adjusted' : 'standard season'
  return `Estimated price. ${priced.join(' | ')} (${seasonLabel}, ${partyLabel})`
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

function getMealEstimate(city: string, mealIndex: number, fallbackCountry?: string, occupancy?: OccupancyInputs): MealEstimate {
  const mealOptions = getMealOptionsForCity(city, fallbackCountry)
  const country = inferCountryForCity(city, fallbackCountry)
  const normalizedCity = city.trim().toLowerCase()
  const partyUnits = getMealPartyUnits(occupancy)

  if (!mealOptions.length) {
    const countryMultiplier = countryMealCostMultiplier[country] ?? 1
    const cityMultiplier = cityMealCostMultiplier[normalizedCity] ?? countryMultiplier

    return {
      name: city,
      cost: Math.round(20 * cityMultiplier * partyUnits * 100) / 100,
      pricingBasis:
        cityMealCostMultiplier[normalizedCity] !== undefined
          ? `${city} sample-city meal profile`
          : `${country} country meal profile`
    }
  }

  const mealPlan = mealOptions[mealIndex % mealOptions.length]
  const countryMultiplier = countryMealCostMultiplier[country] ?? 1
  const cityMultiplier = cityMealCostMultiplier[normalizedCity] ?? countryMultiplier
  const adjustedCost = Math.max(4, Math.round(mealPlan.averageCost * cityMultiplier * partyUnits * 100) / 100)

  return {
    name: mealPlan.dish,
    cost: adjustedCost,
    pricingBasis:
      cityMealCostMultiplier[normalizedCity] !== undefined
        ? `${city} sample-city meal profile`
        : `${country} country meal profile`
  }
}

export function getGeneratedMealPlan(
  city: string,
  mealIndex: number,
  fallbackCountry?: string,
  occupancy?: OccupancyInputs,
  currency: Currency = 'EUR'
) {
  const estimate = getMealEstimate(city, mealIndex, fallbackCountry, occupancy)
  return {
    name: estimate.name,
    cost: convertAmount(estimate.cost, 'EUR', currency)
  }
}

export function getGeneratedMealCostDetails(city: string, mealIndex: number, fallbackCountry?: string, occupancy?: OccupancyInputs) {
  const estimate = getMealEstimate(city, mealIndex, fallbackCountry, occupancy)
  const { adults, children } = normalizeOccupancy(occupancy)
  return `Estimated price. Average meal price for ${adults} adult${adults === 1 ? '' : 's'}${children > 0 ? ` and ${children} child${children === 1 ? '' : 'ren'}` : ''}: ${estimate.name} (${estimate.pricingBasis})`
}

export function getPopularEnRouteStop(fromCity: string, toCity: string) {
  const key = [fromCity.trim().toLowerCase(), toCity.trim().toLowerCase()].sort().join('|')
  return enRouteStopByRoute[key] ?? null
}

function getHotelEstimate(
  city: string,
  stars: number,
  fallbackCountry?: string,
  stayDate?: string,
  occupancy?: OccupancyInputs
): HotelEstimate {
  const country = inferCountryForCity(city, fallbackCountry)
  const normalizedCity = city.trim().toLowerCase()
  const seasonMultiplier = getSeasonMultiplier(stayDate)
  const sampledCityRates = cityHotelNightlyRateByStar[normalizedCity]
  const { rooms, adults, children } = normalizeOccupancy(occupancy)

  let nightlyCost: number
  let pricingBasis: string

  if (sampledCityRates?.[stars] !== undefined) {
    nightlyCost = Math.max(35, Math.round(sampledCityRates[stars]! * seasonMultiplier))
    pricingBasis = `${stars}-star sampled city average for ${city}`
  } else {
    const baseRate = countryHotelNightlyBaseRate[country] ?? 120
    const starMultiplier = hotelStarMultiplier[stars] ?? hotelStarMultiplier[3]
    const cityMultiplier =
      hotelCityRateMultiplier[normalizedCity] ??
      (isTouristHub(city) ? 1.12 : 0.96)
    nightlyCost = Math.max(35, Math.round(baseRate * starMultiplier * cityMultiplier * seasonMultiplier))
    pricingBasis = `${stars}-star hotel, ${country} nightly base, ${city} hotel profile`
  }

  const suffix = hotelNameSuffixes[Math.max(0, (stars - 1) % hotelNameSuffixes.length)]
  const name = `${city} ${suffix}`
  const seasonLabel = seasonMultiplier > 1.1 ? 'high season adjusted' : seasonMultiplier < 1 ? 'low season adjusted' : 'standard season'

  return {
    name,
    cost: nightlyCost * rooms,
    pricingBasis: `${pricingBasis}, ${seasonLabel}, ${rooms} room${rooms === 1 ? '' : 's'} for ${adults} adult${adults === 1 ? '' : 's'}${children > 0 ? ` and ${children} child${children === 1 ? '' : 'ren'}` : ''}`
  }
}

export function getGeneratedHotelPlan(
  city: string,
  stars: number,
  fallbackCountry?: string,
  stayDate?: string,
  occupancy?: OccupancyInputs,
  currency: Currency = 'EUR'
) {
  const estimate = getHotelEstimate(city, stars, fallbackCountry, stayDate, occupancy)
  return {
    type: 'hotel',
    name: estimate.name,
    cost: convertAmount(estimate.cost, 'EUR', currency)
  }
}

export function getGeneratedHotelCostDetails(
  city: string,
  stars: number,
  fallbackCountry?: string,
  stayDate?: string,
  occupancy?: OccupancyInputs
) {
  const estimate = getHotelEstimate(city, stars, fallbackCountry, stayDate, occupancy)
  return `Proposed nightly rate for a ${stars}-star hotel in ${city}. ${estimate.pricingBasis}.`
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
  toCity: string,
  fallbackCountry: string | undefined,
  travelDate?: string,
  trainLabel?: string | null,
  occupancy?: OccupancyInputs,
  currency: Currency = 'EUR'
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
  const passengerUnits = getPassengerUnits(occupancy)

  if (mode === 'local') {
    return convertAmount(
      roundPrice(Math.max(localTransitBaseFare, localTransitBaseFare + normalizedDistance * 0.045) * passengerUnits),
      'EUR',
      currency
    )
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
    return convertAmount(roundPrice(Math.max(rawFare, routeFloor * seasonMultiplier) * passengerUnits), 'EUR', currency)
  }

  if (mode === 'drive') {
    const fuelCost = (normalizedDistance / 100) * litersPer100Km * fuelPrice
    const tollCost = normalizedDistance > 80 ? normalizedDistance * tollRate : 0
    return convertAmount(roundPrice((fuelCost + tollCost + 4.5) * seasonMultiplier), 'EUR', currency)
  }

  if (mode === 'flight') {
    return convertAmount(roundPrice((40 + normalizedDistance * 0.09) * (seasonMultiplier + 0.12) * passengerUnits), 'EUR', currency)
  }

  return convertAmount(roundPrice((6 + normalizedDistance * 0.08) * seasonMultiplier), 'EUR', currency)
}

export function getEstimatedTransportCostDetails(
  mode: TransportMode,
  distance: number | null,
  fromCity: string,
  toCity: string,
  fallbackCountry: string | undefined,
  formatMoney: MoneyFormatter,
  travelDate?: string,
  trainLabel?: string | null,
  occupancy?: OccupancyInputs,
  currency: Currency = 'EUR'
) {
  const normalizedDistance = Math.max(0, distance ?? 80)
  const country = inferCountryForCity(fromCity, fallbackCountry)
  const seasonMultiplier = getSeasonMultiplier(travelDate)
  const fuelPrice = countryFuelPriceByLiter[country] ?? 1.7
  const tollRate = countryTollRatePerKm[country] ?? 0.03
  const litersPer100Km = countryVehicleLitersPer100Km[country] ?? 7.2
  const seasonLabel = seasonMultiplier > 1.1 ? 'high season' : seasonMultiplier < 1 ? 'low season' : 'standard season'
  const { adults, children } = normalizeOccupancy(occupancy)
  const partyLabel = `${adults} adult${adults === 1 ? '' : 's'}${children > 0 ? `, ${children} child${children === 1 ? '' : 'ren'}` : ''}`

  if (mode === 'walk') return 'No transport cost'
  if (mode === 'local') {
    return `Estimated price. Local fare for ${partyLabel} based on ${Math.round(normalizedDistance)} km and ${country} base transit fare assumptions`
  }
  if (mode === 'train') {
    const profile = resolveTrainFareProfile(country, trainLabel)
    return `Estimated price. ${profile.label} fare for ${partyLabel} based on ${Math.round(normalizedDistance)} km, ${seasonLabel}, operator/region profile, and route-length fare floors`
  }
  if (mode === 'drive') {
    return `Estimated price. Driving cost: fuel ${formatMoney(convertAmount(fuelPrice, 'EUR', currency))}/L, ${litersPer100Km.toFixed(1)}L/100km, toll ${formatMoney(convertAmount(tollRate, 'EUR', currency))}/km, distance ${Math.round(normalizedDistance)} km`
  }
  if (mode === 'flight') {
    const weekday = getWeekdayLabel(travelDate)
    const routeFamily = getFlightRouteFamily(fromCity, toCity, fallbackCountry)
    return `Estimated price. Flight fare for ${partyLabel} based on ${Math.round(normalizedDistance)} km, ${routeFamily}, ${seasonLabel}, ${weekday}, and a likely direct vs 1-stop route pattern.`
  }
  return `Estimated price. Travel cost based on ${Math.round(normalizedDistance)} km`
}


