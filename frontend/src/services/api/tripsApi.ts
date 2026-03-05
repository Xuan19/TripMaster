import axios from 'axios'

export interface Trip {
  id: number
  name: string
  country: string
  startDate: string
  endDate: string
  budget: number
}

export type CreateTripPayload = Omit<Trip, 'id'>

const api = axios.create({
  // baseURL: 'http://localhost:5024/api'
  baseURL: 'https://localhost:7024/api'
})

export async function getTrips(): Promise<Trip[]> {
  const { data } = await api.get<Trip[]>('/trips')
  return data
}

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  const { data } = await api.post<Trip>('/trips', payload)
  return data
}
