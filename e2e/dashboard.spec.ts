import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.use({ storageState: 'e2e/.auth/user.json' })

  test('shows dashboard with user info', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/dashboard|bienvenido/i)).toBeVisible()
  })
})
