import { api } from "@/lib/api";

export interface ActivityItemDto {
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  changedAt: string;
}

export const reportsApi = {
  getActivity: (count = 10) =>
    api
      .get<ActivityItemDto[]>("/reports/activity", { params: { count } })
      .then((r) => r.data),
};
