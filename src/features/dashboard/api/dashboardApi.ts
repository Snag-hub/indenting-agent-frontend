import { api } from "@/lib/api";

/**
 * A single KPI card shown on the dashboard.
 * The backend returns the same shape for all three roles —
 * the `id` field identifies which metric it is (e.g. "open-rfqs", "pending-pos").
 */
export interface DashboardKpiCardDto {
  id: string;
  label: string;
  /** Raw numeric value */
  value: string | number;
  /** Optional pre-formatted string (e.g. "$1,200") — shown instead of `value` when present */
  valueFormatted?: string;
  trend?: "up" | "down" | "neutral";
  /** Percentage change vs previous period */
  trendPercent?: number;
  /** Emoji or icon string rendered next to the label */
  icon?: string;
}

/** Admin-specific dashboard shape (extends the shared kpis array) */
export interface AdminDashboardDto {
  kpis: DashboardKpiCardDto[];
  recentOrders?: Record<string, unknown>[];
  recentQuotations?: Record<string, unknown>[];
}

/** Customer-specific dashboard shape */
export interface CustomerDashboardDto {
  kpis: DashboardKpiCardDto[];
  recentOrders?: Record<string, unknown>[];
  recentInvoices?: Record<string, unknown>[];
}

/** Supplier-specific dashboard shape */
export interface SupplierDashboardDto {
  kpis: DashboardKpiCardDto[];
  recentRFQs?: Record<string, unknown>[];
  recentQuotations?: Record<string, unknown>[];
}

/**
 * Union type — the backend returns one of these based on the caller's role.
 * All three share the `kpis` array so the DashboardPage can render it
 * without needing to know which role is active.
 */
export type DashboardDto =
  | AdminDashboardDto
  | CustomerDashboardDto
  | SupplierDashboardDto;

export const dashboardApi = {
  /**
   * GET /api/v1/dashboard
   * Returns role-specific KPI data. The backend determines the role from the JWT
   * and delegates to the correct query handler (Admin / Customer / Supplier).
   */
  get: (): Promise<DashboardDto> =>
    api.get<DashboardDto>("/dashboard").then((r) => r.data),
};
