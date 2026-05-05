# Implementation Status — Indenting Agent

**Last Updated:** 2026-05-05  
**Current Phase:** MVP Core Features + Gap Closure

---

## ✅ COMPLETED

### MVP Core Features
- [x] **Authentication & Authorization** — JWT + Refresh tokens, role-based access control (Admin, Customer, Supplier)
- [x] **Multi-tenancy** — Row-level isolation via TenantId global query filter
- [x] **Enquiry Module** — Create, browse, detail with item management
- [x] **RFQ Module** — Create from enquiry, multi-supplier support (per-supplier split), send to suppliers
- [x] **Quotation Module** — Supplier response to RFQ, revision tracking, accept/reject workflow
- [x] **Purchase Order Module** — Customer creates from quotation, confirmation workflow
- [x] **Proforma Invoice Module** — Supplier creates from accepted quotation, versioning
- [x] **Delivery Order Module** — Delivery tracking, item-level delivery
- [x] **Payment Module** — Record payments, link to source (PO, PI, DO)
- [x] **Document Numbering** — Per-tenant, per-type counter with sequential formatting (e.g., RFQ-2026-0042)
- [x] **Soft Delete** — IsDeleted flag with global query filter on all entities
- [x] **Notifications** — SignalR real-time events for status changes
- [x] **SignalR Integration** — Async notification delivery to connected clients

### Recent Session Additions
- [x] **Attachment System** — Upload, download, delete for all voucher types (Enquiry → DO)
- [x] **Role-Differentiated Attachments** — Supplier/Customer uploads with ownership-based delete
- [x] **File Storage** — Configurable path `/file_uploads/{tenantId}/{entityType}/{entityId}/`
- [x] **Monetary Fields** — All vouchers (RFQ, Quotation, PO, PI, DO) support unit price + total
- [x] **Item Variants** — DO and PI item-level variants with tracking
- [x] **Priority Levels** — Enquiry and RFQ support priority classification
- [x] **Money Calculator** — Precise monetary calculation service (reusable across all vouchers)
- [x] **Payment Supplier UI** — Suppliers can see payment records sent by customers

### Database & Infrastructure
- [x] **EF Core Migrations** — All schema changes applied (initial + 30+ incremental migrations)
- [x] **SQL Server 2022** — Full schema implemented via Code-First
- [x] **Query Filters** — Global tenant isolation + soft delete filters
- [x] **Indexes** — Applied for performance-critical queries
- [x] **SignalR Hubs** — NotificationHub for push notifications
- [x] **Token Service** — JWT generation + refresh token validation
- [x] **Authentication Middleware** — Bearer token validation on all protected endpoints

### Frontend
- [x] **React 18 + TypeScript** — Full type safety, Vite HMR
- [x] **TanStack Router** — File-based routing with protected routes
- [x] **TanStack Query v5** — Server state management with auto-caching
- [x] **Zustand** — Global auth + notification state
- [x] **shadcn/ui** — Pre-built components (Button, Badge, Dialog, etc.)
- [x] **React Hook Form + Zod** — Form validation with runtime type-checking
- [x] **TanStack Table v8** — Data grids for browse pages
- [x] **Layout System** — AuthLayout (login), AppShell (authenticated), PrintLayout
- [x] **Navigation** — Role-specific nav (Admin, Customer, Supplier with different links)
- [x] **Pages Implemented:**
  - Enquiry (create, browse, detail with attachments)
  - RFQ (create, browse, detail, send to suppliers)
  - Quotation (create, browse, detail, revision)
  - PO (create, browse, detail)
  - PI (create, browse, detail)
  - DO (create, browse, detail with attachments)
  - Payment (browse, detail — supplier UI added)
  - Attachments (upload, download, delete with role badges)

---

## ⏳ REMAINING — Gap Closure (From Analysis)

### Gap-2: Notification Endpoints (SMALL — 1-2 days)
**Status:** Partially done (GET /notifications, POST /{id}/read exist)

**Backend missing:**
- [ ] `GetUnreadNotificationCountQuery.cs` — Count unread notifications for current user
- [ ] `MarkAllNotificationsReadCommand.cs` — Mark all as read in one request
- [ ] NotificationsController endpoints: `GET /unread-count`, `POST /read-all`

**Frontend missing:**
- [ ] notificationsApi.ts — `getUnreadCount()`, `markAllRead()` methods
- [ ] notificationStore.ts — Load unread count on app init
- [ ] UI badge/notification counter in AppShell

**Effort:** 1 backend + 1 frontend day

---

### Gap-1: User & Role Management (MEDIUM — 3-4 days)
**Status:** Domain partial (User entity exists; missing `Reactivate()`)

**Backend missing:**
- [ ] User.Reactivate() method in User.cs
- [ ] BrowseUsersQuery + GetUserDetailQuery
- [ ] CreateUserCommand, UpdateUserCommand, DeleteUserCommand, ActivateUserCommand
- [ ] UsersController with CRUD endpoints
- [ ] Password change/reset workflow (optional for MVP)

**Frontend missing:**
- [ ] Users page (browse with search, filter by role)
- [ ] Create user form
- [ ] User detail page (edit, activate/deactivate)
- [ ] Users API client

**Effort:** 2 backend + 2 frontend days

---

### Gap-4: Delivery Order Lot Tracking (MEDIUM — 3-4 days)
**Status:** Domain/DB/API all missing

**Backend missing:**
- [ ] DeliveryOrderLot domain entity (ID, DOId, LotNumber, Quantity, Status, ReceivedAt)
- [ ] EF Core migration
- [ ] Configuration + global query filter
- [ ] Lot-level tracking in CreateDeliveryOrderCommand
- [ ] GetLotTrackingQuery (browse lots for a DO)
- [ ] UpdateLotStatusCommand (mark lot as received)
- [ ] DeliveryOrdersController endpoints: `GET /{id}/lots`, `PATCH /lots/{id}/status`

**Frontend missing:**
- [ ] Lot tracking grid on DO detail page
- [ ] Lot status UI (pending, in-transit, received)
- [ ] Update lot status modal/form
- [ ] Visual timeline or progress bar per lot

**Effort:** 2 backend + 2 frontend days

---

## ⏳ REMAINING — Architecture Features (From tasks.md)

### P1: Multi-Supplier RFQ (Architecture)
Currently: single SupplierId per RFQ  
Target: RFQSupplier join table for N:N relationship

**Completed:** Per-supplier split (API returns separate quotations per supplier)  
**Missing:** Schema restructure for true multi-supplier RFQ in DB

---

### P4: Logging Behavior
- [ ] LoggingBehavior.cs — Log handler execution time + name via ILogger

---

### P5: Rate Limiting
- [ ] Add rate limiter to Program.cs (10 req/min on /auth/*, sliding window on others)

---

### P1: Quotation Comparison Page
- [ ] GetRFQComparisonQuery — Side-by-side item prices from all quotations for an RFQ
- [ ] Frontend comparison grid

---

### P3: Dashboards
- [ ] AdminDashboard — open RFQs, pending POs, overdue payments, active suppliers
- [ ] CustomerDashboard — open RFQs, accepted POs, pending payments
- [ ] SupplierDashboard — open quotations, pending PIs, upcoming DOs

---

### P4: Docker
- [ ] Dockerfile for API (multi-stage .NET)
- [ ] Dockerfile for frontend (Node build → nginx)
- [ ] docker-compose.yml with api, web, db services
- [ ] nginx config with reverse proxy

---

## Git Commits (Current Session)

```
1ab56a8 feat: implement comprehensive voucher and attachment features
98aea20 feat: implement role-differentiated attachment management
33bbeb9 feat: add role badges and ownership-based delete controls to AttachmentPanel
```

---

## Next Steps (Priority Order)

1. **Gap-2 (Notifications)** — Quickest win, enables real-time notification badge
2. **Gap-1 (User Management)** — Unblocks admin users to manage other users
3. **Gap-4 (Lot Tracking)** — Completes DO workflow
4. Dockerize + deploy
5. Quotation comparison + dashboards (lower priority for MVP)

---

## Architecture Decisions (Locked)

- **CQRS:** Commands through EF Core, Queries through Dapper (read-optimized)
- **Multi-tenancy:** Row-level via global query filter + TenantId check
- **Soft Delete:** IsDeleted flag with global filter, no hard deletes in prod
- **Versioning:** Quotation + PI use header+versions pattern for audit trail
- **Notifications:** SignalR for push, Notification table for history
- **Attachments:** Polymorphic (EntityType+EntityId), role-based delete
- **Authentication:** JWT + Refresh tokens, claims-based authorization

