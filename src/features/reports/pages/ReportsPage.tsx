import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { rfqApi } from '@/features/rfqs/api/rfqApi'
import { quotationApi } from '@/features/quotations/api/quotationApi'
import { purchaseOrderApi } from '@/features/purchaseOrders/api/purchaseOrderApi'
import { reportsApi, type ActivityItemDto } from '@/features/reports/api/reportsApi'
import { queryKeys } from '@/lib/queryKeys'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { format, formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  count: number
  isLoading: boolean
}

function StatCard({ label, count, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div>
          {isLoading ? (
            <Skeleton className="h-10 w-32 mx-auto mb-2" />
          ) : (
            <div className="text-3xl font-bold text-primary mb-2 text-center">{count}</div>
          )}
          <p className="text-sm text-muted-foreground text-center font-medium">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

interface ActionSectionProps {
  title: string
  count: number
  isLoading: boolean
  rows?: React.ReactNode[]
  isEmpty?: boolean
}

function ActionSection({
  title,
  count,
  isLoading,
  rows = [],
  isEmpty = false,
}: ActionSectionProps) {
  if (isEmpty && rows.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline">{count}</Badge>
        </div>
      </CardHeader>
      {isLoading ? (
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      ) : rows.length === 0 ? (
        <CardContent>
          <p className="text-sm text-muted-foreground py-4">No items</p>
        </CardContent>
      ) : (
        <CardContent>
          <div className="space-y-2">{rows}</div>
        </CardContent>
      )}
    </Card>
  )
}

export function ReportsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const role = user?.role

  // Shared queries
  const { data: sentRfqsData, isLoading: isLoadingSentRfqs } = useQuery({
    queryKey: queryKeys.rfqs.list({ status: 'Submitted', pageSize: 50 }),
    queryFn: () => rfqApi.list({ status: 'Submitted', pageSize: 50 }),
  })

  const { data: draftRfqsData, isLoading: isLoadingDraftRfqs } = useQuery({
    queryKey: queryKeys.rfqs.list({ status: 'Draft', pageSize: 50 }),
    queryFn: () => rfqApi.list({ status: 'Draft', pageSize: 50 }),
    enabled: role === 'Customer',
  })

  const { data: submittedQuotationsData, isLoading: isLoadingSubmittedQuotations } = useQuery({
    queryKey: queryKeys.quotations.list({ status: 'Submitted', pageSize: 50 }),
    queryFn: () => quotationApi.list({ status: 'Submitted', pageSize: 50 }),
  })

  const { data: draftQuotationsData, isLoading: isLoadingDraftQuotations } = useQuery({
    queryKey: queryKeys.quotations.list({ status: 'Draft', pageSize: 50 }),
    queryFn: () => quotationApi.list({ status: 'Draft', pageSize: 50 }),
    enabled: role === 'Supplier',
  })

  const { data: acceptedQuotationsData, isLoading: isLoadingAcceptedQuotations } = useQuery({
    queryKey: queryKeys.quotations.list({ status: 'Accepted', pageSize: 50 }),
    queryFn: () => quotationApi.list({ status: 'Accepted', pageSize: 50 }),
    enabled: role === 'Customer',
  })

  const { data: draftPosData, isLoading: isLoadingDraftPos } = useQuery({
    queryKey: queryKeys.pos.list({ status: 'Draft', pageSize: 50 }),
    queryFn: () => purchaseOrderApi.list({ status: 'Draft', pageSize: 50 }),
  })

  const { data: activityData, isLoading: isLoadingActivity } = useQuery({
    queryKey: queryKeys.reports.activity(10),
    queryFn: () => reportsApi.getActivity(10),
  })

  // Customer view
  const customerQuotationsToReview = submittedQuotationsData?.data ?? []
  const customerAcceptedNoPI = acceptedQuotationsData?.data ?? []
  const customerDraftRfqs = draftRfqsData?.data ?? []
  const customerDraftPos = draftPosData?.data ?? []
  // Supplier view
  const supplierRfqsToQuote = sentRfqsData?.data ?? []
  const supplierDraftQuotations = draftQuotationsData?.data ?? []
  const supplierSubmittedQuotations = submittedQuotationsData?.data ?? []
  const supplierDraftPos = draftPosData?.data ?? []

  const actionColor = (action: string): string => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-blue-500'
      case 'update':
        return 'bg-yellow-500'
      case 'delete':
        return 'bg-red-500'
      default:
        return 'bg-slate-400'
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Actions"
        description="What needs your attention"
      />

      {/* Stats Bar */}
      {role === 'Customer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Open Enquiries"
            count={0}
            isLoading={false}
          />
          <StatCard
            label="Pending RFQs"
            count={sentRfqsData?.totalCount ?? 0}
            isLoading={isLoadingSentRfqs}
          />
          <StatCard
            label="Quotations to Review"
            count={customerQuotationsToReview.length}
            isLoading={isLoadingSubmittedQuotations}
          />
          <StatCard
            label="Draft RFQs"
            count={customerDraftRfqs.length}
            isLoading={isLoadingDraftRfqs}
          />
        </div>
      )}

      {role === 'Supplier' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="RFQs to Quote"
            count={supplierRfqsToQuote.length}
            isLoading={isLoadingSentRfqs}
          />
          <StatCard
            label="Draft Quotations"
            count={supplierDraftQuotations.length}
            isLoading={isLoadingDraftQuotations}
          />
          <StatCard
            label="Awaiting Decision"
            count={supplierSubmittedQuotations.length}
            isLoading={isLoadingSubmittedQuotations}
          />
          <StatCard
            label="New POs"
            count={supplierDraftPos.length}
            isLoading={isLoadingDraftPos}
          />
        </div>
      )}

      {/* Action Sections */}
      {role === 'Customer' && (
        <div className="space-y-4">
          <ActionSection
            title="Quotations to Review"
            count={customerQuotationsToReview.length}
            isLoading={isLoadingSubmittedQuotations}
            rows={customerQuotationsToReview.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{q.rfqTitle}</p>
                  <p className="text-xs text-muted-foreground">{q.supplierName}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate({ to: '/quotations/$id', params: { id: q.id } })}
                >
                  Review
                </Button>
              </div>
            ))}
            isEmpty={customerQuotationsToReview.length === 0}
          />

          <ActionSection
            title="Accepted — Create PO"
            count={customerAcceptedNoPI.length}
            isLoading={isLoadingAcceptedQuotations}
            rows={customerAcceptedNoPI.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{q.rfqTitle}</p>
                  <p className="text-xs text-muted-foreground">{q.supplierName}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate({ to: '/quotations/$id', params: { id: q.id } })}
                >
                  Create PO
                </Button>
              </div>
            ))}
            isEmpty={customerAcceptedNoPI.length === 0}
          />

          <ActionSection
            title="POs to Confirm"
            count={customerDraftPos.length}
            isLoading={isLoadingDraftPos}
            rows={customerDraftPos.map((po) => (
              <div
                key={po.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{po.title}</p>
                  <p className="text-xs text-muted-foreground">{po.supplierName}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate({ to: '/purchase-orders/$id', params: { id: po.id } })}
                >
                  Confirm
                </Button>
              </div>
            ))}
            isEmpty={customerDraftPos.length === 0}
          />

          <ActionSection
            title="Draft RFQs"
            count={customerDraftRfqs.length}
            isLoading={isLoadingDraftRfqs}
            rows={customerDraftRfqs.map((rfq) => (
              <div
                key={rfq.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{rfq.documentNumber}</p>
                  <p className="text-xs text-muted-foreground">{rfq.itemCount} items</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate({ to: '/rfqs/$id', params: { id: rfq.id } })}
                >
                  Send
                </Button>
              </div>
            ))}
            isEmpty={customerDraftRfqs.length === 0}
          />
        </div>
      )}

      {role === 'Supplier' && (
        <div className="space-y-4">
          <ActionSection
            title="RFQs Awaiting Your Quotation"
            count={supplierRfqsToQuote.length}
            isLoading={isLoadingSentRfqs}
            rows={supplierRfqsToQuote.map((rfq) => (
              <div
                key={rfq.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{rfq.documentNumber}</p>
                  <p className="text-xs text-muted-foreground">{rfq.customerName || 'Customer'}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate({ to: '/rfqs/$id', params: { id: rfq.id } })}
                >
                  Quote
                </Button>
              </div>
            ))}
            isEmpty={supplierRfqsToQuote.length === 0}
          />

          <ActionSection
            title="Draft Quotations"
            count={supplierDraftQuotations.length}
            isLoading={isLoadingDraftQuotations}
            rows={supplierDraftQuotations.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{q.rfqTitle}</p>
                  <p className="text-xs text-muted-foreground">Created: {format(new Date(q.createdAt), 'dd MMM')}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate({ to: '/quotations/$id', params: { id: q.id } })}
                >
                  Open
                </Button>
              </div>
            ))}
            isEmpty={supplierDraftQuotations.length === 0}
          />

          <ActionSection
            title="Awaiting Customer Decision"
            count={supplierSubmittedQuotations.length}
            isLoading={isLoadingSubmittedQuotations}
            rows={supplierSubmittedQuotations.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{q.rfqTitle}</p>
                  <p className="text-xs text-muted-foreground">Submitted: {format(new Date(q.createdAt), 'dd MMM')}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate({ to: '/quotations/$id', params: { id: q.id } })}
                >
                  View
                </Button>
              </div>
            ))}
            isEmpty={supplierSubmittedQuotations.length === 0}
          />

          <ActionSection
            title="New POs Received"
            count={supplierDraftPos.length}
            isLoading={isLoadingDraftPos}
            rows={supplierDraftPos.map((po) => (
              <div
                key={po.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{po.title}</p>
                  <p className="text-xs text-muted-foreground">Created: {format(new Date(po.createdAt), 'dd MMM')}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate({ to: '/purchase-orders/$id', params: { id: po.id } })}
                >
                  View
                </Button>
              </div>
            ))}
            isEmpty={supplierDraftPos.length === 0}
          />
        </div>
      )}

      {/* Recent Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingActivity ? (
            <Skeleton className="h-32 w-full" />
          ) : !activityData || activityData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activityData.map((item: ActivityItemDto, idx: number) => (
                <div key={idx} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <span
                    className={cn(
                      'mt-1 h-2 w-2 rounded-full shrink-0',
                      actionColor(item.action)
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium">{item.entityType}</span>
                      <span className="text-muted-foreground ml-1">{item.action}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(item.changedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
