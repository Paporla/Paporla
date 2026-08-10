'use client'

/**
 * Lee el token CSRF de la cookie establecida por el middleware.
 * La cookie NO es HttpOnly para que el cliente JS pueda leerla.
 */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''

  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

/**
 * Headers por defecto para fetch a la API de Paporla.
 * Incluye el token CSRF requerido para mutaciones.
 */
export function apiHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken(),
    ...extra,
  }
  return headers
}

/**
 * Wrapper de fetch que incluye automáticamente el token CSRF
 * y parsea la respuesta JSON.
 */
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = {
    ...apiHeaders(),
    ...(options?.headers as Record<string, string> | undefined),
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  const data = await response.json()
  if (!data.success) throw new Error(data.error ?? 'Error en la solicitud')
  return data as T
}
