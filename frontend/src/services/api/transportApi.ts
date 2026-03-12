import axios from 'axios'
import { getAuthToken } from './authSession'

export interface TrainJourneyResponse {
  trainReference?: string | null
  trainLabel?: string | null
  departureDateTime?: string | null
  arrivalDateTime?: string | null
  durationSeconds?: number | null
  ticketPrice?: number | null
  ticketCurrency?: string | null
  sections: string[]
}

const api = axios.create({
  baseURL: 'https://localhost:7024/api'
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function getTrainJourney(
  from: string,
  to: string,
  departureDateTime: string
): Promise<TrainJourneyResponse | null> {
  try {
    const { data } = await api.post<TrainJourneyResponse>('/transport/train-journey', {
      from,
      to,
      departureDateTime
    })
    return data
  } catch {
    return null
  }
}
