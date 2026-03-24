import type { Currency } from '../locales/i18n'

const FALLBACK_RATES_PER_EURO: Record<Currency, number> = {
  EUR: 1,
  USD: 1.09,
  CNY: 7.85
}

const STORAGE_KEY = 'tripmaster.exchange-rates.v1'
const API_URL = 'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=USD,CNY'

let ratesPerEuro: Record<Currency, number> = { ...FALLBACK_RATES_PER_EURO }

function readCachedRates() {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as { rates?: Partial<Record<Currency, number>> } | null
    if (!parsed?.rates) return null

    const usd = Number(parsed.rates.USD)
    const cny = Number(parsed.rates.CNY)
    if (!Number.isFinite(usd) || !Number.isFinite(cny)) return null

    return {
      EUR: 1,
      USD: usd,
      CNY: cny
    } satisfies Record<Currency, number>
  } catch {
    return null
  }
}

function writeCachedRates(rates: Record<Currency, number>) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      fetchedAt: new Date().toISOString(),
      rates
    })
  )
}

export async function loadExchangeRates() {
  const cachedRates = readCachedRates()
  if (cachedRates) {
    ratesPerEuro = cachedRates
  }

  try {
    const response = await fetch(API_URL)
    if (!response.ok) throw new Error(`Exchange rate request failed: ${response.status}`)

    const data = (await response.json()) as {
      rates?: Partial<Record<Currency, number>>
    }

    const usd = Number(data.rates?.USD)
    const cny = Number(data.rates?.CNY)
    if (!Number.isFinite(usd) || !Number.isFinite(cny)) {
      throw new Error('Exchange rate payload missing USD/CNY')
    }

    ratesPerEuro = {
      EUR: 1,
      USD: usd,
      CNY: cny
    }

    writeCachedRates(ratesPerEuro)
  } catch {
    if (!cachedRates) {
      ratesPerEuro = { ...FALLBACK_RATES_PER_EURO }
    }
  }
}

export function convertAmount(amount: number, from: Currency, to: Currency) {
  if (!Number.isFinite(amount) || from === to) return amount

  const amountInEuro = amount / ratesPerEuro[from]
  return Math.round(amountInEuro * ratesPerEuro[to] * 100) / 100
}

export function isCurrency(value: string | null | undefined): value is Currency {
  return value === 'EUR' || value === 'USD' || value === 'CNY'
}
