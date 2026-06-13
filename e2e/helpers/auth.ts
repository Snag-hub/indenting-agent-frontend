import { type Page } from '@playwright/test'

export const TEST_USERS = {
  admin:    { email: 'admin@demo.com',    password: 'Admin123!',    role: 'Admin' },
  customer: { email: 'customer@demo.com', password: 'Customer123!', role: 'Customer' },
  supplier: { email: 'supplier@demo.com', password: 'Supplier123!', role: 'Supplier' },
} as const

export async function login(page: Page, role: keyof typeof TEST_USERS) {
  const { email, password } = TEST_USERS[role]
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await page.waitForURL(/\/(dashboard|enquiries|rfqs)/, { timeout: 10_000 })
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: /logout/i }).click()
  await page.waitForURL('/login')
}
