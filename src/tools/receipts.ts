import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

const receiptLineItemSchema = z.object({
  uuid: z.string().optional().describe('UUID of existing line item (omit to create new)'),
  description: z.string().describe('Item description'),
  quantity: z.number().describe('Quantity sold (must be > 0)'),
  unitPrice: z.number().describe('Price per unit'),
  vatRateId: z.string().describe('UUID of the VAT rate'),
  unitOfMeasure: z.string().optional().describe('Unit of measure (e.g., piece, kg, hour)'),
  productId: z.string().optional().describe('UUID of related product'),
});

export const tools = [
  {
    name: 'receipts_list',
    description:
      'List receipts (bonuri fiscale) for the selected company with optional filtering by status, date range, client, and search term. Receipts document point-of-sale transactions and can be converted to invoices.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 20, max: 100)'),
      search: z.string().optional().describe('Search term for receipt number or customer name'),
      status: z
        .enum(['draft', 'issued', 'invoiced', 'cancelled'])
        .optional()
        .describe('Filter by status'),
      from: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      clientId: z.string().optional().describe('Filter by client UUID'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/receipts', {
        companyId,
        query: {
          page: params.page as number | undefined,
          limit: params.limit as number | undefined,
          search: params.search as string | undefined,
          status: params.status as string | undefined,
          from: params.from as string | undefined,
          to: params.to as string | undefined,
          clientId: params.clientId as string | undefined,
        },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_get',
    description:
      'Get complete details for a specific receipt (bon fiscal) including all line items, payment breakdown, fiscal data, and calculated totals.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the receipt to retrieve'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/receipts/${params.uuid}`, { companyId });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_create',
    description:
      'Create a new receipt (bon fiscal) in draft status. Receipts document point-of-sale transactions with payment method details and optional fiscal register information. Can later be issued and converted to invoices. A default receipt series is auto-assigned if neither seriesId nor documentSeriesId is provided.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      clientId: z.string().optional().describe('UUID of the client (optional for receipts)'),
      seriesId: z.string().optional().describe('UUID of the receipt series (uses default series if not provided)'),
      documentSeriesId: z.string().optional().describe('UUID of the document series to use (alternative to seriesId; uses default receipt series if neither is provided)'),
      issueDate: z.string().describe('Date of issue (YYYY-MM-DD)'),
      currency: z.string().describe('Currency code (e.g., RON, EUR, USD)'),
      exchangeRate: z.number().optional().describe('Exchange rate to base currency (default: 1.0 for RON)'),
      paymentMethod: z
        .enum(['cash', 'card', 'meal_ticket', 'mixed'])
        .optional()
        .describe('Payment method used for the transaction'),
      cashPayment: z.number().optional().describe('Amount paid in cash (for mixed payments)'),
      cardPayment: z.number().optional().describe('Amount paid by card (for mixed payments)'),
      otherPayment: z.number().optional().describe('Amount paid by other method, e.g. meal ticket (for mixed payments)'),
      cashRegisterName: z.string().optional().describe('Name or identifier of the cash register / fiscal printer'),
      fiscalNumber: z.string().optional().describe('Fiscal receipt number assigned by the cash register'),
      customerName: z.string().optional().describe('Customer name (when no clientId is provided)'),
      customerCif: z.string().optional().describe('Customer tax ID / CIF (when no clientId is provided)'),
      projectReference: z.string().optional().describe('Related project or order reference'),
      issuerName: z.string().optional().describe('Name of person issuing the receipt'),
      issuerId: z.string().optional().describe('UUID of the issuer user'),
      salesAgent: z.string().optional().describe('Sales agent name'),
      notes: z.string().optional().describe('Public notes on the receipt'),
      mentions: z.string().optional().describe('Additional mentions or instructions'),
      internalNote: z.string().optional().describe('Internal note (not visible to customer)'),
      lines: z.array(receiptLineItemSchema).describe('Array of line items (minimum 1 required)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...body } = params;
      const res = await apiRequest('/api/v1/receipts', {
        method: 'POST',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_update',
    description:
      'Update an existing receipt. Receipts in draft or issued status can be updated. Replaces all line items with the provided array.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the receipt to update'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      clientId: z.string().optional().describe('UUID of the client (optional for receipts)'),
      seriesId: z.string().optional().describe('UUID of the receipt series'),
      documentSeriesId: z.string().optional().describe('UUID of the document series to use (alternative to seriesId)'),
      issueDate: z.string().describe('Date of issue (YYYY-MM-DD)'),
      currency: z.string().describe('Currency code (e.g., RON, EUR, USD)'),
      exchangeRate: z.number().optional().describe('Exchange rate to base currency'),
      paymentMethod: z
        .enum(['cash', 'card', 'meal_ticket', 'mixed'])
        .optional()
        .describe('Payment method used for the transaction'),
      cashPayment: z.number().optional().describe('Amount paid in cash (for mixed payments)'),
      cardPayment: z.number().optional().describe('Amount paid by card (for mixed payments)'),
      otherPayment: z.number().optional().describe('Amount paid by other method, e.g. meal ticket (for mixed payments)'),
      cashRegisterName: z.string().optional().describe('Name or identifier of the cash register / fiscal printer'),
      fiscalNumber: z.string().optional().describe('Fiscal receipt number assigned by the cash register'),
      customerName: z.string().optional().describe('Customer name (when no clientId is provided)'),
      customerCif: z.string().optional().describe('Customer tax ID / CIF (when no clientId is provided)'),
      projectReference: z.string().optional().describe('Related project or order reference'),
      issuerName: z.string().optional().describe('Name of person issuing the receipt'),
      issuerId: z.string().optional().describe('UUID of the issuer user'),
      salesAgent: z.string().optional().describe('Sales agent name'),
      notes: z.string().optional().describe('Public notes on the receipt'),
      mentions: z.string().optional().describe('Additional mentions or instructions'),
      internalNote: z.string().optional().describe('Internal note (not visible to customer)'),
      lines: z.array(receiptLineItemSchema).describe('Array of line items (replaces all existing lines)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _cid, ...body } = params;
      const res = await apiRequest(`/api/v1/receipts/${uuid}`, {
        method: 'PUT',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_delete',
    description:
      'Permanently delete a receipt. Only draft receipts can be deleted. Use cancel for issued receipts to preserve the audit trail.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the receipt to delete'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/receipts/${params.uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_issue',
    description:
      'Mark a receipt as issued at the point of sale. Transitions status from draft to issued. Once issued, the receipt becomes read-only and its fiscal data is locked.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the receipt to mark as issued'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/receipts/${params.uuid}/issue`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_cancel',
    description:
      'Cancel a receipt. Can be cancelled from draft or issued status. Preserves the historical record unlike deletion. Optionally provide a cancellation reason.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the receipt to cancel'),
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

      const res = await apiRequest(`/api/v1/receipts/${params.uuid}/cancel`, {
        method: 'POST',
        companyId,
        body: Object.keys(body).length > 0 ? body : undefined,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_convert_to_invoice',
    description:
      'Convert an issued receipt into a final invoice. Creates a new invoice with all receipt data, marks the receipt as invoiced, and establishes a link between the two documents. Returns both the new invoice and updated receipt.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the issued receipt to convert to an invoice'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      invoiceSeriesId: z
        .string()
        .optional()
        .describe('UUID of the invoice series to use (if different from receipt series)'),
      issueDate: z
        .string()
        .optional()
        .describe('Override issue date for the new invoice (default: today, YYYY-MM-DD)'),
      dueDate: z
        .string()
        .optional()
        .describe('Due date for the new invoice (YYYY-MM-DD)'),
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

      const res = await apiRequest(`/api/v1/receipts/${params.uuid}/convert`, {
        method: 'POST',
        companyId,
        body: Object.keys(body).length > 0 ? body : undefined,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_pdf',
    description:
      'Download the PDF for a receipt (bon fiscal). Returns base64-encoded PDF binary data. The receipt must be in issued or invoiced status.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the receipt'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/receipts/${params.uuid}/pdf`, {
        companyId,
        binary: true,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_restore',
    description:
      'Restore a cancelled receipt back to draft status. Only cancelled receipts can be restored. This reverses the cancellation and allows the receipt to be re-issued.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the cancelled receipt to restore'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/receipts/${params.uuid}/restore`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_email',
    description:
      'Send a receipt (bon fiscal) to a customer via email with the PDF attached. Supports custom subject, body, CC, and BCC recipients.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the receipt to send'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      to: z.string().describe('Recipient email address'),
      subject: z.string().optional().describe('Email subject (auto-generated if omitted)'),
      body: z.string().optional().describe('Email body text (auto-generated if omitted)'),
      cc: z.array(z.string()).optional().describe('CC email addresses'),
      bcc: z.array(z.string()).optional().describe('BCC email addresses'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const body: Record<string, unknown> = { to: params.to };
      if (params.subject) body.subject = params.subject;
      if (params.body) body.body = params.body;
      if (params.cc) body.cc = params.cc;
      if (params.bcc) body.bcc = params.bcc;

      const res = await apiRequest(`/api/v1/receipts/${params.uuid}/email`, {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_email_defaults',
    description:
      'Get pre-filled email content for a receipt including default recipient, subject, and body text with template variables already substituted.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the receipt'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/receipts/${params.uuid}/email-defaults`, {
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'receipts_email_history',
    description:
      'Get the email sending history for a receipt, including all sent emails with their status, timestamps, and recipient information.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the receipt'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/receipts/${params.uuid}/emails`, {
        companyId,
      });
      return formatResponse(res);
    },
  },
];
