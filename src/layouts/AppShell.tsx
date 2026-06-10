import { Suspense, useState, useEffect } from 'react'
import { Outlet, Link, useRouter } from '@tanstack/react-router'
import {
  LayoutDashboard, Users, Building2, Package, Tags,
  ShoppingCart, FileText, ClipboardList, Truck,
  CreditCard, Ticket, Bell, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu, AlertCircle, Hash,
  MessageSquare
} from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { useSignalR } from '@/hooks/useSignalR'
import { notificationApi } from '@/features/notifications/api/notificationApi'
import { threadApi } from '@/features/threads/api/threadApi'
import { NotificationsPanel } from '@/features/notifications/NotificationsPanel'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { queryKeys } from '@/lib/queryKeys'
import { cn } from '@/lib/utils'

type NavItem = { label: string; to: string; icon: React.ReactNode; badgeKey?: 'threads' | 'notifications' }

const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Conversations', to: '/threads', icon: <MessageSquare size={18} />, badgeKey: 'threads' as const },
  { label: 'Customers', to: '/customers', icon: <Users size={18} /> },
  { label: 'Suppliers', to: '/suppliers', icon: <Building2 size={18} /> },
  { label: 'Users', to: '/admin/users', icon: <Users size={18} /> },
  { label: 'Item Mapping', to: '/item-mapping', icon: <Package size={18} /> },
  { label: 'Categories', to: '/catalog/categories', icon: <Tags size={18} /> },
  { label: 'Master Items', to: '/catalog/items', icon: <Package size={18} /> },
  { label: 'Notifications', to: '/notifications', icon: <Bell size={18} />, badgeKey: 'notifications' as const },
  { label: 'Tickets', to: '/tickets', icon: <Ticket size={18} /> },
  { label: 'Audit Logs', to: '/audit-logs', icon: <FileText size={18} /> },
  { label: 'Doc # Settings', to: '/admin/document-number-settings', icon: <Hash size={18} /> },
  { label: 'Settings', to: '/settings', icon: <Settings size={18} /> },
]

const customerNav: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Conversations', to: '/threads', icon: <MessageSquare size={18} />, badgeKey: 'threads' as const },
  { label: 'Pending Actions', to: '/reports', icon: <AlertCircle size={18} /> },
  { label: 'My Items', to: '/my-items', icon: <Package size={18} /> },
  { label: 'Enquiries', to: '/enquiries', icon: <FileText size={18} /> },
  { label: 'RFQs', to: '/rfqs', icon: <ClipboardList size={18} /> },
  { label: 'Quotations', to: '/quotations', icon: <ClipboardList size={18} /> },
  { label: 'Purchase Orders', to: '/purchase-orders', icon: <ShoppingCart size={18} /> },
  { label: 'Proforma Invoices', to: '/proforma-invoices', icon: <FileText size={18} /> },
  { label: 'Delivery Orders', to: '/delivery-orders', icon: <Truck size={18} /> },
  { label: 'Payments', to: '/payments', icon: <CreditCard size={18} /> },
  { label: 'Notifications', to: '/notifications', icon: <Bell size={18} />, badgeKey: 'notifications' as const },
  { label: 'Tickets', to: '/tickets', icon: <Ticket size={18} /> },
  { label: 'Doc # Settings', to: '/settings/document-number-settings', icon: <Hash size={18} /> },
  { label: 'Settings', to: '/settings', icon: <Settings size={18} /> },
]

const supplierNav: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Conversations', to: '/threads', icon: <MessageSquare size={18} />, badgeKey: 'threads' as const },
  { label: 'Pending Actions', to: '/reports', icon: <AlertCircle size={18} /> },
  { label: 'Enquiries', to: '/enquiries', icon: <FileText size={18} /> },
  { label: 'RFQs', to: '/rfqs', icon: <ClipboardList size={18} /> },
  { label: 'Items', to: '/my-items', icon: <Package size={18} /> },
  { label: 'Dimensions', to: '/my-dimensions', icon: <Tags size={18} /> },
  { label: 'Quotations', to: '/quotations', icon: <ClipboardList size={18} /> },
  { label: 'Purchase Orders', to: '/purchase-orders', icon: <ShoppingCart size={18} /> },
  { label: 'Proforma Invoices', to: '/proforma-invoices', icon: <FileText size={18} /> },
  { label: 'Delivery Orders', to: '/delivery-orders', icon: <Truck size={18} /> },
  { label: 'Payments', to: '/payments', icon: <CreditCard size={18} /> },
  { label: 'Notifications', to: '/notifications', icon: <Bell size={18} />, badgeKey: 'notifications' as const },
  { label: 'Tickets', to: '/tickets', icon: <Ticket size={18} /> },
  { label: 'Doc # Settings', to: '/settings/document-number-settings', icon: <Hash size={18} /> },
  { label: 'Settings', to: '/settings', icon: <Settings size={18} /> },
]

const employeesNavItem: NavItem = {
  label: 'Employees', to: '/my-employees', icon: <Users size={18} />,
}

function getNav(role: string, isOrgAdmin: boolean) {
  if (role === 'Admin') return adminNav
  const base = role === 'Customer' ? customerNav : supplierNav
  // OrgAdmins of a Customer/Supplier get an "Employees" entry to manage their team.
  return isOrgAdmin ? [...base, employeesNavItem] : base
}

function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 mb-4">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
        <p className="text-slate-600 font-medium">Loading...</p>
      </div>
    </div>
  )
}

export function AppShell() {
  const { user, clearAuth } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUiStore()
  const { unreadCount, setUnreadCount, connectionError } = useNotificationStore()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  // Initialize SignalR connection
  useSignalR()

  // Unread thread count — polled every 60 s; invalidated when threads are marked read
  const { data: unreadThreadData } = useQuery({
    queryKey: queryKeys.threads.unreadCount(),
    queryFn: threadApi.getMyUnreadCount,
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
  const unreadThreadCount = unreadThreadData ?? 0

  // Load unread notification count on app init
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const count = await notificationApi.getUnreadCount()
        setUnreadCount(count)
      } catch (error) {
        console.error('Failed to load unread notification count:', error)
      }
    }
    loadUnreadCount()
  }, [setUnreadCount])

  // Surface SignalR connection errors to the user
  useEffect(() => {
    if (connectionError) {
      toast.error(connectionError, { id: 'signalr-error', duration: Infinity })
    } else {
      toast.dismiss('signalr-error')
    }
  }, [connectionError])

  const nav = getNav(user?.role ?? 'Admin', user?.isOrgAdmin ?? false)

  function handleLogout() {
    clearAuth()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile overlay backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar — desktop: persistent; mobile: overlay drawer */}
      <aside
        className={cn(
          'flex flex-col bg-slate-900 text-slate-300 transition-all duration-200 shrink-0',
          // Desktop: collapsed/expanded toggle
          'hidden md:flex',
          sidebarCollapsed ? 'md:w-14' : 'md:w-56',
          // Mobile: fixed overlay drawer
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:w-64',
          mobileMenuOpen ? 'max-md:flex max-md:translate-x-0' : 'max-md:-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-slate-700">
          {/* Mobile: always show app name + X close; Desktop: obey collapsed state */}
          <span className={cn(
            'text-white font-semibold text-sm truncate',
            sidebarCollapsed ? 'hidden md:hidden' : ''
          )}>
            Indenting Agent
          </span>
          {/* Desktop collapse toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden md:block text-slate-400 hover:text-white p-1 rounded"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {nav.map((item) => {
            const badge =
              item.badgeKey === 'threads' ? unreadThreadCount :
              item.badgeKey === 'notifications' ? unreadCount :
              0
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-700 hover:text-white transition-colors',
                  '[&.active]:bg-slate-700 [&.active]:text-white'
                )}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {/* Icon — with badge dot when collapsed */}
                <span className="relative shrink-0">
                  {item.icon}
                  {badge > 0 && sidebarCollapsed && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center font-bold">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </span>
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span className="ml-auto h-5 min-w-5 px-1 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-medium">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="border-t border-slate-700 p-3">
          {!sidebarCollapsed && (
            <div className="text-xs mb-2 truncate">
              <div className="text-white font-medium">{user?.fullName}</div>
              <div className="text-slate-400">{user?.role}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm w-full"
            title="Logout"
          >
            <LogOut size={16} />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex items-center gap-4 bg-white border-b border-slate-200 px-6 h-14 shrink-0">
          <button
            className="text-slate-500 hover:text-slate-900 md:hidden"
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
            <SheetContent side="right" className="w-96 p-0 flex flex-col">
              <SheetHeader className="border-b p-4 shrink-0">
                <SheetTitle>Notifications</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-hidden">
                <NotificationsPanel
                  isOpen={notificationsOpen}
                  onClose={() => setNotificationsOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-medium">
            {user?.fullName?.[0] ?? '?'}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            <Suspense fallback={<PageLoadingFallback />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
