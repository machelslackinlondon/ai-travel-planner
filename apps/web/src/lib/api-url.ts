const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim()

export const apiBaseUrl = (configuredApiUrl || 'http://127.0.0.1:4000').replace(/\/$/, '')

export function apiUrl(path: string) {
  return `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`
}
