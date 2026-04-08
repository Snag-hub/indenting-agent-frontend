# Frontend Tasks

## Completed

- All pages: Enquiries (Customer + Supplier separate), RFQs, Quotations
- `MultiStepForm.tsx` — reusable stepper component
- `CreateRFQPage.tsx` — 3-step form (Details → Supplier + Items → Review)
- `RFQDetailPage.tsx` — supplier info card + Replicate dialog; removed broken supplier table
- `rfqApi.ts` — single-supplier DTOs, `clone()`, `getEnquiryItems(enquiryId, supplierId?)`
- Role-based dispatch routes for enquiries + RFQs
- Supplier enquiry pages (read-only list + detail)

---

## Pending — Phase A: Customer Item Aliases (My Items)

### A1. `customerItemApi.ts`
**File:** `src/features/customerCatalog/api/customerItemApi.ts` *(NEW)*

```ts
export interface CustomerItemDto {
  id: string
  masterItemId?: string
  supplierItemId?: string
  resolvedName: string
  customName?: string
  customDescription?: string
  supplierName?: string
  isActive: boolean
}

export interface CreateCustomerItemInput {
  masterItemId?: string
  supplierItemId?: string
  customName?: string
  customDescription?: string
}

export const customerItemApi = {
  list: (params?: { search?: string; page?: number; pageSize?: number }) =>
    api.get<PagedResult<CustomerItemDto>>('/my/customer-items', { params }).then(r => r.data),
  create: (input: CreateCustomerItemInput) =>
    api.post<string>('/my/customer-items', input).then(r => r.data),
  update: (id: string, input: { customName?: string; customDescription?: string }) =>
    api.put(`/my/customer-items/${id}`, input),
  remove: (id: string) =>
    api.delete(`/my/customer-items/${id}`),
}
```

---

### A2. `CustomerMyItemsPage.tsx`
**File:** `src/features/customerCatalog/pages/CustomerMyItemsPage.tsx` *(NEW)*

- DataTable columns: Resolved Name | Original Name (greyed if customised) | Supplier | Type | Status | Actions
- **Add Item** button → dialog:
  - Search from `enquiryApi.availableItems({ search })` — full catalog, no supplier filter
  - Select item → pre-fills `customName` with current resolved name
  - Edit name/description → Submit → `customerItemApi.create(...)`
- **Edit** (pencil icon) → dialog to update `customName` / `customDescription`
- **Remove** → confirm → `customerItemApi.remove(id)` → soft deactivation

---

### A3. Route + dispatch for `/my-items`
**File:** `src/routes/_app.my-items.tsx` *(NEW or MODIFY)*

```tsx
export const Route = createFileRoute('/_app/my-items/')({
  component: MyItemsDispatch,
})

function MyItemsDispatch() {
  const role = useAuthStore(s => s.role)
  if (role === 'Customer') return <CustomerMyItemsPage />
  if (role === 'Supplier') return <MyItemsPage />
  return null
}
```

---

### A4. Add "My Items" to customer nav
**File:** `src/layouts/AppShell.tsx` *(MODIFY)*

Add nav entry for Customer role:
```tsx
{ label: 'My Items', to: '/my-items', icon: <Package /> }
```
Place it after Browse, before Enquiries.

---

## Pending — Phase B: Supplier-First Item Selection + Variant Dialog

### B1. Shared `VariantQuantityDialog.tsx`
**File:** `src/features/catalog/components/VariantQuantityDialog.tsx` *(NEW)*

```tsx
interface VariantQuantityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierItemId: string
  supplierItemName: string
  onConfirm: (variants: { variantId: string; quantity: number }[]) => void
}
```

- On open: `GET /supplier-items/{id}/variants` → loads `[{ id, sku, dimensionSummary }]`
- Table: `Variant (dimensionSummary) | SKU | Quantity (number input, min 0)`
- Submit button disabled until `SUM(quantities) > 0`
- Confirm: passes selected variants (qty > 0) to `onConfirm`

Reused by: CreateEnquiryPage, CreateRFQPage, quotation line item entry.

---

### B2. Update `enquiryApi.ts`
**File:** `src/features/enquiries/api/enquiryApi.ts` *(MODIFY)*

```ts
export type EnquiryType = 'General' | 'ItemSpecific'

export interface AvailableEnquiryItemDto {
  id: string
  type: 'Master' | 'Supplier'
  resolvedName: string
  originalName?: string
  supplierName?: string
  hasVariants: boolean           // NEW
  customerItemId?: string
}

export interface EnquiryItemVariantInput {
  supplierItemVariantId: string
  quantity: number
}

export interface CreateEnquiryItemInput {
  supplierItemId: string
  quantity: number
  notes?: string
  variants?: EnquiryItemVariantInput[]    // required if item hasVariants
}

export interface CreateEnquiryInput {
  enquiryType: EnquiryType               // NEW
  supplierId?: string                    // required when ItemSpecific
  title: string
  notes?: string
  items?: CreateEnquiryItemInput[]       // only when ItemSpecific
}

// Add to enquiryApi:
availableItems: (params?: { search?: string; supplierId?: string }) =>
  api.get<AvailableEnquiryItemDto[]>('/enquiries/available-items', { params }).then(r => r.data),
```

---

### B3. Rewrite `CreateEnquiryPage.tsx` — multi-step with supplier-first flow
**File:** `src/features/enquiries/pages/CreateEnquiryPage.tsx` *(MODIFY)*

Multi-step using the existing `MultiStepForm` component:

**Step 1 — Enquiry type + basic details:**
- Radio/toggle: General | Item-Specific
- Fields: Title, Notes, Due Date

**Step 2 (Item-Specific only) — Select Supplier:**
- `<Select>` from customer's mapped supplier list (`suppliersApi.list()`)
- `canProceed`: supplier selected

**Step 3 (Item-Specific only) — Add Items:**
- Loads `enquiryApi.availableItems({ supplierId })` (filtered by `CustomerSupplierItem` mapping)
- Each item row: checkbox to select + quantity input
- If item `hasVariants = true`:
  - Clicking "Add" / checking opens `VariantQuantityDialog`
  - `quantity` on parent = `SUM(selected variants)`
  - Variant rows stored in `items[].variants[]`
- `canProceed`: at least one item added

**Step 4 — Review + Submit:**
- Summary: Type | Supplier (if ItemSpecific) | Title | Item count
- On submit: `enquiryApi.create({ enquiryType, supplierId?, title, notes, items })`

**General flow (Step 1 → Step 4 directly):**
- No supplier, no items — skip Steps 2 & 3
- Form schema adapts: `supplierId` and `items` not required for General

---

### B4. Update `EnquiryDetailPage.tsx` — variant breakdown
**File:** `src/features/enquiries/pages/EnquiryDetailPage.tsx` *(MODIFY)*

Items table:
- Parent row: Item Name | Supplier | Qty (aggregated) | Notes
- Expandable sub-rows: Variant (dimensionSummary) | SKU | Qty

```tsx
// DTO shape expected from API:
interface EnquiryItemDto {
  id: string
  supplierItemId: string
  resolvedName: string
  supplierName: string
  quantity: number          // aggregated
  notes?: string
  variants: {               // empty array if no variants
    id: string
    supplierItemVariantId: string
    dimensionSummary: string
    sku?: string
    quantity: number
  }[]
}
```

---

### B5. Update `CreateRFQPage.tsx` — variant support on items
**File:** `src/features/rfqs/pages/CreateRFQPage.tsx` *(MODIFY)*

When loading enquiry items (Step 2), items now carry `hasVariants` and pre-populated `variants[]` from the enquiry. If the user adds items manually (no enquiry), variant selection via `VariantQuantityDialog` applies here too.

---

### B6. Add variant breakdown to `RFQDetailPage.tsx` + `QuotationDetailPage.tsx`
Same expandable-row pattern as `EnquiryDetailPage`:
- Parent row shows aggregated qty
- Expanded rows show per-variant qty (and per-variant unit price for quotation)

---

## Verification

| # | Steps | Expected |
|---|-------|----------|
| 1 | My Items page (Customer) | Lists aliases; resolved names shown; Add/Edit/Remove work |
| 2 | Customer opens Create Enquiry → General | Skips supplier/items steps; submitted with no items |
| 3 | Customer opens Create Enquiry → Item-Specific | Step 2 shows supplier picker |
| 4 | Select Supplier A | Step 3 shows only Supplier A items (CustomerSupplierItem filtered) |
| 5 | Select item WITH variants | VariantQuantityDialog opens; cannot confirm with 0 qty on all variants |
| 6 | Select M6:10, M8:20 → Confirm | Parent row shows Qty=30; two variant rows stored |
| 7 | Enquiry detail | Parent row aggregated; expand shows M6:10 + M8:20 |
| 8 | Item without variants | Direct qty input, no dialog |
| 9 | Customer sets CustomName "M8 Bolt" | Create Enquiry item picker shows "M8 Bolt" for that customer |
| 10 | Supplier views same item | Sees original supplier item name, no alias |
