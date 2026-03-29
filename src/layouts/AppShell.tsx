import { Outlet, Link, useRouter } from '@tanstack/react-router'
import {
  LayoutDashboard, Users, Building2, Package, Tags,
  ShoppingCart, FileText, ClipboardList, Truck,
  CreditCard, Ticket, Bell, Settings, ChevronLeft,
  ChevronRight, LogOut, Menu
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type NavItem = { label: string; to: string; icon: React.ReactNode }

const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Customers', to: '/customers', icon: <Users size={18} /> },
  { label: 'Suppliers', to: '/suppliers', icon: <Building2 size={18} /> },
  { label: 'Item Mapping', to: '/item-mapping', icon: <Package size={18} /> },
  { label: 'Categories', to: '/catalog/categories', icon: <Tags size={18} /> },
  { label: 'Master Items', to: '/catalog/items', icon: <Package size={18} /> },
  { label: 'Tickets', to: '/tickets', icon: <Ticket size={18} /> },
  { label: 'Audit Logs', to: '/audit-logs', icon: <FileText size={18} /> },
  { label: 'Settings', to: '/settings', icon: <Settings size={18} /> },
]

const customerNav: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Browse', to: '/browse', icon: <Package size={18} /> },
  { label: 'Enquiries', to: '/enquiries', icon: <FileText size={18} /> },
  { label: 'RFQs', to: '/rfqs', icon: <ClipboardList size={18} /> },
  { label: 'Purchase Orders', to: '/purchase-orders', icon: <ShoppingCart size={18} /> },
  { label: 'Payments', to: '/payments', icon: <CreditCard size={18} /> },
  { label: 'Tickets', to: '/tickets', icon: <Ticket size={18} /> },
  { label: 'Settings', to: '/settings', icon: <Settings size={18} /> },
]

const supplierNav: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Items', to: '/my-items', icon: <Package size={18} /> },
  { label: 'Dimensions', to: '/my-dimensions', icon: <Tags size={18} /> },
  { label: 'Quotations', to: '/quotations', icon: <ClipboardList size={18} /> },
  { label: 'Proforma Invoices', to: '/proforma-invoices', icon: <FileText size={18} /> },
  { label: 'Delivery Orders', to: '/delivery-orders', icon: <Truck size={18} /> },
  { label: 'Tickets', to: '/tickets', icon: <Ticket size={18} /> },
  { label: 'Settings', to: '/settings', icon: <Settings size={18} /> },
]

function getNav(role: string) {
  if (role === 'Admin') return adminNav
  if (role === 'Customer') return customerNav
  return supplierNav
}

export function AppShell() {
  const { user, clearAuth } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUiStore()
  const router = useRouter()

  const nav = getNav(user?.role ?? 'Admin')

  function handleLogout() {
    clearAuth()
    router.navigate({ to: '/login' })
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col bg-slate-900 text-slate-300 transition-all duration-200 shrink-0',
          sidebarCollapsed ? 'w-14' : 'w-56'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-slate-700">
          {!sidebarCollapsed && (
            <span className="text-white font-semibold text-sm truncate">
              Indenting Agent
            </span>
          )}
          <button
            onClick={toggleSidebar}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-700 hover:text-white transition-colors',
                '[&.active]:bg-slate-700 [&.active]:text-white'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          ))}
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
          <button className="text-slate-500 hover:text-slate-900 md:hidden" onClick={toggleSidebar}>
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <button className="text-slate-500 hover:text-slate-900 relative">
            <Bell size={20} />
          </button>
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center font-medium">
            {user?.fullName?.[0] ?? '?'}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
