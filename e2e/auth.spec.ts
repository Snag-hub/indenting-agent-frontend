import { test, expect } from '@playwright/test'
import { login, logout, TEST_USERS } from './helpers/auth'

test.describe('Authentication', () => {
  test('D1a: admin can log in and reach dashboard', async ({ page }) => {
    await login(page, 'admin')
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.getByText(/indenting agent/i).first()).toBeVisible()
  })

  test('D1b: customer can log in and reach their home', async ({ page }) => {
    await login(page, 'customer')
    await expect(page).not.toHaveURL('/login')
  })

  test('D1c: supplier can log in and reach their home', async ({ page }) => {
    await login(page, 'supplier')
    await expect(page).not.toHaveURL('/login')
  })

  test('D1d: wrong password returns an error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_USERS.admin.email)
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in|log in/i }).click()
    await expect(page.getByText(/invalid|incorrect|unauthorized/i)).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL('/login')
  })

  test('D1e: logged-in user can log out', async ({ page }) => {
    await login(page, 'admin')
    await logout(page)
    await expect(page).toHaveURL('/login')
  })

  test('D1f: unauthenticated access to protected route redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })
})
