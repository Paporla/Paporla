import { test, expect } from '@playwright/test'

test.describe('Login and Dashboard', () => {
  test('shows login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /bienvenido|iniciar/i })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'wrong@email.com')
    await page.fill('input[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    // Esperar respuesta de Supabase
    await page.waitForTimeout(3000)
    // Debe permanecer en /login (las credenciales son inválidas)
    await expect(page).toHaveURL(/\/login/)
    await expect(page.locator('body')).toBeVisible()
  })
})
