import axios from 'axios'
import type { TripPlanDetails } from '../../components/trip/types'
import { getAuthToken } from './authSession'
import { apiBaseUrl } from './apiBaseUrl'

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
  baseURL: apiBaseUrl
})

api.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
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

export async function updateTrip(id: number, payload: CreateTripPayload): Promise<Trip> {
  const { data } = await api.put<Trip>(`/trips/${id}`, payload)
  return data
}

export async function deleteTrip(id: number): Promise<void> {
  await api.delete(`/trips/${id}`)
}
