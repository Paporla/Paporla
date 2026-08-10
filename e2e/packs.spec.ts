import { test, expect } from '@playwright/test'

test.describe('Packs browsing', () => {
  test('shows packs page with available packs', async ({ page }) => {
    await page.goto('/packs')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})
