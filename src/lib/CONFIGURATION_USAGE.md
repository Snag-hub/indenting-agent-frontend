# Configuration API Usage Guide

The configuration system provides database-driven access to all system constants (statuses, priorities, roles, etc.) without hardcoding values.

## Quick Start

### Option 1: Direct Hook Usage (Simplest)

Use individual hooks for specific configuration types:

```typescript
import {
  usePriorities,
  useStatuses,
  useRoles,
  useEnquiryTypes,
} from '@/hooks/useConfiguration'

function MyComponent() {
  const { data: priorities, isLoading } = usePriorities()

  if (isLoading) return <div>Loading...</div>

  return (
    <select>
      {priorities?.map((p) => (
        <option key={p.id} value={p.name}>
          {p.displayName}
        </option>
      ))}
    </select>
  )
}
```

### Option 2: Context Provider (Global)

Wrap your app with `ConfigurationProvider` to make data globally available:

```typescript
// In main.tsx or App.tsx
import { ConfigurationProvider } from '@/lib/configurationContext'

function App() {
  return (
    <ConfigurationProvider>
      <YourAppRoutes />
    </ConfigurationProvider>
  )
}
```

Then use anywhere:

```typescript
import { useConfigurationContext } from '@/lib/configurationContext'

function MyComponent() {
  const { priorities, roles, isLoading } = useConfigurationContext()

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <h2>Priorities: {priorities?.map((p) => p.displayName).join(', ')}</h2>
      <h2>Roles: {roles?.map((r) => r.displayName).join(', ')}</h2>
    </div>
  )
}
```

## Available Hooks

### Basic Hooks

```typescript
// Get all entity types
const { data: entityTypes } = useEntityTypes()
// Result: [{ id: 1, name: 'Status', displayName: 'Status', ... }, ...]

// Get all priorities
const { data: priorities } = usePriorities()
// Result: [{ id: 1, name: 'Low', displayName: 'Low', ... }, ...]

// Get all roles
const { data: roles } = useRoles()
// Result: [{ id: 1, name: 'Admin', displayName: 'Admin', ... }, ...]

// Get all enquiry types
const { data: enquiryTypes } = useEnquiryTypes()
// Result: [{ id: 1, name: 'General', displayName: 'General', ... }, ...]

// Get statuses for a document type
const { data: rfqStatuses } = useStatuses('RFQ')
// Result: [{ id: 1, name: 'Draft', displayName: 'Draft', ... }, ...]

// Get groups for an entity type
const { data: statusGroups } = useGroups('Status')
// Result: [{ id: 1, name: 'RFQ', displayName: 'RFQ', ... }, ...]

// Get parameters for an entity type + group
const { data: rfqStatusParams } = useParameters('Status', 'RFQ')
// Result: [{ id: 1, name: 'Draft', displayName: 'Draft', ... }, ...]

// Get a single parameter
const { data: draftStatus } = useParameter('Status', 'Draft')
// Result: { id: 1, name: 'Draft', displayName: 'Draft', ... }
```

### Convenience Hooks (Map Format)

For easier lookups by name:

```typescript
// Get statuses as a map: { "Draft": {...}, "Submitted": {...}, ... }
const { statusMap, statuses } = useStatusesMap('RFQ')
const draftStatus = statusMap['Draft']

// Get priorities as a map
const { priorityMap, priorities } = usePrioritiesMap()
const highPriority = priorityMap['High']

// Get roles as a map
const { roleMap, roles } = useRolesMap()
const adminRole = roleMap['Admin']
```

## Common Use Cases

### 1. Status Dropdown

```typescript
function StatusSelect({ value, onChange, documentType }) {
  const { data: statuses, isLoading } = useStatuses(documentType)

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {isLoading ? (
        <option>Loading...</option>
      ) : (
        statuses?.map((status) => (
          <option key={status.id} value={status.name}>
            {status.displayName}
          </option>
        ))
      )}
    </select>
  )
}
```

### 2. Priority Badge Component

```typescript
function PriorityBadge({ priority }) {
  const { priorityMap } = usePrioritiesMap()
  const config = priorityMap?.[priority]

  if (!config) return null

  const colorMap = {
    Low: 'bg-blue-100',
    Medium: 'bg-yellow-100',
    High: 'bg-orange-100',
    Critical: 'bg-red-100',
  }

  return (
    <span className={`px-3 py-1 rounded ${colorMap[priority]}`}>
      {config.displayName}
    </span>
  )
}
```

### 3. Filter by Role

```typescript
function RoleFilter() {
  const { data: roles, isLoading } = useRoles()

  if (isLoading) return <div>Loading roles...</div>

  return (
    <div>
      {roles?.map((role) => (
        <label key={role.id}>
          <input type="checkbox" value={role.name} />
          {role.displayName}
        </label>
      ))}
    </div>
  )
}
```

### 4. Enquiry Type Radio Buttons

```typescript
function EnquiryTypeRadio({ value, onChange }) {
  const { data: enquiryTypes } = useEnquiryTypes()

  return (
    <div>
      {enquiryTypes?.map((type) => (
        <label key={type.id}>
          <input
            type="radio"
            name="enquiryType"
            value={type.name}
            checked={value === type.name}
            onChange={(e) => onChange(e.target.value)}
          />
          {type.displayName}
        </label>
      ))}
    </div>
  )
}
```

## Caching Behavior

All configuration queries have a **1-hour stale time**, meaning:

- First fetch: Calls the API
- Within 1 hour: Returns cached data immediately (background refetch)
- After 1 hour of inactivity: Data marked as stale, next fetch calls API

This balances performance (fast UI) with freshness (respects DB changes).

## Type Definitions

```typescript
interface ConfigurationTypeDto {
  id: number
  name: string // 'Status', 'Priority', 'Role', etc.
  displayName: string
  description?: string
  isActive: boolean
}

interface ConfigurationGroupDto {
  id: number
  entityTypeId: number
  name: string // 'RFQ', 'Quotation', 'Global', etc.
  displayName: string
  tenantId: string
  isActive: boolean
}

interface ConfigurationParameterDto {
  id: number
  entityTypeId: number
  name: string // 'Draft', 'Low', 'Admin', etc.
  displayName: string
  displayOrder: number
  isActive: boolean
  metadata?: string // JSON string for custom properties
}
```

## Troubleshooting

### "useConfigurationContext must be used within ConfigurationProvider"

Make sure you've wrapped your app (or at least the component tree) with `<ConfigurationProvider>`:

```typescript
function App() {
  return (
    <ConfigurationProvider>
      <YourRoutes />
    </ConfigurationProvider>
  )
}
```

### Stale data after backend changes

Configuration queries cache for 1 hour. To force a refresh:

```typescript
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'

function MyComponent() {
  const queryClient = useQueryClient()

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.configuration.priorities(),
    })
  }

  return <button onClick={handleRefresh}>Refresh Configuration</button>
}
```

### API returns 500 error

This typically means the backend hasn't been rebuilt with the latest ConfigurationService changes. Rebuild with:

```bash
cd backend
dotnet clean
dotnet build
dotnet run --project src/IndentingAgent.API
```
