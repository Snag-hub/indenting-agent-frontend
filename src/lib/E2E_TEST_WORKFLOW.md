# End-to-End Test Workflow: Configuration Framework

Complete testing workflow to verify the configuration system works across all layers.

## Prerequisites

- ✅ Backend rebuilt and running on http://localhost:5163
- ✅ Frontend running on http://localhost:5173
- ✅ Database seeded with configuration data
- ✅ ConfigurationProvider integrated into main.tsx

## Test 1: API Endpoints

### Test 1a: Get All Entity Types
```bash
curl -s http://localhost:5163/api/v1/configuration/entity-types | jq '.[] | {id, name, displayName}'
```

Expected response:
```json
[
  { "id": 1, "name": "Status", "displayName": "Status" },
  { "id": 2, "name": "Priority", "displayName": "Priority" },
  { "id": 3, "name": "Role", "displayName": "Role" },
  ...
]
```

### Test 1b: Get Priorities
```bash
curl -s http://localhost:5163/api/v1/configuration/priorities | jq '.[] | {name, displayName}'
```

Expected response:
```json
[
  { "name": "Low", "displayName": "Low" },
  { "name": "Medium", "displayName": "Medium" },
  { "name": "High", "displayName": "High" },
  { "name": "Critical", "displayName": "Critical" }
]
```

### Test 1c: Get RFQ Statuses
```bash
curl -s http://localhost:5163/api/v1/configuration/statuses/RFQ | jq '.[] | {name, displayName}'
```

Expected response:
```json
[
  { "name": "Draft", "displayName": "Draft" },
  { "name": "Submitted", "displayName": "Submitted" },
  { "name": "Under Review", "displayName": "Under Review" },
  { "name": "Responded", "displayName": "Responded" },
  { "name": "Closed", "displayName": "Closed" }
]
```

✅ **All endpoints must return HTTP 200 with valid data**

---

## Test 2: Frontend Hooks (Direct Usage)

Create a test component to verify hooks work:

```typescript
// src/components/ConfigurationTest.tsx
import { usePriorities, useStatuses, useRoles } from '@/hooks/useConfiguration'

export function ConfigurationTest() {
  const { data: priorities, isLoading: prioritiesLoading } = usePriorities()
  const { data: statuses, isLoading: statusesLoading } = useStatuses('RFQ')
  const { data: roles, isLoading: rolesLoading } = useRoles()

  const isLoading = prioritiesLoading || statusesLoading || rolesLoading

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Configuration Hook Test</h1>
      
      {isLoading && <p>Loading...</p>}
      
      {!isLoading && (
        <>
          <div>
            <h2 className="font-bold">Priorities ({priorities?.length})</h2>
            <ul>
              {priorities?.map(p => <li key={p.id}>{p.displayName}</li>)}
            </ul>
          </div>
          
          <div>
            <h2 className="font-bold">RFQ Statuses ({statuses?.length})</h2>
            <ul>
              {statuses?.map(s => <li key={s.id}>{s.displayName}</li>)}
            </ul>
          </div>
          
          <div>
            <h2 className="font-bold">Roles ({roles?.length})</h2>
            <ul>
              {roles?.map(r => <li key={r.id}>{r.displayName}</li>)}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
```

Verification:
- ✅ Page loads without errors
- ✅ All 4 priorities displayed
- ✅ All 5 RFQ statuses displayed
- ✅ All 3 roles displayed
- ✅ No loading spinner after 2 seconds

---

## Test 3: Configuration Context Provider

Verify global context works:

```typescript
// src/components/ConfigurationContextTest.tsx
import { useConfigurationContext } from '@/lib/configurationContext'

export function ConfigurationContextTest() {
  const { priorities, roles, enquiryTypes, isLoading } = useConfigurationContext()

  if (isLoading) return <div>Loading configuration...</div>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Configuration Context Test</h1>
      
      <div>
        <h2>Priorities from Context: {priorities?.length}</h2>
        <p>{priorities?.map(p => p.displayName).join(', ')}</p>
      </div>
      
      <div>
        <h2>Roles from Context: {roles?.length}</h2>
        <p>{roles?.map(r => r.displayName).join(', ')}</p>
      </div>
      
      <div>
        <h2>Enquiry Types from Context: {enquiryTypes?.length}</h2>
        <p>{enquiryTypes?.map(e => e.displayName).join(', ')}</p>
      </div>
    </div>
  )
}
```

Verification:
- ✅ Component renders without ConfigurationProvider error
- ✅ Data loads once (check React Query DevTools)
- ✅ Data is shared across multiple usages
- ✅ No duplicate API calls

---

## Test 4: Map-Based Lookups

Verify performance optimization:

```typescript
// src/components/ConfigurationMapTest.tsx
import { usePrioritiesMap, useStatusesMap } from '@/hooks/useConfiguration'

export function ConfigurationMapTest() {
  const { priorityMap } = usePrioritiesMap()
  const { statusMap } = useStatusesMap('RFQ')

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Configuration Map Test</h1>
      
      {priorityMap && (
        <div>
          <h2>Direct Lookups (O(1) access):</h2>
          <ul>
            <li>High Priority ID: {priorityMap['High']?.id}</li>
            <li>Critical Priority ID: {priorityMap['Critical']?.id}</li>
            <li>Low Priority ID: {priorityMap['Low']?.id}</li>
          </ul>
        </div>
      )}
      
      {statusMap && (
        <div>
          <h2>Status Lookups:</h2>
          <ul>
            <li>Draft Status ID: {statusMap['Draft']?.id}</li>
            <li>Submitted Status ID: {statusMap['Submitted']?.id}</li>
            <li>Closed Status ID: {statusMap['Closed']?.id}</li>
          </ul>
        </div>
      )}
    </div>
  )
}
```

Verification:
- ✅ All lookups return valid objects
- ✅ IDs are numeric and non-zero
- ✅ displayName matches name or is set

---

## Test 5: Dropdown Implementation

Test real-world usage in a form:

```typescript
// src/components/PrioritySelectTest.tsx
import { useState } from 'react'
import { usePriorities } from '@/hooks/useConfiguration'

export function PrioritySelectTest() {
  const { data: priorities, isLoading } = usePriorities()
  const [selectedPriority, setSelectedPriority] = useState('')

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Priority Select Test</h1>
      
      <div>
        <label className="block text-sm font-medium mb-2">Select Priority</label>
        <select 
          value={selectedPriority} 
          onChange={e => setSelectedPriority(e.target.value)}
          disabled={isLoading}
          className="border rounded px-3 py-2"
        >
          <option value="">-- Select --</option>
          {priorities?.map(p => (
            <option key={p.id} value={p.name}>
              {p.displayName}
            </option>
          ))}
        </select>
      </div>
      
      {selectedPriority && (
        <div className="bg-blue-100 p-4 rounded">
          <p>Selected: <strong>{selectedPriority}</strong></p>
          <p>ID: {priorities?.find(p => p.name === selectedPriority)?.id}</p>
        </div>
      )}
    </div>
  )
}
```

Verification:
- ✅ Dropdown loads and populates
- ✅ Selection updates state
- ✅ Selected value persists
- ✅ No console errors

---

## Test 6: Database Change Verification

Verify configuration updates reflect in UI:

1. **In Database:**
   ```sql
   -- Add new priority
   INSERT INTO EntityGroupParameters 
   (EntityGroupId, EntityParameterId, DisplayOrder, TenantId, IsActive, CreatedAt, UpdatedAt)
   VALUES (
     (SELECT id FROM EntityGroups WHERE name='Global' AND entity_type_id=2),
     (SELECT id FROM EntityParameters WHERE name='Urgent'),
     5, 
     '[current-tenant-id]',
     1,
     GETUTCDATE(),
     GETUTCDATE()
   )
   ```

2. **Clear Browser Cache:**
   - DevTools → Application → Clear All Site Data
   - OR wait 1 hour for cache to expire

3. **Reload Page:**
   - Priority dropdown should show new "Urgent" priority
   - React Query DevTools should show new query timestamp

Verification:
- ✅ New priority appears in dropdown
- ✅ Dropdown still works correctly
- ✅ No console errors

---

## Test 7: Browser DevTools Inspection

Verify React Query caching:

1. **Install React Query DevTools Extension:**
   - https://github.com/TanStack/query/releases

2. **Open DevTools:**
   - Click React Query icon
   - Expand `configuration` section
   - Should see queries:
     - `["config","entity-types"]` - Fresh
     - `["config","priorities"]` - Fresh
     - `["config","roles"]` - Fresh
     - `["config","enquiry-types"]` - Fresh

3. **Verify Cache Behavior:**
   - Navigate away and back
   - Queries show "Stale" (not "Fresh")
   - Background refetch visible

Verification:
- ✅ Queries appear in correct namespace
- ✅ 1-hour stale time observed
- ✅ No duplicate requests

---

## Test 8: Error Handling

Test network error scenarios:

```typescript
// Manually test 404 scenario
const { data } = await configurationApi.getParameter('Status', 'NonExistent')
// Should return null, not throw
console.log(data) // null
```

Stop the API server and reload:
- Page should show loading spinner
- After timeout, should show "Failed to load configuration"
- Should not crash or show blank page

Verification:
- ✅ 404 returns null gracefully
- ✅ Network error doesn't crash UI
- ✅ Retry logic works

---

## Test 9: Multiple Component Usage

Verify data is cached and shared:

Create 3 separate components on same page:
- ConfigurationTest (from Test 2)
- ConfigurationContextTest (from Test 3)
- PrioritySelectTest (from Test 5)

Open React Query DevTools and verify:
- Only ONE query per configuration type
- All components receive same data
- No duplicate API calls

Verification:
- ✅ Single query serves all components
- ✅ Data is properly cached
- ✅ No redundant network traffic

---

## Test 10: Performance Baseline

Measure query performance:

1. Open DevTools Network tab
2. Hard refresh (Ctrl+Shift+R)
3. Record metrics:
   - Time to first paint: _____ ms
   - Time to load all configuration: _____ ms
   - Total API calls for configuration: _____
   - Cache hit rate: _____/100%

Expected:
- Hard refresh: ~200-500ms total
- Subsequent navigations: <50ms (cached)
- API calls: 4 (entity-types, priorities, roles, enquiry-types)

Verification:
- ✅ Initial load completes in <1s
- ✅ Cached loads complete in <100ms
- ✅ Only 4 API calls for all data

---

## Complete Test Checklist

- [ ] Test 1: All API endpoints return 200
- [ ] Test 2: Hooks load and display data
- [ ] Test 3: Context provider shares data
- [ ] Test 4: Map lookups work correctly
- [ ] Test 5: Dropdown selection works
- [ ] Test 6: Database changes reflected
- [ ] Test 7: React Query cache verified
- [ ] Test 8: Error handling works
- [ ] Test 9: Multiple components share data
- [ ] Test 10: Performance acceptable

**When all tests pass: Configuration framework is production-ready! ✅**

---

## Troubleshooting

### API Returns 500
- Rebuild backend with fixed ConfigurationService
- Check if ConfigurationService is registered in DependencyInjection
- Verify database tables exist (EntityTypes, EntityGroups, etc.)

### Hooks Return No Data
- Check if API endpoints work (Test 1)
- Verify React Query DevTools shows correct query keys
- Check if ConfigurationProvider is in component tree

### Context Provider Error
- Ensure ConfigurationProvider wraps all components that use useConfigurationContext
- Check main.tsx has proper setup

### Cache Not Working
- Clear browser cache (DevTools → Application)
- Verify 1-hour stale time in hook definitions
- Check React Query DevTools for query state

### Performance Slow
- Monitor network tab for API call count
- Verify map hooks are used for repeated lookups
- Check for N+1 query patterns in components
