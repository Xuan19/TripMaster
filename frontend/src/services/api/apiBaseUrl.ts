const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const apiBaseUrl = configuredApiBaseUrl && configuredApiBaseUrl.length > 0
  ? configuredApiBaseUrl.replace(/\/$/, '')
  : 'https://localhost:7024/api'
