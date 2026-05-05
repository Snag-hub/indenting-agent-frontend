# Frontend Remaining Tasks

## P1 — Multi-Supplier RFQ (depends on backend P1)

**src/features/rfqs/pages/**
- [ ] `CreateRFQPage.tsx` — replace single supplier Select with multi-select supplier picker
- [ ] `RFQDetailPage.tsx` — show supplier badge list instead of single `rfq.supplierName`

**src/features/rfqs/api/**
- [ ] `rfqApi.ts` — update `RFQDetailDto` to `suppliers: { id: string; name: string }[]`

---

## P2 — Enquiry → RFQ Workflow

**src/features/enquiries/pages/**
- [ ] `EnquiryDetailPage.tsx` — add "Create RFQ" button (visible when status is Open/Submitted), navigates to `/rfqs/new?enquiryId=<id>`

**src/routes/**
- [ ] `_app.rfqs.new.tsx` — add `enquiryId?: string` to search schema

**src/features/rfqs/pages/**
- [ ] `CreateRFQPage.tsx` — read `enquiryId` from search params, pre-fill title + items from enquiry data (useQuery on enquiry)

---

## P3 — Toast Notifications

**/ (frontend root)**
- [ ] `npm install sonner` — lightweight toast library

**src/components/ui/**
- [ ] Create `sonner.tsx` — shadcn-style `<Toaster />` wrapper

**src/app/ or src/main.tsx**
- [ ] Add `<Toaster />` to root component tree

**Key pages to wire up (add `toast.success` / `toast.error` to mutations):**
- [ ] `CreateRFQPage.tsx`
- [ ] `CreateQuotationPage.tsx`
- [ ] `RFQDetailPage.tsx` — Send RFQ action
- [ ] `QuotationDetailPage.tsx` — Accept / Reject actions
- [ ] `ProformaInvoiceDetailPage.tsx` — Send / Acknowledge / Cancel
- [ ] `DeliveryOrderDetailPage.tsx` — Dispatch / Confirm Delivery / Cancel

---

## P1 — Quotation Comparison Page

**src/features/rfqs/pages/**
- [ ] Create `QuotationComparisonPage.tsx` — side-by-side table of supplier quotation prices per item
- [ ] `RFQDetailPage.tsx` — add "Compare Quotations" button (visible when ≥ 2 quotations exist)

**src/routes/**
- [ ] Create `_app.rfqs.$rfqId.comparison.tsx`

---

## P2 — Tickets Module

**src/features/tickets/api/**
- [ ] Create `ticketApi.ts` — `TicketSummaryDto`, `TicketDetailDto`, CRUD + comment functions

**src/features/tickets/pages/**
- [ ] Create `TicketsPage.tsx` — paginated list with status/priority filters
- [ ] Create `CreateTicketPage.tsx` — form with title, description, priority, optional linked entity
- [ ] Create `TicketDetailPage.tsx` — detail view + comments thread

**src/lib/**
- [ ] `queryKeys.ts` — add `tickets` key section

**src/routes/**
- [ ] Create `_app.tickets.tsx`
- [ ] Create `_app.tickets.new.tsx`
- [ ] Create `_app.tickets.$ticketId.tsx`

---

## P3 — Dashboards

**src/features/dashboard/api/**
- [ ] Create `dashboardApi.ts` — fetch `/api/v1/dashboard`, typed by role

**src/features/dashboard/pages/**
- [ ] Create `DashboardPage.tsx` — role-switched: renders Admin / Customer / Supplier KPI cards based on `useAuthStore` role

**src/lib/**
- [ ] `queryKeys.ts` — add `dashboard` key section

---

## P4 — Docker

**/ (frontend root)**
- [ ] Create `Dockerfile` — multi-stage: `node` build stage → `nginx` serve stage

---

## P5 — Print Layouts (PO / PI / DO)

**src/layouts/**
- [ ] Create `PrintLayout.tsx` — minimal layout, hides sidebar/header, `@media print` CSS

**src/features/purchaseOrders/pages/**
- [ ] Create `PurchaseOrderPrintPage.tsx` — printable PO document

**src/features/proformaInvoices/pages/**
- [ ] Create `ProformaInvoicePrintPage.tsx` — printable PI document

**src/features/deliveryOrders/pages/**
- [ ] Create `DeliveryOrderPrintPage.tsx` — printable DO document

**src/routes/**
- [ ] Create `_app.purchase-orders.$id.print.tsx`
- [ ] Create `_app.proforma-invoices.$id.print.tsx`
- [ ] Create `_app.delivery-orders.$id.print.tsx`

---

## P6 — CI/CD

**/ (project root — .github/workflows/)**
- [ ] Create `ci.yml` — on PR: `dotnet build`, `dotnet test`, `npm run build`

---

## Gap-2 — Notification Unread Count & Read-All (depends on backend Gap-2)

> Plan: `docs/plans/gap-closure-users-notifications-lots.md`

**src/features/notifications/api/**
- [ ] `notificationsApi.ts` — add `getUnreadCount()` calling `GET /api/v1/notifications/unread-count`
- [ ] `notificationsApi.ts` — add `markAllRead()` calling `POST /api/v1/notifications/read-all`

**src/stores/**
- [ ] `notificationStore.ts` — on app load / login, fetch unread count from `getUnreadCount()` to seed `unreadCount` in store

**src/components/ or src/features/notifications/**
- [ ] Notification bell / dropdown — wire up "Mark all as read" button to `markAllRead()` mutation + invalidate unread count query

---

## Gap-1 — User & Role Management (depends on backend Gap-1)

> Plan: `docs/plans/gap-closure-users-notifications-lots.md`

**src/features/users/api/**
- [ ] Create `usersApi.ts` — typed functions for all 9 endpoints: `getUsers`, `getUserById`, `createUser`, `updateUser`, `deleteUser`, `activateUser`, `deactivateUser`, `assignRole`, `removeRole`

**src/features/users/pages/**
- [ ] Create `UsersPage.tsx` — paginated table (email, fullName, role badges, active status); "New User" button opens create dialog; per-row: Edit, Activate/Deactivate, Delete
- [ ] Create `UserDetailPage.tsx` — user info card + role chips (add/remove roles)

**src/lib/**
- [ ] `queryKeys.ts` — add `users` query key section

**src/routes/**
- [ ] Create `_app.users.tsx` — users list route (Admin only)
- [ ] Create `_app.users.$userId.tsx` — user detail route (Admin only)

---

## Gap-4 — Delivery Order Lot Tracking (depends on backend Gap-4)

> Plan: `docs/plans/gap-closure-users-notifications-lots.md`

**src/features/deliveryOrders/api/**
- [ ] `deliveryOrderApi.ts` — add lot CRUD functions: `getItemLots`, `addLot`, `updateLot`, `deleteLot`
- [ ] Update `DeliveryOrderItemDto` type to include `lots?: LotDto[]`

**src/features/deliveryOrders/pages/**
- [ ] `DeliveryOrderDetailPage.tsx` — extend each item row with a collapsible "Lots" section:
  - Table: LotNumber, Qty, ManufactureDate, ExpiryDate, Notes, Edit/Delete actions
  - "Add Lot" button (visible to Supplier when DO is not Cancelled/Delivered)

**src/lib/**
- [ ] `queryKeys.ts` — add `deliveryOrderLots` key section
