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
