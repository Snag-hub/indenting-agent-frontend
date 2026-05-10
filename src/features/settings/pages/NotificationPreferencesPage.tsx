import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { notificationsApi } from '@/features/notifications/api/notificationsApi'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bell, Mail, MessageSquare, MessageCircle, Share2, Loader2, Check } from 'lucide-react'
import { useState, useEffect } from 'react'

const preferencesSchema = z.object({
  enableSignalR: z.boolean(),
  enableEmail: z.boolean(),
  enableSMS: z.boolean(),
  enableWhatsApp: z.boolean(),
  enableWeChat: z.boolean(),
})

type PreferencesForm = z.infer<typeof preferencesSchema>

const CHANNEL_CONFIG = [
  {
    key: 'enableSignalR',
    label: 'In-App Notifications',
    description: 'Real-time notifications in your dashboard',
    icon: Bell,
    color: 'text-blue-600',
  },
  {
    key: 'enableEmail',
    label: 'Email',
    description: 'Receive notifications via email',
    icon: Mail,
    color: 'text-purple-600',
  },
  {
    key: 'enableSMS',
    label: 'SMS',
    description: 'Receive notifications via text message',
    icon: MessageSquare,
    color: 'text-green-600',
  },
  {
    key: 'enableWhatsApp',
    label: 'WhatsApp',
    description: 'Receive notifications via WhatsApp',
    icon: MessageCircle,
    color: 'text-emerald-600',
  },
  {
    key: 'enableWeChat',
    label: 'WeChat',
    description: 'Receive notifications via WeChat',
    icon: Share2,
    color: 'text-red-600',
  },
]

export function NotificationPreferencesPage() {
  const qc = useQueryClient()
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: () => notificationsApi.getPreferences(),
  })

  const { control, handleSubmit, reset, formState: { isDirty, isSubmitting } } = useForm<PreferencesForm>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      enableSignalR: preferences?.enableSignalR ?? true,
      enableEmail: preferences?.enableEmail ?? false,
      enableSMS: preferences?.enableSMS ?? false,
      enableWhatsApp: preferences?.enableWhatsApp ?? false,
      enableWeChat: preferences?.enableWeChat ?? false,
    },
  })

  // Update form when preferences load
  useEffect(() => {
    if (preferences) {
      reset({
        enableSignalR: preferences.enableSignalR,
        enableEmail: preferences.enableEmail,
        enableSMS: preferences.enableSMS,
        enableWhatsApp: preferences.enableWhatsApp,
        enableWeChat: preferences.enableWeChat,
      })
    }
  }, [preferences, reset])

  const updateMutation = useMutation({
    mutationFn: (data: PreferencesForm) => notificationsApi.updatePreferences(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'preferences'] })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    },
  })

  const onSubmit = handleSubmit((data) => {
    updateMutation.mutate(data)
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Preferences"
        description="Choose how you want to receive notifications"
      />

      <form onSubmit={onSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Notification Channels</CardTitle>
            <CardDescription>
              Select which channels you'd like to receive notifications on. At least one channel must be enabled.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {CHANNEL_CONFIG.map(({ key, label, description, icon: Icon, color }) => (
              <div key={key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`mt-1 p-2 bg-muted rounded-lg ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <Label className="text-base font-medium cursor-pointer">{label}</Label>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                  </div>
                </div>

                <div className="ml-4">
                  <Controller
                    name={key as keyof PreferencesForm}
                    control={control}
                    render={({ field }) => (
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center gap-3 mt-6">
          <Button
            type="submit"
            disabled={!isDirty || isSubmitting || updateMutation.isPending}
            className="min-w-[140px]"
          >
            {isSubmitting || updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved
              </>
            ) : (
              'Save Preferences'
            )}
          </Button>

          {isDirty && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
              }}
            >
              Cancel
            </Button>
          )}
        </div>

        {updateMutation.isError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              Failed to save preferences. Please try again.
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
