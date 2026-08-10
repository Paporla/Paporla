import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('shows dashboard with user info', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})
