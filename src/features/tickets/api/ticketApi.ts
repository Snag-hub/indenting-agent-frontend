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
  ticketNumber?: string;
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
  ticketNumber?: string;
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

/** Available document for ticket creation (PI, DO, or Payment) */
export interface AvailableDocumentDto {
  id: string;
  number: string;
  status: string;
  createdDate: string;
  amount: number;
  description: string;
}

/**
 * Payload for POST /tickets.
 * `linkedEntityType` / `linkedEntityId` are optional — a ticket can be raised
 * standalone (from the Tickets nav) or linked to a document (from a DO/PI/Payment
 * detail page). The backend's Ticket.EntityType/EntityId are both nullable.
 */
/** Document types a ticket can be linked to. */
export type TicketEntityType = "PI" | "DO" | "PO" | "QT" | "RFQ" | "Payment";

/** A pickable counterparty org for a direct (non-document) ticket. */
export interface TicketCounterpartyDto {
  id: string;
  name: string;
}

export interface CreateTicketInput {
  title: string;
  description?: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  assignedToId?: string;
  linkedEntityType?: TicketEntityType;
  linkedEntityId?: string;
  // Direct (non-document) tickets: who the ticket is for.
  counterpartyType?: "Customer" | "Supplier";
  counterpartyId?: string;
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
  /** GET /tickets/available-documents — fetch documents user can link to tickets. */
  getAvailableDocuments: (entityType: TicketEntityType) =>
    api
      .get<AvailableDocumentDto[]>("/tickets/available-documents", { params: { entityType } })
      .then((r) => r.data),

  /** GET /tickets — paginated list with optional filters. */
  list: (params?: {
    search?: string;
    status?: string;
    priority?: string;
    fromDate?: string;
    toDate?: string;
    dateField?: string;
    page?: number;
    pageSize?: number;
  }) =>
    api
      .get<PagedResult<TicketSummaryDto>>("/tickets", { params })
      .then((r) => r.data),

  /**
   * POST /tickets — create a new ticket. Returns the new ticket's GUID.
   * Maps the UI's `linked*`/`assignedToId` fields to the backend command's
   * `entityType`/`entityId`/`assignedToUserId` names. Omitted link fields → a
   * standalone (unlinked) ticket.
   */
  create: (data: CreateTicketInput) =>
    api
      .post<string>("/tickets", {
        title: data.title,
        description: data.description,
        priority: data.priority,
        assignedToUserId: data.assignedToId,
        entityType: data.linkedEntityType,
        entityId: data.linkedEntityId,
        counterpartyType: data.counterpartyType,
        counterpartyId: data.counterpartyId,
      })
      .then((r) => r.data),

  /** GET /tickets/counterparties — orgs the user can direct a standalone ticket to. */
  getCounterparties: (partyType: "Customer" | "Supplier") =>
    api
      .get<TicketCounterpartyDto[]>("/tickets/counterparties", { params: { partyType } })
      .then((r) => r.data),

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

  /** PUT /tickets/:id/status — moves ticket to Closed status. */
  close: (id: string) =>
    api.put(`/tickets/${id}/status`, { status: "Closed" }).then((r) => r.data),
};
