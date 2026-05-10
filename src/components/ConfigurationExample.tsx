import {
  usePriorities,
  useStatuses,
  useRoles,
  useEnquiryTypes,
  useStatusesMap,
  usePrioritiesMap,
} from '@/hooks/useConfiguration'

/**
 * Example component demonstrating configuration hook usage
 * Shows how to build dynamic dropdowns, badges, and filters
 * from database-driven configuration values
 */
export function ConfigurationExample() {
  const { data: priorities, isLoading: prioritiesLoading } = usePriorities()
  const { data: rfqStatuses, isLoading: statusesLoading } = useStatuses('RFQ')
  const { data: roles, isLoading: rolesLoading } = useRoles()
  const { data: enquiryTypes, isLoading: enquiryLoading } = useEnquiryTypes()

  const { priorityMap } = usePrioritiesMap()
  const { statusMap } = useStatusesMap('RFQ')

  const isLoading =
    prioritiesLoading || statusesLoading || rolesLoading || enquiryLoading

  if (isLoading) {
    return <div className="p-4">Loading configuration...</div>
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Configuration Example</h1>

      {/* Priorities Dropdown */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Priorities</h2>
        <select className="border rounded px-3 py-2 w-full max-w-xs">
          <option value="">Select Priority</option>
          {priorities?.map((p) => (
            <option key={p.id} value={p.name}>
              {p.displayName}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-600">
          Loaded {priorities?.length} priorities from database
        </p>
      </section>

      {/* Priority Badges */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Priority Badges</h2>
        <div className="flex gap-2 flex-wrap">
          {priorities?.map((p) => (
            <span
              key={p.id}
              className={`px-3 py-1 rounded text-sm font-medium ${
                p.name === 'Critical'
                  ? 'bg-red-100 text-red-800'
                  : p.name === 'High'
                    ? 'bg-orange-100 text-orange-800'
                    : p.name === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
              }`}
            >
              {p.displayName}
            </span>
          ))}
        </div>
      </section>

      {/* RFQ Statuses Dropdown */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">RFQ Statuses</h2>
        <select className="border rounded px-3 py-2 w-full max-w-xs">
          <option value="">Select Status</option>
          {rfqStatuses?.map((s) => (
            <option key={s.id} value={s.name}>
              {s.displayName}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-600">
          Loaded {rfqStatuses?.length} RFQ statuses
        </p>
      </section>

      {/* Roles Radio Buttons */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">User Roles</h2>
        <div className="space-y-2">
          {roles?.map((r) => (
            <label key={r.id} className="flex items-center gap-2">
              <input type="radio" name="role" value={r.name} />
              <span>{r.displayName}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Enquiry Types Checkboxes */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Enquiry Types</h2>
        <div className="space-y-2">
          {enquiryTypes?.map((e) => (
            <label key={e.id} className="flex items-center gap-2">
              <input type="checkbox" value={e.name} />
              <span>{e.displayName}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Map-based lookup example */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Map-based Lookup</h2>
        {priorityMap && statusMap && (
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <p>
              <strong>Draft Status ID:</strong> {statusMap['Draft']?.id}
            </p>
            <p>
              <strong>High Priority ID:</strong> {priorityMap['High']?.id}
            </p>
            <p className="text-sm text-gray-600">
              Using map-based lookups for faster O(1) access instead of
              searching arrays
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
