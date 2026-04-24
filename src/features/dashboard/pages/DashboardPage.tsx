import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { dashboardApi } from '@/features/dashboard/api/dashboardApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react'

/**
 * DashboardPage — role-aware landing screen shown after login.
 *
 * The backend returns a single unified `DashboardDto { kpis, recentDocuments }`
 * regardless of whether the caller is Admin, Customer, or Supplier.
 * The KPI labels and values are role-specific (e.g. "Open RFQs" for Customers,
 * "Pending PIs" for Suppliers), so the frontend just maps over the `kpis` array
 * without any conditional rendering per role in the cards grid.
 *
 * Quick Actions below the KPIs ARE role-specific and use the JWT role to decide
 * which shortcut buttons to render.
 */
export function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const role = user?.role

  // Single query for all three roles — backend delegates to the correct handler
  const { data: dashboard, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.overview(),
    queryFn: () => dashboardApi.get(),
  })

  // Show skeleton placeholders while KPI data is loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    )
  }

  // Edge case: query succeeded but returned no data (should not happen with a healthy API)
  if (!dashboard) {
    return <div className="text-muted-foreground">Unable to load dashboard data.</div>
  }

  /**
   * Maps the JWT role to a human-readable section label shown in the page
   * description ("Welcome to your Procurement dashboard").
   */
  const getRoleLabel = () => {
    switch (role) {
      case 'Admin': return 'Administration'
      case 'Customer': return 'Procurement'
      case 'Supplier': return 'Sales'
      default: return 'Dashboard'
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Welcome to your ${getRoleLabel()} dashboard`}
      />

      {/*
        KPI Cards — backend returns a flat `kpis[]` array for every role.
        Labels and values are role-specific (e.g. Admin sees "Open RFQs",
        Supplier sees "Pending PIs") but the rendering logic is role-agnostic:
        just map and display whatever the backend sends.
      */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboard.kpis.map((kpi) => (
          <Card key={kpi.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              {kpi.icon && (
                <span className="text-2xl opacity-50">{kpi.icon}</span>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {kpi.valueFormatted ?? kpi.value}
                </div>
                {kpi.trend && (
                  <div className="flex items-center gap-1">
                    {kpi.trend === 'up' && (
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    )}
                    {kpi.trend === 'down' && (
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                    )}
                    {kpi.trend === 'neutral' && (
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    )}
                    {kpi.trendPercent && (
                      <span className={`text-xs font-medium ${kpi.trend === 'up'
                          ? 'text-green-600'
                          : kpi.trend === 'down'
                            ? 'text-red-600'
                            : 'text-muted-foreground'
                        }`}>
                        {Math.abs(kpi.trendPercent)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/*
        Quick Actions — shortcut buttons vary by role.
        Each role gets 4 buttons pointing to the most commonly used sections
        for that persona (Admin → master data, Customer → procurement flow,
        Supplier → sales flow). All roles include the Tickets shortcut.
      */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {role === 'Admin' && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/customers' })}>
                  Customers
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/suppliers' })}>
                  Suppliers
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/catalog/items' })}>
                  Catalog
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/tickets' })}>
                  Tickets
                </Button>
              </>
            )}
            {role === 'Customer' && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/enquiries' })}>
                  Enquiries
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/purchase-orders' })}>
                  PO
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/payments' })}>
                  Payments
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/tickets' })}>
                  Tickets
                </Button>
              </>
            )}
            {role === 'Supplier' && (
              <>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/rfqs' })}>
                  RFQs
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/quotations' })}>
                  Quotations
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/my-items' })}>
                  My Items
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate({ to: '/tickets' })}>
                  Tickets
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
