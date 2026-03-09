import axios from 'axios'
import { setAuthSession } from './authSession'

interface AuthResponse {
  token: string
  username: string
  email: string
}

interface ForgotPasswordResponse {
  message: string
  resetToken?: string
}

const authApi = axios.create({
  // baseURL: 'http://localhost:5024/api'
  baseURL: 'https://localhost:7024/api'
})

export async function register(username: string, email: string, password: string) {
  const { data } = await authApi.post<AuthResponse>('/auth/register', { username, email, password })
  setAuthSession(data.token, data.username)
  return data
}

export async function login(identifier: string, password: string) {
  const { data } = await authApi.post<AuthResponse>('/auth/login', { identifier, password })
  setAuthSession(data.token, data.username)
  return data
}

export async function forgotPassword(email: string) {
  const { data } = await authApi.post<ForgotPasswordResponse>('/auth/forgot-password', { email })
  return data
}

export async function resetPassword(email: string, token: string, newPassword: string) {
  const { data } = await authApi.post<{ message: string }>('/auth/reset-password', { email, token, newPassword })
  return data
}
