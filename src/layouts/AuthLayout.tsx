import { Outlet } from '@tanstack/react-router'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">Indenting Agent</h1>
          <p className="text-sm text-slate-500 mt-1">B2B Procurement Platform</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
