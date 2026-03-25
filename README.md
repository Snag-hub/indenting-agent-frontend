# Indenting Agent — Frontend

B2B procurement platform frontend built with React 19, TypeScript, and Vite.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | React 19 + TypeScript 5.9 |
| Build | Vite 8 |
| Routing | TanStack Router (file-based) |
| Server State | TanStack Query v5 |
| Tables | TanStack Table v8 |
| Client State | Zustand (with localStorage persist) |
| Forms | React Hook Form + Zod |
| UI Components | shadcn/ui (Radix UI + Tailwind CSS) |
| Styling | Tailwind CSS v4 |
| HTTP | Axios (JWT interceptor + refresh retry) |
| Icons | Lucide React |

## Project Structure

```
src/
├── components/
│   └── ui/                         # shadcn/ui primitives
│       ├── button.tsx              #   CVA-based button with variants
│       ├── input.tsx               #   Text input
│       ├── label.tsx               #   Form label
│       └── dialog.tsx              #   Modal dialog (Radix)
├── features/
│   └── catalog/
│       ├── api/
│       │   ├── categoryApi.ts      # Category CRUD + tree API calls
│       │   └── itemApi.ts          # Item CRUD + paginated list API calls
│       └── schemas/
│           └── categorySchema.ts   # Zod validation schema
├── layouts/
│   ├── AppShell.tsx                # Main layout: sidebar + navbar + outlet
│   └── AuthLayout.tsx              # Centered card layout for login
├── lib/
│   ├── api.ts                      # Axios instance + JWT interceptor
│   ├── queryKeys.ts                # TanStack Query key factory
│   └── utils.ts                    # cn() utility (clsx + tailwind-merge)
├── routes/                         # TanStack Router file-based routes
│   ├── __root.tsx                  # Root route
│   ├── index.tsx                   # / → redirect to /dashboard or /login
│   ├── _auth.tsx                   # Auth layout (redirects if logged in)
│   ├── _auth.login.tsx             # Login page
│   ├── _app.tsx                    # Protected layout (redirects if not logged in)
│   ├── _app.dashboard.tsx          # Dashboard page
│   ├── _app.catalog.categories.tsx # Category tree management
│   └── _app.catalog.items.tsx      # Paginated item table with CRUD
├── stores/
│   ├── authStore.ts                # User, tokens (persisted to localStorage)
│   └── uiStore.ts                  # Sidebar state (persisted to localStorage)
├── types/
│   └── api.ts                      # PagedResult<T>, ProblemDetails
├── main.tsx                        # Entry: QueryClientProvider + RouterProvider
├── index.css                       # Tailwind v4: @import "tailwindcss"
└── routeTree.gen.ts                # AUTO-GENERATED — do not edit
```

## Prerequisites

- Node.js 20+
- npm

## Getting Started

```bash
# 1. Clone
git clone https://github.com/Snag-hub/indenting-agent-frontend.git
cd indenting-agent-frontend

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env

# 4. Start development server
npm run dev
```

The app starts at `http://localhost:5173`. The backend API must be running at `http://localhost:5163`.

## Environment Variables

**`.env.example`**

```
VITE_API_BASE_URL=http://localhost:5163/api/v1
VITE_SIGNALR_BASE_URL=http://localhost:5163
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |

## Routing

Routes are **file-based** using `@tanstack/router-plugin`. The Vite plugin scans `src/routes/` and auto-generates `routeTree.gen.ts`.

### Route Guards

| Layout | Behavior |
|--------|----------|
| `_auth` | If user is already logged in → redirect to `/dashboard` |
| `_app` | If user is not logged in → redirect to `/login` |

### Current Routes

| Route | Layout | Description |
|-------|--------|-------------|
| `/` | — | Redirects to `/login` or `/dashboard` |
| `/login` | `_auth` | Login form (email + password) |
| `/dashboard` | `_app` | Welcome page with user info |
| `/catalog/categories` | `_app` | Category tree with CRUD dialogs |
| `/catalog/items` | `_app` | Paginated item table with CRUD dialogs |

## State Management

### authStore (`src/stores/authStore.ts`)

Persisted to `localStorage` as `"auth"`.

| Property | Type | Description |
|----------|------|-------------|
| `user` | `UserInfo \| null` | Current user (id, fullName, email, role) |
| `accessToken` | `string \| null` | JWT access token |
| `refreshToken` | `string \| null` | Refresh token |
| `setTokens()` | function | Store login response |
| `clearAuth()` | function | Clear on logout |

### uiStore (`src/stores/uiStore.ts`)

Persisted to `localStorage` as `"ui"`.

| Property | Type | Description |
|----------|------|-------------|
| `sidebarCollapsed` | `boolean` | Sidebar visibility |
| `toggleSidebar()` | function | Toggle sidebar |

## API Client

**`src/lib/api.ts`** — Axios instance with two interceptors:

1. **Request interceptor**: Attaches `Authorization: Bearer <token>` from `authStore`
2. **Response interceptor**: On 401, attempts token refresh → retries original request. On refresh failure, clears auth and redirects to `/login`. Queues concurrent requests during refresh to avoid duplicate refresh calls.

## Data Flow & Debugging Guide

### Login Flow

```
User submits email + password
  │
  ▼
src/routes/_auth.login.tsx
  │  React Hook Form + Zod validates input
  │  Calls api.post('/auth/login', { email, password })
  │
  ▼
src/lib/api.ts
  │  Axios POST to http://localhost:5163/api/v1/auth/login
  │  (no Bearer token — login is unauthenticated)
  │
  ▼
Backend returns { accessToken, refreshToken, expiresAt, user }
  │
  ▼
src/stores/authStore.ts
  │  setTokens(accessToken, refreshToken, user)
  │  Persisted to localStorage under key "auth"
  │
  ▼
src/routes/_auth.login.tsx
  │  router.navigate({ to: '/dashboard' })
  │
  ▼
src/routes/_app.tsx
  │  beforeLoad: checks authStore — token exists, allows access
  │  Renders AppShell layout
  │
  ▼
src/layouts/AppShell.tsx
  │  Renders sidebar (role-based menu), navbar (user info, logout), <Outlet />
  │
  ▼
src/routes/_app.dashboard.tsx
  │  Displays welcome message with user.fullName and user.role
```

### Load Categories Flow

```
User navigates to /catalog/categories
  │
  ▼
src/routes/_app.catalog.categories.tsx
  │  useQuery({ queryKey: queryKeys.catalog.categoryTree(), queryFn: ... })
  │
  ▼
src/lib/queryKeys.ts
  │  Returns ['catalog', 'categories', 'tree'] as cache key
  │
  ▼
src/features/catalog/api/categoryApi.ts
  │  getCategoryTree() → api.get('/catalog/categories/tree')
  │
  ▼
src/lib/api.ts
  │  Request interceptor attaches Bearer token from authStore
  │  Axios GET to http://localhost:5163/api/v1/catalog/categories/tree
  │
  ▼
Backend returns CategoryTreeNodeDto[] (recursive tree)
  │
  ▼
src/routes/_app.catalog.categories.tsx
  │  Renders expandable tree with Create/Edit/Delete dialogs
  │  On mutation success: queryClient.invalidateQueries(['catalog', 'categories'])
  │  → triggers automatic re-fetch
```

### Create Item Flow

```
User clicks "Add Item" on /catalog/items
  │
  ▼
src/routes/_app.catalog.items.tsx
  │  Opens dialog with form (React Hook Form + Zod)
  │  On submit: calls createItem({ name, categoryId, description })
  │
  ▼
src/features/catalog/api/itemApi.ts
  │  createItem(data) → api.post('/catalog/items', data)
  │
  ▼
src/lib/api.ts
  │  Axios POST with Bearer token
  │
  ▼
Backend returns new item GUID
  │
  ▼
src/routes/_app.catalog.items.tsx
  │  onSuccess: queryClient.invalidateQueries(queryKeys.catalog.items._def)
  │  → TanStack Query re-fetches the paginated item list
  │  → Table re-renders with new item
```

### 401 Token Refresh Flow

```
Any API call returns HTTP 401
  │
  ▼
src/lib/api.ts (response interceptor)
  │  Checks: is this already a retry? (_retry flag)
  │  If not:
  │    1. Sets _retry = true
  │    2. Queues any concurrent requests (isRefreshing flag)
  │    3. POST /api/v1/auth/refresh with current refreshToken
  │
  ▼
Backend returns new { accessToken, refreshToken }
  │
  ▼
src/stores/authStore.ts
  │  setTokens(newAccessToken, newRefreshToken, existingUser)
  │
  ▼
src/lib/api.ts
  │  Retries original failed request with new Bearer token
  │  Processes queued requests with new token
  │
  ── OR if refresh also fails ──
  │
  ▼
src/stores/authStore.ts
  │  clearAuth() — removes user and tokens
  │
  ▼
window.location.href = '/login'
```

## Pages

### Login (`/login`)
- Email + password form with Zod validation
- Calls backend `/auth/login`, stores JWT in Zustand
- Redirects to `/dashboard` on success

### Dashboard (`/dashboard`)
- Welcome message showing `user.fullName` and `user.role`
- Starting point after login

### Categories (`/catalog/categories`)
- Expandable tree view of categories (parent-child hierarchy)
- Create/Edit dialogs with name input
- Soft-delete with confirmation
- Admin-only create/edit/delete actions

### Items (`/catalog/items`)
- Paginated table with server-side pagination
- Columns: Name, Category, Status, Created
- Create/Edit dialogs with name, category, description
- Soft-delete with confirmation
- Status badges (Active/Inactive)
- Admin-only create/edit/delete actions

## AppShell Sidebar

The sidebar in `src/layouts/AppShell.tsx` shows different navigation menus based on user role:

| Role | Menu Items |
|------|-----------|
| **Admin** | Dashboard, Categories, Items, Customers, Suppliers, Item Mapping, Users, Settings |
| **Customer** | Dashboard, Enquiries, RFQs, Purchase Orders, Deliveries, Payments, Tickets, Settings |
| **Supplier** | Dashboard, My Items, RFQ Responses, Quotations, Proforma Invoices, Delivery Orders, Tickets, Settings |

> Note: Only Dashboard, Categories, and Items are functional in Phase 1. Other menu items are placeholders for future phases.
