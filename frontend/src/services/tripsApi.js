import axios from 'axios'

const api = axios.create({
  // baseURL: 'http://localhost:5024/api'
  baseURL: 'https://localhost:7024/api'
})

export async function getTrips() {
  const { data } = await api.get('/trips')
  return data
}

export async function createTrip(payload) {
  const { data } = await api.post('/trips', payload)
  return data
}
