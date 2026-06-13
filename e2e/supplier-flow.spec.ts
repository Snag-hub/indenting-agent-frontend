import { test, expect } from '@playwright/test'
import { login } from './helpers/auth'

test.describe('D3: Supplier flow — navigation and list pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'supplier')
  })

  test('can view enquiries list', async ({ page }) => {
    await page.goto('/enquiries')
    await expect(page.getByRole('heading', { name: /enquiries/i })).toBeVisible()
  })

  test('can view RFQs list', async ({ page }) => {
    await page.goto('/rfqs')
    await expect(page.getByRole('heading', { name: /rfqs/i })).toBeVisible()
  })

  test('can view quotations list', async ({ page }) => {
    await page.goto('/quotations')
    await expect(page.getByRole('heading', { name: /quotations/i })).toBeVisible()
  })

  test('can view proforma invoices list', async ({ page }) => {
    await page.goto('/proforma-invoices')
    await expect(page.getByRole('heading', { name: /proforma invoices/i })).toBeVisible()
  })

  test('can view delivery orders list', async ({ page }) => {
    await page.goto('/delivery-orders')
    await expect(page.getByRole('heading', { name: /delivery orders/i })).toBeVisible()
  })

  test('supplier does not see admin party filters', async ({ page }) => {
    await page.goto('/quotations')
    await expect(page.getByRole('combobox', { name: /all customers/i })).not.toBeVisible()
  })
})
