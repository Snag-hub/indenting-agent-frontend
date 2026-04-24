import { api } from "@/lib/api";
import type { PagedResult } from "@/types/api";

/** A single comment on a ticket, posted by any user. */
export interface TicketCommentDto {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

/**
 * Summary row shown in the tickets list.
 * `linkedEntityType` is the internal entity code (DO, PI, PO, RFQ, QT).
 * `linkedEntityNumber` is the human-readable doc number (e.g. "DO-2026-0003").
 */
export interface TicketSummaryDto {
  id: string;
  documentNumber?: string;
  title: string;
  description?: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  priority: "Low" | "Medium" | "High" | "Critical";
  assignedToName?: string;
  /** Internal entity type code — DO | PI | PO | RFQ | QT */
  linkedEntityType?: string;
  linkedEntityId?: string;
  /** Human-readable document number of the linked entity */
  linkedEntityNumber?: string;
  createdAt: string;
  createdByName: string;
}

/**
 * Full ticket detail including the comments thread.
 * Returned by GET /tickets/:id.
 */
export interface TicketDetailDto {
  id: string;
  documentNumber?: string;
  title: string;
  description?: string;
  status: "Open" | "In Progress" | "Resolved" | "Closed";
  priority: "Low" | "Medium" | "High" | "Critical";
  assignedToId?: string;
  assignedToName?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  linkedEntityNumber?: string;
  comments: TicketCommentDto[];
  createdAt: string;
  createdById: string;
  createdByName: string;
  modifiedAt?: string;
}

/**
 * Payload for POST /tickets.
 * `linkedEntityType` and `linkedEntityId` are populated when navigating
 * from a DO or PI detail page via the "Create Ticket" button.
 */
export interface CreateTicketInput {
  title: string;
  description?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  assignedToId?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
}

/** Payload for PUT /tickets/:id — all fields optional (partial update). */
export interface UpdateTicketInput {
  title?: string;
  description?: string;
  status?: "Open" | "In Progress" | "Resolved" | "Closed";
  priority?: "Low" | "Medium" | "High" | "Critical";
  /** Pass null to un-assign */
  assignedToId?: string | null;
}

/** Payload for POST /tickets/:id/comments. */
export interface AddCommentInput {
  content: string;
}

export const ticketApi = {
  /** GET /tickets — paginated list with optional filters. */
  list: (params?: {
    search?: string;
    status?: string;
    priority?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api
      .get<PagedResult<TicketSummaryDto>>("/tickets", { params })
      .then((r) => r.data),

  /** POST /tickets — create a new ticket. Returns the new ticket's GUID. */
  create: (data: CreateTicketInput) =>
    api.post<string>("/tickets", data).then((r) => r.data),

  /** GET /tickets/:id — full detail including comments. */
  get: (id: string): Promise<TicketDetailDto> =>
    api.get<TicketDetailDto>(`/tickets/${id}`).then((r) => r.data),

  /** PUT /tickets/:id — partial update (status, priority, assignee, title). */
  update: (id: string, data: UpdateTicketInput) =>
    api.put(`/tickets/${id}`, data).then((r) => r.data),

  /** POST /tickets/:id/comments — add a comment to the thread. */
  addComment: (id: string, data: AddCommentInput) =>
    api.post(`/tickets/${id}/comments`, data).then((r) => r.data),

  /** DELETE /tickets/:id/comments/:commentId — remove a comment (own comments only). */
  removeComment: (id: string, commentId: string) =>
    api.delete(`/tickets/${id}/comments/${commentId}`).then((r) => r.data),

  /** POST /tickets/:id/close — moves ticket to Closed status. */
  close: (id: string) => api.post(`/tickets/${id}/close`).then((r) => r.data),
};
