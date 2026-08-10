import { test, expect } from '@playwright/test'

test.describe('Protected Routes', () => {
  test('dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/\/login/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('reservations redirects to login', async ({ page }) => {
    await page.goto('/reservations')
    await page.waitForURL(/\/login/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('favorites redirects to login', async ({ page }) => {
    await page.goto('/favorites')
    await page.waitForURL(/\/login/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('business redirects to login', async ({ page }) => {
    await page.goto('/business')
    await page.waitForURL(/\/login/, { timeout: 15000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('admin redirects to login', async ({ page }) => {
    await page.goto('/admin')
    await page.waitForURL(/\/login/, { timeout: 15000 })
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
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('register page has form elements', async ({ page }) => {
    await page.goto('/register')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('input[name="name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
  })

  test('404 page works for unknown routes', async ({ page }) => {
    const response = await page.goto('/esta-ruta-no-existe-12345')
    if (response) expect(response.status()).toBe(404)
  })
})

test.describe('API', () => {
  test('health endpoint returns healthy', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.status).toBe('healthy')
  })
})
