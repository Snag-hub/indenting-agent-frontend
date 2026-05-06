import { useNavigate, Outlet, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Hash, ArrowRight, ChevronLeft } from 'lucide-react'

const SETTINGS_ITEMS = [
  {
    id: 'notifications',
    title: 'Notification Preferences',
    description: 'Manage how and where you receive notifications',
    icon: Bell,
    color: 'text-blue-600',
    path: '/settings/notification-preferences',
    roles: ['Admin', 'Customer', 'Supplier'],
  },
  {
    id: 'document-numbers',
    title: 'Document Number Format',
    description: 'Configure document numbering for RFQs, POs, and more',
    icon: Hash,
    color: 'text-purple-600',
    path: '/settings/document-number-settings',
    roles: ['Admin'],
  },
]

export function SettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const location = useLocation()
  const role = user?.role

  const availableSettings = SETTINGS_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role || '')
  )

  // Check if we're on a sub-route (not just /settings)
  const isSubRoute = location.pathname !== '/settings'

  if (isSubRoute) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate({ to: '/settings' })}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Settings
        </button>
        <Outlet />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account preferences and configuration"
      />

      <div className="grid gap-4">
        {availableSettings.map((setting) => {
          const Icon = setting.icon
          return (
            <Card key={setting.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 bg-muted rounded-lg ${setting.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{setting.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {setting.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => navigate({ to: setting.path })}
                  className="w-full sm:w-auto"
                  variant="outline"
                >
                  Configure
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
