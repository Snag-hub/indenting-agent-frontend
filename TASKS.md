# Frontend Tasks: Pricing UI + Enquiries Module

Two parallel parts:
- **Part A — Pricing UI** (backend already done, no backend work needed)
- **Part B — Enquiries UI** (implement after backend Enquiries API is live)

---

## PART A: Pricing UI

### A1. queryKeys — add pricing and enquiry keys
File: `src/lib/queryKeys.ts`

Add to the exported `queryKeys` object:
```ts
pricing: {
  baseTiers: (supplierItemId: string) => ['pricing', 'base', supplierItemId] as const,
  customerTiers: (supplierItemId: string) => ['pricing', 'customer', supplierItemId] as const,
},
enquiries: {
  list: (params?: object) => ['enquiries', 'list', params ?? {}] as const,
  detail: (id: string) => ['enquiries', 'detail', id] as const,
},
```

### A2. Supplier — Pricing section in MyItemDetailPage
File: `src/features/supplierCatalog/pages/MyItemDetailPage.tsx`

Add a **"Pricing"** section below the existing Variants section.

**What to build:**
- `useQuery` to fetch base tiers: `pricingApi.getBaseTiers(itemId)`
- Table with columns: **Min Qty** | **Unit Price** | **Delete button**
- Delete → `ConfirmDialog` → `pricingApi.deleteBaseTier(tierId)` → invalidate
- "Add Tier" button → small inline form (or Dialog):
  - Min Qty (number, min 1)
  - Unit Price (number, min 0.01, step 0.01)
  - Submit → `pricingApi.addBaseTier({ supplierItemId, minQty, unitPrice })` → invalidate

**pricingApi methods to use** (already in `src/features/pricing/api/pricingApi.ts`):
- `getBaseTiers({ supplierItemId })` → `GET /api/v1/pricing/base-tiers?supplierItemId=...`
- `addBaseTier(data)` → `POST /api/v1/pricing/base-tiers`
- `deleteBaseTier(id)` → `DELETE /api/v1/pricing/base-tiers/{id}`

### A3. Admin — Pricing section in ItemDetailPage
File: `src/features/catalog/pages/ItemDetailPage.tsx`

Add a **"Pricing"** section. This item is a master item mapped to potentially multiple supplier items.

**What to build:**
- For each supplier item linked to this master item, show their base price tiers (read-only)
- "Add Customer Override" button → Dialog form:
  - Customer (select, fetch from customerApi)
  - Min Qty (number)
  - Unit Price (number)
  - Submit → `pricingApi.addCustomerTier(data)`
- List existing customer-specific overrides with delete option

**pricingApi methods to use:**
- `getBaseTiers({ supplierItemId })` — for each linked supplier item
- `getCustomerTiers({ supplierItemId })` → customer-specific overrides
- `addCustomerTier(data)` → `POST /api/v1/pricing/customer-tiers`
- `deleteCustomerTier(id)` → `DELETE /api/v1/pricing/customer-tiers/{id}`

---

## PART B: Enquiries UI

> Implement this after the backend Enquiries API (`/api/v1/enquiries`) is live.

### B1. API client
File: `src/features/enquiries/api/enquiryApi.ts`

```ts
import { api } from '@/lib/api'

export interface EnquiryItemInput {
  itemId: string
  quantity: number
  notes?: string
}

export interface EnquirySummaryDto {
  id: string
  title: string
  status: string        // 'Draft' | 'Open' | 'Closed'
  itemCount: number
  createdAt: string
}

export interface EnquiryItemDto {
  id: string
  itemId: string
  itemName: string
  quantity: number
  notes?: string
}

export interface EnquiryDetailDto {
  id: string
  title: string
  notes?: string
  status: string
  items: EnquiryItemDto[]
  createdAt: string
}

export const enquiryApi = {
  list: (params?: { search?: string; status?: string; page?: number; pageSize?: number }) =>
    api.get('/enquiries', { params }).then(r => r.data),

  create: (data: { title: string; notes?: string; items: EnquiryItemInput[] }) =>
    api.post('/enquiries', data).then(r => r.data),

  get: (id: string): Promise<EnquiryDetailDto> =>
    api.get(`/enquiries/${id}`).then(r => r.data),

  submit: (id: string) =>
    api.post(`/enquiries/${id}/submit`).then(r => r.data),

  close: (id: string) =>
    api.post(`/enquiries/${id}/close`).then(r => r.data),
}
```

### B2. EnquiriesPage
File: `src/features/enquiries/pages/EnquiriesPage.tsx`

**Structure:**
```
PageHeader title="Enquiries" + "New Enquiry" button
Search input (filter by title)
DataTable columns:
  - Title
  - Status (Badge: Draft=gray, Open=blue, Closed=slate)
  - Items (item count)
  - Created At (format date)
  - Actions: View (eye icon → navigate to detail) | Submit (if Draft) | Close (if Open)
```

**New Enquiry Dialog:**
- Title (required, text)
- Notes (optional, textarea)
- Line items section (dynamic rows):
  - Each row: Item (select from `itemApi.list`) | Qty (number) | Notes (text) | Remove button
  - "Add Item" button appends a new row
  - Minimum 1 line item required
- Submit → `enquiryApi.create(data)` → invalidate list → close dialog

**Actions:**
- Submit button (Draft only) → `enquiryApi.submit(id)` → invalidate
- Close button (Open only) → ConfirmDialog → `enquiryApi.close(id)` → invalidate

### B3. EnquiryDetailPage
File: `src/features/enquiries/pages/EnquiryDetailPage.tsx`

**Structure:**
```
useParams({ from: '/_app/enquiries/$id' })
PageHeader: title = enquiry.title, description = status badge
Action buttons (top right):
  - "Submit" if status === 'Draft'
  - "Close" if status === 'Open'
Card: Notes (if present)
Table: Item Name | Qty | Notes
```

### B4. Routes

`src/routes/_app.enquiries.tsx`
```tsx
import { createFileRoute } from '@tanstack/react-router'
import { EnquiriesPage } from '@/features/enquiries/pages/EnquiriesPage'

export const Route = createFileRoute('/_app/enquiries')({
  component: EnquiriesPage,
})
```

`src/routes/_app.enquiries.$id.tsx`
```tsx
import { createFileRoute } from '@tanstack/react-router'
import { EnquiryDetailPage } from '@/features/enquiries/pages/EnquiryDetailPage'

export const Route = createFileRoute('/_app/enquiries/$id')({
  component: EnquiryDetailPage,
})
```

---

## Patterns to Follow

| Pattern | Reference file |
|---------|---------------|
| DataTable + pagination | `src/features/supplierCatalog/pages/MyItemsPage.tsx` |
| Dialog form with react-hook-form + zod | `src/features/supplierCatalog/pages/MyItemsPage.tsx` |
| Child route with Outlet | `src/features/supplierCatalog/pages/MyItemsPage.tsx` |
| ConfirmDialog for destructive actions | `src/components/ConfirmDialog.tsx` |
| PageHeader | `src/components/PageHeader.tsx` |
| Status badge colors | Use `Badge` from `@/components/ui/badge` |
| API client pattern | `src/features/supplierCatalog/api/supplierItemApi.ts` |
| queryKeys structure | `src/lib/queryKeys.ts` |

---

## Verification

### Part A (Pricing)
1. Log in as Supplier → Items → click item → Pricing section visible
2. Add tier (qty ≥ 1 → $10.00) → appears in table
3. Add another tier (qty ≥ 100 → $9.00) → two rows shown
4. Delete tier → ConfirmDialog → removed
5. Log in as Admin → Master Items → open item → Pricing section shows supplier tiers
6. Add customer override → appears in overrides list

### Part B (Enquiries)
1. Log in as Customer → Enquiries → empty list shown
2. "New Enquiry" → fill title + 2 line items → create → appears in list as Draft
3. Click eye → detail page shows title, items, status
4. Submit → status changes to Open in list and detail
5. Close → status changes to Closed
6. Log in as Admin → Enquiries → sees all customers' enquiries
