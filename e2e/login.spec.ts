import { test, expect } from '@playwright/test'

test.describe('Login and Dashboard', () => {
  test('shows login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'wrong@email.com')
    await page.fill('input[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    await expect(page.getByText(/error|inválido/i)).toBeVisible()
  })
})
