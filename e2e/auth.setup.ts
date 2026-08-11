import { test as setup } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.auth/user.json')

const TEST_EMAIL = process.env.E2E_TEST_EMAIL || ''
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''

setup('authenticate', async ({ page }) => {
  // Saltar si no hay credenciales de prueba configuradas
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    setup.skip(true, 'E2E_TEST_EMAIL y E2E_TEST_PASSWORD no configurados. Crea un usuario de prueba en Supabase.')
    return
  }

  await page.goto('/login')
  await page.waitForSelector('input[name="email"]', { timeout: 15000 })
  await page.fill('input[name="email"]', TEST_EMAIL)
  await page.fill('input[name="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })

  await page.context().storageState({ path: authFile })
})
