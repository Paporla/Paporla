import { test, expect } from '@playwright/test'
import { paginaSana, sinErrorDeCarga } from './helpers/pagina'

/**
 * A-15: los tests de páginas publicas eran `expect(page.locator('body')).toBeVisible()`,
 * que pasa con un 500, con un crash de React y con una página en blanco.
 * Ahora cada página tiene que demostrar que muestra su propio titular.
 */
test.describe('Protected Routes', () => {
  const rutasProtegidas = ['/dashboard', '/reservations', '/favorites', '/business', '/admin']

  for (const ruta of rutasProtegidas) {
    test(`${ruta} redirige a login si no hay sesión`, async ({ page }) => {
      await page.goto(ruta)
      await page.waitForURL(/\/login/, { timeout: 15000 })
      await expect(page).toHaveURL(/\/login/)
    })
  }
})

test.describe('Public Pages', () => {
  test('la portada muestra su titular', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await paginaSana(page, { titulo: /Comida de calidad/ })
    await sinErrorDeCarga(page)
  })

  test('sobre nosotros muestra su titular', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')
    await paginaSana(page, { titulo: /Sobre Paporla/ })
    await sinErrorDeCarga(page)
  })

  test('las preguntas frecuentes muestran su titular', async ({ page }) => {
    await page.goto('/faq')
    await page.waitForLoadState('networkidle')
    await paginaSana(page, { titulo: /Preguntas Frecuentes/ })
    await sinErrorDeCarga(page)
  })

  test('contacto muestra su titular y el formulario', async ({ page }) => {
    await page.goto('/contacto')
    await page.waitForLoadState('networkidle')
    await paginaSana(page, { titulo: /Cont.ctanos/ })
    await sinErrorDeCarga(page)
    await expect(page.locator('form')).toBeVisible()
  })

  test('login tiene los campos del formulario', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('registro tiene los campos del formulario', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test('una ruta inexistente devuelve 404', async ({ page }) => {
    const response = await page.goto('/esta-ruta-no-existe-12345')
    expect(response, 'no hubo respuesta').not.toBeNull()
    expect(response!.status()).toBe(404)
  })
})

test.describe('API', () => {
  test('health responde healthy o degraded, nunca otra cosa', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()
    // 200 = healthy, 503 = degraded (sin base de datos accesible).
    expect([200, 503]).toContain(response.status())
    expect(['healthy', 'degraded']).toContain(body.status)
  })
})
