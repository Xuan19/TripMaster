const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

export const apiBaseUrl = configuredApiBaseUrl && configuredApiBaseUrl.length > 0
  ? configuredApiBaseUrl.replace(/\/$/, '')
  : import.meta.env.PROD
    ? '/api'
    : 'http://localhost:5024/api'
