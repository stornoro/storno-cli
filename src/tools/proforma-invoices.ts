import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

const lineItemSchema = z.object({
  uuid: z.string().optional().describe('UUID of existing line item (omit to create new)'),
  description: z.string().describe('Item description'),
  quantity: z.number().describe('Quantity (must be > 0)'),
  unitPrice: z.number().describe('Price per unit'),
  vatRateId: z.string().describe('UUID of the VAT rate'),
  unitOfMeasure: z.string().optional().describe('Unit of measure (e.g., hour, piece, kg)'),
  productId: z.string().optional().describe('UUID of related product'),
  discount: z.number().optional().describe('Absolute discount amount'),
  discountPercent: z.number().optional().describe('Discount percentage (0-100)'),
  vatIncluded: z.boolean().optional().describe('Whether unit price includes VAT (default: false)'),
});

export const tools = [
  {
    name: 'proforma_invoices_list',
    description:
      'List proforma invoices for the selected company with optional filtering by status, date range, client, and search term. Returns paginated results.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 20, max: 100)'),
      search: z.string().optional().describe('Search term for invoice number or client name'),
      status: z
        .enum(['draft', 'sent', 'accepted', 'rejected', 'converted', 'cancelled'])
        .optional()
        .describe('Filter by status'),
      from: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      clientId: z.string().optional().describe('Filter by client UUID'),
      sort: z.string().optional().describe('Sort field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/proforma-invoices', {
        companyId,
        query: {
          page: params.page as number | undefined,
          limit: params.limit as number | undefined,
          search: params.search as string | undefined,
          status: params.status as string | undefined,
          from: params.from as string | undefined,
          to: params.to as string | undefined,
          clientId: params.clientId as string | undefined,
          sort: params.sort as string | undefined,
          order: params.order as string | undefined,
        },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'proforma_invoices_get',
    description:
      'Get complete details for a specific proforma invoice including all line items, client information, and calculated totals.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the proforma invoice to retrieve'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/proforma-invoices/${params.uuid}`, { companyId });
      return formatResponse(res);
    },
  },

  {
    name: 'proforma_invoices_create',
    description:
      'Create a new proforma invoice in draft status with line items. Supports multiple currencies, discounts, and optional references.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      clientId: z.string().describe('UUID of the client'),
      seriesId: z.string().describe('UUID of the invoice series configured for proforma invoices'),
      issueDate: z.string().describe('Date of issue (YYYY-MM-DD)'),
      dueDate: z.string().describe('Payment due date (YYYY-MM-DD)'),
      validUntil: z.string().describe('Valid until date (YYYY-MM-DD)'),
      currency: z.string().describe('Currency code (e.g., RON, EUR, USD)'),
      exchangeRate: z.number().optional().describe('Exchange rate to base currency (default: 1.0 for RON)'),
      invoiceTypeCode: z.string().optional().describe('Invoice type code (default: "380" - Commercial Invoice)'),
      notes: z.string().optional().describe('Public notes visible to client'),
      paymentTerms: z.string().optional().describe('Payment terms description (e.g., "Net 30")'),
      deliveryLocation: z.string().optional().describe('Delivery address or location'),
      projectReference: z.string().optional().describe('Related project reference'),
      orderNumber: z.string().optional().describe('Client purchase order number'),
      contractNumber: z.string().optional().describe('Related contract number'),
      issuerName: z.string().optional().describe('Name of person issuing the proforma'),
      issuerId: z.string().optional().describe('UUID of the issuer user'),
      mentions: z.string().optional().describe('Additional mentions or notes'),
      internalNote: z.string().optional().describe('Internal note (not visible to client)'),
      salesAgent: z.string().optional().describe('Sales agent name'),
      language: z
        .enum(['ro', 'en', 'de', 'fr'])
        .optional()
        .describe('Document language for PDF generation (default: ro)'),
      lines: z.array(lineItemSchema).describe('Array of line items (minimum 1 required)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...body } = params;
      const res = await apiRequest('/api/v1/proforma-invoices', {
        method: 'POST',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'proforma_invoices_update',
    description:
      'Update an existing proforma invoice. Only invoices in draft status can be updated. Replaces all line items with the provided array.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the proforma invoice to update'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      clientId: z.string().describe('UUID of the client'),
      seriesId: z.string().describe('UUID of the invoice series'),
      issueDate: z.string().describe('Date of issue (YYYY-MM-DD)'),
      dueDate: z.string().describe('Payment due date (YYYY-MM-DD)'),
      validUntil: z.string().describe('Valid until date (YYYY-MM-DD)'),
      currency: z.string().describe('Currency code (e.g., RON, EUR, USD)'),
      exchangeRate: z.number().optional().describe('Exchange rate to base currency'),
      invoiceTypeCode: z.string().optional().describe('Invoice type code'),
      notes: z.string().optional().describe('Public notes visible to client'),
      paymentTerms: z.string().optional().describe('Payment terms description'),
      deliveryLocation: z.string().optional().describe('Delivery address or location'),
      projectReference: z.string().optional().describe('Related project reference'),
      orderNumber: z.string().optional().describe('Client purchase order number'),
      contractNumber: z.string().optional().describe('Related contract number'),
      issuerName: z.string().optional().describe('Name of person issuing the proforma'),
      issuerId: z.string().optional().describe('UUID of the issuer user'),
      mentions: z.string().optional().describe('Additional mentions or notes'),
      internalNote: z.string().optional().describe('Internal note (not visible to client)'),
      salesAgent: z.string().optional().describe('Sales agent name'),
      language: z
        .enum(['ro', 'en', 'de', 'fr'])
        .optional()
        .describe('Document language for PDF generation (default: ro)'),
      lines: z.array(lineItemSchema).describe('Array of line items (replaces all existing lines)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _cid, ...body } = params;
      const res = await apiRequest(`/api/v1/proforma-invoices/${uuid}`, {
        method: 'PUT',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'proforma_invoices_delete',
    description:
      'Permanently delete a proforma invoice. Only draft proforma invoices can be deleted. Use cancel for sent/accepted/rejected proformas to preserve audit trail.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the proforma invoice to delete'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/proforma-invoices/${params.uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'proforma_invoices_send',
    description:
      'Mark a proforma invoice as sent to the client. Transitions status from draft to sent. Once sent, the proforma becomes read-only.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the proforma invoice to mark as sent'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/proforma-invoices/${params.uuid}/send`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'proforma_invoices_accept',
    description:
      'Mark a proforma invoice as accepted by the client. Transitions status to accepted. Once accepted, the proforma is ready to be converted to a final invoice.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the proforma invoice to mark as accepted'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/proforma-invoices/${params.uuid}/accept`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'proforma_invoices_reject',
    description:
      'Mark a proforma invoice as rejected by the client. Optionally provide a rejection reason and notes. Once rejected, the proforma cannot be converted to an invoice.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the proforma invoice to mark as rejected'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      rejectionReason: z.string().optional().describe('Reason for rejection provided by the client'),
      rejectionNotes: z.string().optional().describe('Internal notes about the rejection'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const body: Record<string, unknown> = {};
      if (params.rejectionReason) body.rejectionReason = params.rejectionReason;
      if (params.rejectionNotes) body.rejectionNotes = params.rejectionNotes;

      const res = await apiRequest(`/api/v1/proforma-invoices/${params.uuid}/reject`, {
        method: 'POST',
        companyId,
        body: Object.keys(body).length > 0 ? body : undefined,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'proforma_invoices_cancel',
    description:
      'Cancel a proforma invoice. Can be cancelled from any status except converted or already cancelled. Preserves historical record unlike deletion.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the proforma invoice to cancel'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      cancellationReason: z.string().optional().describe('Reason for cancellation'),
      cancellationNotes: z.string().optional().describe('Internal notes about the cancellation'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const body: Record<string, unknown> = {};
      if (params.cancellationReason) body.cancellationReason = params.cancellationReason;
      if (params.cancellationNotes) body.cancellationNotes = params.cancellationNotes;

      const res = await apiRequest(`/api/v1/proforma-invoices/${params.uuid}/cancel`, {
        method: 'POST',
        companyId,
        body: Object.keys(body).length > 0 ? body : undefined,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'proforma_invoices_convert',
    description:
      'Convert a proforma invoice into a final invoice. Creates a new invoice with all proforma data, marks proforma as converted, and links the two documents. Returns both the new invoice and updated proforma.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the proforma invoice to convert'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      invoiceSeriesId: z
        .string()
        .optional()
        .describe('UUID of invoice series to use (if different from proforma series)'),
      issueDate: z.string().optional().describe('Override issue date for the new invoice (default: today, YYYY-MM-DD)'),
      dueDate: z
        .string()
        .optional()
        .describe('Override due date for the new invoice (default: proforma due date, YYYY-MM-DD)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const body: Record<string, unknown> = {};
      if (params.invoiceSeriesId) body.invoiceSeriesId = params.invoiceSeriesId;
      if (params.issueDate) body.issueDate = params.issueDate;
      if (params.dueDate) body.dueDate = params.dueDate;

      const res = await apiRequest(`/api/v1/proforma-invoices/${params.uuid}/convert`, {
        method: 'POST',
        companyId,
        body: Object.keys(body).length > 0 ? body : undefined,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'proforma_invoices_pdf',
    description:
      'Download the PDF of a proforma invoice. Returns base64-encoded binary data. Requires Pro plan.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the proforma invoice'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/proforma-invoices/${params.uuid}/pdf`, {
        companyId,
        binary: true,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'proforma_invoices_bulk_delete',
    description:
      'Delete multiple proforma invoices in batch. Only draft proformas can be deleted. Returns count of deleted and any errors.',
    inputSchema: z.object({
      ids: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Array of proforma invoice UUIDs to delete (1-100)'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/proforma-invoices/bulk-delete', {
        method: 'POST',
        companyId,
        body: { ids: params.ids },
      });
      return formatResponse(res);
    },
  },
];
