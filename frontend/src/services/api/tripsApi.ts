import axios from 'axios'
import type { TripPlanDetails } from '../../components/trip/types'

export interface Trip {
  id: number
  name: string
  country: string
  startDate: string
  endDate: string
  budget: number
  details?: TripPlanDetails
}

export interface CreateTripPayload {
  name: string
  country: string
  startDate: string
  endDate: string
  budget: number
  details: TripPlanDetails
}

const api = axios.create({
  // baseURL: 'http://localhost:5024/api'
  baseURL: 'https://localhost:7024/api'
})

export async function getTrips(): Promise<Trip[]> {
  const { data } = await api.get<Trip[]>('/trips')
  return data
}

export async function getTripById(id: number): Promise<Trip> {
  const { data } = await api.get<Trip>(`/trips/${id}`)
  return data
}

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  const { data } = await api.post<Trip>('/trips', payload)
  return data
}
