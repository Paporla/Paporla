import { defineConfig, devices } from '@playwright/test'

/**
 * Los tests autenticados necesitan una cuenta real: `auth.setup.ts` entra con
 * E2E_TEST_EMAIL / E2E_TEST_PASSWORD y guarda la sesión en e2e/.auth/user.json.
 *
 * Sin esas dos variables el setup se omite, no hay sesión guardada, y los
 * tests de /dashboard, /profile, /notifications y /favorites acaban
 * redirigidos a /login. Fallarían los cinco, y el mensaje hablaría de que el
 * <h1> no es el esperado... cuando el problema real es de configuración.
 * Un fallo que miente sobre su causa es peor que un skip que dice la verdad.
 *
 * Así que sin credenciales el proyecto entero se omite. Al ponerlas, corre.
 */
const hayCredenciales = Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD)

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // Setup: autentica y guarda sesión
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Tests autenticados: usan la sesión guardada
    {
      name: 'authenticated',
      testMatch: /(authenticated-flows|dashboard)\.spec\.ts/,
      dependencies: ['setup'],
      // Sin credenciales no hay sesión posible: se omiten (ver el comentario
      // de arriba). Con credenciales, se corre todo.
      testIgnore: hayCredenciales ? [] : ['**/*.spec.ts'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
    },
    // Tests públicos (sin auth)
    {
      name: 'chromium',
      testMatch: /(critical-flows|login|packs)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
