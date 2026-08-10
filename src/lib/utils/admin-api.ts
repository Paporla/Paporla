/**
 * Helper para llamadas admin API con CSRF.
 * Lee el token CSRF de la cookie y lo envía como header.
 */
function getCsrfToken(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/)
  return match?.[1] ?? ''
}

export async function adminApi<T = unknown>(
  path: string,
  options: { method?: string; body?: Record<string, unknown> } = {},
): Promise<{ success: boolean; data?: T; error?: string }> {
  const csrfToken = getCsrfToken()
  const res = await fetch(path, {
    method: options.method ?? 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  if (!res.ok) {
    const json = await res.json().catch(() => ({ error: `Error HTTP ${res.status}` }))
    throw new Error(json.error ?? `Error HTTP ${res.status}`)
  }

  return res.json()
}
