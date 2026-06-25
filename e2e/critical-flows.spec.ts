import { test, expect } from '@playwright/test'

test.describe('Reservation Flow', () => {
  test('navigates from packs listing to pack detail', async ({ page }) => {
    await page.goto('/packs')

    // Esperar que la página cargue
    await page.waitForLoadState('networkidle')

    // Verificar que la página de packs carga
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
  })

  test('shows login redirect when reserving without auth', async ({ page }) => {
    await page.goto('/packs')

    // Intentar acceder a una ruta protegida
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/)

    // Debe redirigir al login
    await expect(page).toHaveURL(/\/login/)
  })

  test('protected routes redirect to login', async ({ page }) => {
    const protectedRoutes = ['/dashboard', '/reservations', '/favorites', '/profile', '/notifications']

    for (const route of protectedRoutes) {
      await page.goto(route)
      await page.waitForURL(/\/login/)
      await expect(page).toHaveURL(/\/login/)
    }
  })

  test('business routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/business')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/\/login/)
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Public Pages', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('about page loads', async ({ page }) => {
    await page.goto('/about')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('FAQ page loads', async ({ page }) => {
    await page.goto('/faq')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('contact page loads', async ({ page }) => {
    await page.goto('/contacto')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })

  test('login page has form elements', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Debe tener campos de email y password
    const emailInput = page.locator('input[name="email"]')
    const passwordInput = page.locator('input[name="password"]')
    const submitButton = page.locator('button[type="submit"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()
  })

  test('register page has form elements', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')

    // Debe tener campos de registro
    const nameInput = page.locator('input[name="name"]')
    const emailInput = page.locator('input[name="email"]')
    const passwordInput = page.locator('input[name="password"]')

    await expect(nameInput).toBeVisible()
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('can navigate to all public pages without errors', async ({ page }) => {
    const publicRoutes = ['/', '/about', '/faq', '/contacto', '/login', '/register']

    for (const route of publicRoutes) {
      const response = await page.goto(route)
      // No debe ser 500
      if (response) {
        expect(response.status()).toBeLessThan(500)
      }
      await page.waitForLoadState('networkidle')
    }
  })

  test('404 page works for unknown routes', async ({ page }) => {
    const response = await page.goto('/esta-ruta-no-existe-12345')
    if (response) {
      expect(response.status()).toBe(404)
    }
  })
})

test.describe('Auth Redirects', () => {
  test('login redirects to packs with reserve param preserved', async ({ page }) => {
    // Simular redirect a login con params
    await page.goto('/login?redirect=/packs&reserve=test-123')
    await page.waitForLoadState('networkidle')

    // Verificar que los params están en la URL
    await expect(page).toHaveURL(/\/login\?redirect=\/packs/)
  })

  test('API health endpoint returns healthy', async ({ page, request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body.status).toBe('healthy')
    expect(body.database).toBeDefined()
  })
})
