import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

const lineItemSchema = z.object({
  description: z.string().describe('Line item description (product or service name)'),
  quantity: z.number().describe('Quantity of items'),
  unitPrice: z.number().describe('Unit price per item (excluding VAT by default)'),
  vatRateId: z
    .string()
    .optional()
    .describe('VAT rate UUID (from vat_rates_list). Uses company default if not provided.'),
  unitOfMeasure: z
    .string()
    .optional()
    .describe('Unit of measure code (e.g., "BUC", "ORE", "KG"). From invoice-defaults.'),
  productId: z
    .string()
    .optional()
    .describe('Product UUID reference from products catalog (optional)'),
  discount: z.number().optional().describe('Fixed discount amount to subtract'),
  discountPercent: z
    .number()
    .optional()
    .describe('Discount as a percentage (e.g., 10 for 10%)'),
  vatIncluded: z
    .boolean()
    .optional()
    .describe('Whether unitPrice already includes VAT (default: false)'),
  productCode: z.string().optional().describe('Product code or SKU for reference'),
});

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'invoices_list',
    description:
      'List invoices for the active company with pagination, filtering, and sorting. Supports filtering by status (draft/issued/sent_to_provider/validated/rejected/cancelled), direction (incoming/outgoing), date range, client, and search term. Returns paginated results with totals.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      page: z.number().int().optional().describe('Page number (default: 1)'),
      limit: z
        .number()
        .int()
        .optional()
        .describe('Items per page, max 100 (default: 20)'),
      search: z
        .string()
        .optional()
        .describe('Search term for invoice number or client name'),
      status: z
        .enum([
          'draft',
          'issued',
          'sent_to_provider',
          'validated',
          'rejected',
          'cancelled',
        ])
        .optional()
        .describe('Filter by invoice status'),
      direction: z
        .enum(['incoming', 'outgoing'])
        .optional()
        .describe('Filter by direction: incoming or outgoing invoices'),
      from: z
        .string()
        .optional()
        .describe('Start date filter in ISO 8601 format (YYYY-MM-DD)'),
      to: z
        .string()
        .optional()
        .describe('End date filter in ISO 8601 format (YYYY-MM-DD)'),
      clientId: z.string().optional().describe('Filter by client UUID'),
      sort: z
        .enum(['issueDate', 'number', 'total', 'dueDate'])
        .optional()
        .describe('Field to sort by (default: issueDate)'),
      order: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order: asc or desc (default: desc)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const {
        page,
        limit,
        search,
        status,
        direction,
        from,
        to,
        clientId,
        sort,
        order,
      } = params as Record<string, string | number | undefined>;

      const result = await apiRequest('/api/v1/invoices', {
        companyId,
        query: {
          page: page as number | undefined,
          limit: limit as number | undefined,
          search: search as string | undefined,
          status: status as string | undefined,
          direction: direction as string | undefined,
          from: from as string | undefined,
          to: to as string | undefined,
          clientId: clientId as string | undefined,
          sort: sort as string | undefined,
          order: order as string | undefined,
        },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_get',
    description:
      'Get complete details for a specific invoice by UUID, including all line items, payment history, events timeline, attachments, client and supplier info, XML/PDF generation status, and ANAF submission details.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_create',
    description:
      'Create a new draft invoice. Requires at least one line item and either a clientId or receiverName/receiverCif. The invoice starts in "draft" status and can be edited until issued. Use invoices_issue to finalize and generate XML/PDF.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      clientId: z
        .string()
        .optional()
        .describe('Client UUID (from clients_list). Either clientId or receiverName should be provided.'),
      receiverName: z
        .string()
        .optional()
        .describe('Receiver name (used when no client entity exists). Either clientId or receiverName should be provided.'),
      receiverCif: z
        .string()
        .optional()
        .describe('Receiver tax ID / CIF (used together with receiverName when no client entity exists)'),
      issueDate: z
        .string()
        .describe('Invoice issue date in ISO 8601 format (YYYY-MM-DD)'),
      dueDate: z
        .string()
        .optional()
        .describe('Payment due date in ISO 8601 format (YYYY-MM-DD)'),
      seriesId: z
        .string()
        .optional()
        .describe('Invoice series UUID (from document_series_list). Uses default if not provided.'),
      currency: z
        .string()
        .optional()
        .describe('ISO 4217 currency code (default: RON)'),
      exchangeRate: z
        .number()
        .optional()
        .describe('Exchange rate relative to RON (default: 1.0)'),
      invoiceTypeCode: z
        .string()
        .optional()
        .describe(
          'UBL invoice type code: 380=commercial (default), 381=credit note, 384=corrected, 389=self-billed'
        ),
      notes: z
        .string()
        .optional()
        .describe('Public notes visible to the client'),
      paymentTerms: z
        .string()
        .optional()
        .describe('Payment terms description (e.g., "Net 30")'),
      deliveryLocation: z
        .string()
        .optional()
        .describe('Delivery address'),
      projectReference: z
        .string()
        .optional()
        .describe('Project reference number'),
      orderNumber: z
        .string()
        .optional()
        .describe('Purchase order number'),
      contractNumber: z
        .string()
        .optional()
        .describe('Contract reference number'),
      issuerName: z
        .string()
        .optional()
        .describe('Name of person issuing the invoice'),
      issuerId: z
        .string()
        .optional()
        .describe('Issuer ID number'),
      mentions: z
        .string()
        .optional()
        .describe('Additional legal mentions on the invoice'),
      internalNote: z
        .string()
        .optional()
        .describe('Internal note (not visible to the client)'),
      salesAgent: z
        .string()
        .optional()
        .describe('Sales agent name'),
      deputyName: z
        .string()
        .optional()
        .describe('Deputy/representative name'),
      deputyIdentityCard: z
        .string()
        .optional()
        .describe('Deputy ID card number'),
      deputyAuto: z
        .string()
        .optional()
        .describe('Deputy vehicle registration number'),
      collect: z
        .union([
          z.boolean(),
          z.object({
            value: z.number().optional().describe('Payment amount (defaults to invoice total)'),
            type: z.enum(['bank_transfer', 'cash', 'card', 'other']).optional().describe('Payment method (default: bank_transfer)'),
            issueDate: z.string().optional().describe('Payment date (YYYY-MM-DD)'),
            documentNumber: z.string().optional().describe('Payment reference number'),
            mentions: z.string().optional().describe('Payment notes'),
          }),
        ])
        .optional()
        .describe(
          'Record an immediate payment. Pass true for full payment with defaults, or an object with value/type/issueDate/documentNumber/mentions for details.'
        ),
      penaltyEnabled: z
        .boolean()
        .optional()
        .describe('Enable late payment penalty (default: false)'),
      penaltyPercentPerDay: z
        .number()
        .optional()
        .describe('Daily penalty percentage (e.g., 0.05 for 0.05% per day)'),
      penaltyGraceDays: z
        .number()
        .int()
        .optional()
        .describe('Grace period in days before penalty starts applying'),
      language: z
        .enum(['ro', 'en', 'de', 'fr'])
        .optional()
        .describe('Document language for PDF generation (default: ro)'),
      lines: z
        .array(lineItemSchema)
        .describe('Invoice line items (at least one required)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...body } = params;

      const result = await apiRequest('/api/v1/invoices', {
        method: 'POST',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_update',
    description:
      'Update an existing draft invoice. Only invoices with status "draft" can be updated. When updating the lines array, the entire array is replaced — include all lines you want to keep. Once issued, use invoices_cancel instead.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID to update'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      clientId: z.string().optional().describe('Client UUID'),
      seriesId: z.string().optional().describe('Invoice series UUID'),
      issueDate: z
        .string()
        .optional()
        .describe('Invoice issue date (YYYY-MM-DD)'),
      dueDate: z
        .string()
        .optional()
        .describe('Payment due date (YYYY-MM-DD)'),
      currency: z.string().optional().describe('ISO 4217 currency code'),
      exchangeRate: z.number().optional().describe('Exchange rate relative to RON'),
      invoiceTypeCode: z.string().optional().describe('UBL invoice type code'),
      notes: z.string().optional().describe('Public notes visible to the client'),
      paymentTerms: z.string().optional().describe('Payment terms description'),
      deliveryLocation: z.string().optional().describe('Delivery address'),
      projectReference: z.string().optional().describe('Project reference number'),
      orderNumber: z.string().optional().describe('Purchase order number'),
      contractNumber: z.string().optional().describe('Contract reference number'),
      issuerName: z.string().optional().describe('Name of person issuing the invoice'),
      issuerId: z.string().optional().describe('Issuer ID number'),
      mentions: z.string().optional().describe('Additional legal mentions'),
      internalNote: z.string().optional().describe('Internal note (not visible to client)'),
      salesAgent: z.string().optional().describe('Sales agent name'),
      deputyName: z.string().optional().describe('Deputy/representative name'),
      deputyIdentityCard: z.string().optional().describe('Deputy ID card number'),
      deputyAuto: z.string().optional().describe('Deputy vehicle registration'),
      penaltyEnabled: z.boolean().optional().describe('Enable late payment penalty'),
      penaltyPercentPerDay: z
        .number()
        .optional()
        .describe('Daily penalty percentage'),
      penaltyGraceDays: z
        .number()
        .int()
        .optional()
        .describe('Grace period before penalty applies'),
      language: z
        .enum(['ro', 'en', 'de', 'fr'])
        .optional()
        .describe('Document language for PDF generation (default: ro)'),
      lines: z
        .array(lineItemSchema)
        .optional()
        .describe(
          'Invoice line items. WARNING: replaces all existing lines — include every line you want to keep.'
        ),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _cid, ...rest } = params as { uuid: string } & Record<
        string,
        unknown
      >;

      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) body[key] = value;
      }

      const result = await apiRequest(`/api/v1/invoices/${uuid}`, {
        method: 'PUT',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_delete',
    description:
      'Permanently delete a draft invoice. Only invoices with status "draft" can be deleted. This action is irreversible. For issued invoices, use invoices_cancel instead.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID to delete'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_issue',
    description:
      'Issue a draft invoice. Validates the data, assigns a series number, generates UBL 2.1 XML, generates PDF (Pro plan), and changes status from "draft" to "issued". Once issued, the invoice cannot be edited. Use invoices_submit to send to ANAF e-Factura.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID to issue'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/issue`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_submit',
    description:
      'Submit an issued invoice to the ANAF e-Factura system. The invoice must be in "issued" status. Changes status to "sent_to_provider". ANAF validates the invoice asynchronously — poll invoices_get or use invoices_events to check validation result.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID to submit to ANAF'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/submit`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_validate',
    description:
      'Validate an invoice before issuing or submitting. Returns a list of errors and warnings. Use mode "quick" for fast validation (basic rules) or "full" for comprehensive UBL Schematron and CIUS-RO compliance checks.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID to validate'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      mode: z
        .enum(['quick', 'full'])
        .optional()
        .describe(
          'Validation mode: "quick" for fast basic rules (default), "full" for UBL Schematron + CIUS-RO compliance (slower)'
        ),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, mode } = params as { uuid: string; mode?: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/validate`, {
        method: 'POST',
        companyId,
        query: mode ? { mode } : undefined,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_cancel',
    description:
      'Cancel an issued invoice. Requires a cancellation reason (minimum 10 characters). Changes status to "cancelled". Cancelled invoices remain in the system for record-keeping. Use invoices_restore to undo an accidental cancellation.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID to cancel'),
      reason: z
        .string()
        .min(10)
        .describe('Reason for cancellation (minimum 10 characters)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, reason } = params as { uuid: string; reason: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/cancel`, {
        method: 'POST',
        companyId,
        body: { reason },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_restore',
    description:
      'Restore a cancelled invoice back to "draft" status. Only for accidental cancellations. Cannot restore if the invoice was submitted to ANAF, has credit notes, or has recorded payments. The invoice can then be edited and reissued.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID to restore from cancelled status'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/restore`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_pdf',
    description:
      'Download the PDF representation of an invoice. Returns base64-encoded binary data with content type. Requires Pro plan. PDF is generated automatically on issue or on-demand when first requested.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/pdf`, {
        companyId,
        binary: true,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_xml',
    description:
      'Download the UBL 2.1 XML file for an issued invoice. Returns the XML text content. The XML is the format required for ANAF e-Factura submission and conforms to CIUS-RO and EN 16931 standards.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/xml`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_email',
    description:
      'Send an invoice via email with optional PDF and XML attachments. Use invoices_email_defaults first to get pre-filled subject and body. Emails are sent asynchronously via queue. PDF attachment requires Pro plan.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID to email'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      to: z.string().email().describe('Recipient email address'),
      cc: z
        .string()
        .optional()
        .describe('CC email address (comma-separated for multiple)'),
      bcc: z
        .string()
        .optional()
        .describe('BCC email address (comma-separated for multiple)'),
      subject: z
        .string()
        .optional()
        .describe('Email subject (uses default template if not provided)'),
      body: z
        .string()
        .optional()
        .describe('Email body text (uses default template if not provided)'),
      attachPdf: z
        .boolean()
        .optional()
        .describe('Attach PDF invoice (default: true, requires Pro plan)'),
      attachXml: z
        .boolean()
        .optional()
        .describe('Attach UBL XML file (default: false)'),
      language: z
        .enum(['ro', 'en'])
        .optional()
        .describe('Email template language: ro (default) or en'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _cid, ...rest } = params as { uuid: string } & Record<
        string,
        unknown
      >;

      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) body[key] = value;
      }

      const result = await apiRequest(`/api/v1/invoices/${uuid}/email`, {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_email_defaults',
    description:
      'Get pre-filled email content for an invoice based on the company email template. Returns suggested "to", "cc", "subject", and "body" with template variables already substituted. Use this to populate the email form before calling invoices_email.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      language: z
        .enum(['ro', 'en'])
        .optional()
        .describe('Email language: ro (default) or en'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, language } = params as { uuid: string; language?: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/email-defaults`, {
        companyId,
        query: language ? { language } : undefined,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_email_history',
    description:
      'Get the complete history of emails sent for an invoice, including delivery status, open/click tracking, bounce information, and who sent each email. Useful for audit trails and verifying client received the invoice.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/emails`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_events',
    description:
      'Get the complete timeline of events for an invoice: status changes, ANAF submissions, validations, emails sent, payments received, and user actions. Useful for audit trails, debugging, and understanding invoice lifecycle history.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/events`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_attachments',
    description:
      'Download a file attachment from an invoice. Returns base64-encoded binary data with the MIME type. Get attachment UUIDs from invoices_get (the "attachments" array). Supports PDF, images, Word, Excel, ZIP, and other file types.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID'),
      attachmentId: z.string().describe('Attachment UUID (from invoices_get attachments array)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, attachmentId } = params as { uuid: string; attachmentId: string };
      const result = await apiRequest(
        `/api/v1/invoices/${uuid}/attachments/${attachmentId}`,
        { companyId, binary: true }
      );
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_verify_signature',
    description:
      'Verify the ANAF digital signature on a validated invoice. Checks certificate validity, signature cryptographic integrity, and XML content integrity. Requires Pro plan and the invoice must be in "validated" status (ANAF-signed).',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID (must be ANAF-validated)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/verify-signature`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_export_csv',
    description:
      'Export a filtered list of invoices to CSV format. Accepts the same filters as invoices_list (status, direction, date range, client, etc.). Returns CSV text with UTF-8 BOM for Excel compatibility. Max 10,000 invoices; use invoices_export_zip for large exports with files.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      search: z.string().optional().describe('Search term for invoice number or client name'),
      status: z
        .enum([
          'draft',
          'issued',
          'sent_to_provider',
          'validated',
          'rejected',
          'cancelled',
        ])
        .optional()
        .describe('Filter by invoice status'),
      direction: z
        .enum(['incoming', 'outgoing'])
        .optional()
        .describe('Filter by direction'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)'),
      clientId: z.string().optional().describe('Filter by client UUID'),
      sort: z
        .enum(['issueDate', 'number', 'total', 'dueDate'])
        .optional()
        .describe('Sort field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { search, status, direction, from, to, clientId, sort, order } = params as Record<
        string,
        string | undefined
      >;

      const result = await apiRequest('/api/v1/invoices/export/csv', {
        companyId,
        query: { search, status, direction, from, to, clientId, sort, order },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_export_zip',
    description:
      'Export a set of invoices (by UUID list) to a ZIP archive containing PDFs, XMLs, and a CSV summary. Processed asynchronously — returns an exportId and statusUrl. Poll the statusUrl or wait for webhook. Requires Pro plan. Max 100 invoices per export.',
    inputSchema: z.object({
      invoiceIds: z
        .array(z.string())
        .max(100)
        .describe('Array of invoice UUIDs to include in the ZIP (max 100)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      includePdf: z
        .boolean()
        .optional()
        .describe('Include PDF files in ZIP (default: true, requires Pro plan)'),
      includeXml: z
        .boolean()
        .optional()
        .describe('Include UBL XML files in ZIP (default: true)'),
      includeCsv: z
        .boolean()
        .optional()
        .describe('Include CSV summary in ZIP (default: true)'),
      folderStructure: z
        .enum(['flat', 'by-client', 'by-month', 'by-series'])
        .optional()
        .describe(
          'ZIP folder organization: flat (default), by-client, by-month, or by-series'
        ),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { invoiceIds, includePdf, includeXml, includeCsv, folderStructure } =
        params as {
          invoiceIds: string[];
          includePdf?: boolean;
          includeXml?: boolean;
          includeCsv?: boolean;
          folderStructure?: string;
        };

      const body: Record<string, unknown> = { invoiceIds };
      if (includePdf !== undefined) body.includePdf = includePdf;
      if (includeXml !== undefined) body.includeXml = includeXml;
      if (includeCsv !== undefined) body.includeCsv = includeCsv;
      if (folderStructure !== undefined) body.folderStructure = folderStructure;

      const result = await apiRequest('/api/v1/invoices/export/zip', {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_bulk_delete',
    description:
      'Delete multiple draft invoices in batch. Only invoices with status "draft" can be deleted. This action is irreversible. Returns count of deleted invoices and any per-item errors.',
    inputSchema: z.object({
      ids: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Array of invoice UUIDs to delete (1–100). Only draft invoices are eligible.'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { ids } = params as { ids: string[] };
      const result = await apiRequest('/api/v1/invoices/bulk-delete', {
        method: 'POST',
        companyId,
        body: { ids },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_bulk_cancel',
    description:
      'Cancel multiple invoices in batch with an optional reason. Returns count of cancelled invoices and any per-item errors.',
    inputSchema: z.object({
      ids: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Array of invoice UUIDs to cancel (1–100)'),
      reason: z
        .string()
        .optional()
        .describe('Reason for cancellation applied to all invoices in the batch'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { ids, reason } = params as { ids: string[]; reason?: string };
      const body: Record<string, unknown> = { ids };
      if (reason !== undefined) body.reason = reason;

      const result = await apiRequest('/api/v1/invoices/bulk-cancel', {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_bulk_storno',
    description:
      'Create storno (refund/credit note) invoices for multiple invoices in batch. Only outgoing invoices with status "issued" or "validated" are eligible. Returns count of created storno invoices and any per-item errors.',
    inputSchema: z.object({
      ids: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe(
          'Array of invoice UUIDs to storno (1–100). Only outgoing, issued/validated invoices are eligible.'
        ),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { ids } = params as { ids: string[] };
      const result = await apiRequest('/api/v1/invoices/bulk-storno', {
        method: 'POST',
        companyId,
        body: { ids },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_bulk_mark_paid',
    description:
      'Mark multiple invoices as fully paid in batch. Creates payment records for each invoice\'s remaining balance. paymentMethod defaults to "bank_transfer". Returns count of updated invoices and any per-item errors.',
    inputSchema: z.object({
      ids: z
        .array(z.string())
        .min(1)
        .max(100)
        .describe('Array of invoice UUIDs to mark as paid (1–100)'),
      paymentMethod: z
        .string()
        .optional()
        .describe('Payment method applied to all invoices (default: bank_transfer)'),
      paidAt: z
        .string()
        .optional()
        .describe('Payment date in ISO 8601 format (YYYY-MM-DD). Defaults to today.'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { ids, paymentMethod, paidAt } = params as {
        ids: string[];
        paymentMethod?: string;
        paidAt?: string;
      };

      const body: Record<string, unknown> = { ids };
      if (paymentMethod !== undefined) body.paymentMethod = paymentMethod;
      if (paidAt !== undefined) body.paidAt = paidAt;

      const result = await apiRequest('/api/v1/invoices/bulk-mark-paid', {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_export_saga_xml',
    description:
      'Export invoices in Saga XML format for accounting software integration (e.g., Saga C). Accepts the same filters as invoices_export_csv. Returns XML text content.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      search: z.string().optional().describe('Search term for invoice number or client name'),
      status: z
        .enum([
          'draft',
          'issued',
          'sent_to_provider',
          'validated',
          'rejected',
          'cancelled',
        ])
        .optional()
        .describe('Filter by invoice status'),
      direction: z
        .enum(['incoming', 'outgoing'])
        .optional()
        .describe('Filter by direction'),
      from: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date (YYYY-MM-DD)'),
      clientId: z.string().optional().describe('Filter by client UUID'),
      sort: z
        .enum(['issueDate', 'number', 'total', 'dueDate'])
        .optional()
        .describe('Sort field'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { search, status, direction, from, to, clientId, sort, order } = params as Record<
        string,
        string | undefined
      >;

      const result = await apiRequest('/api/v1/invoices/export/saga-xml', {
        companyId,
        query: { search, status, direction, from, to, clientId, sort, order },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_export_receipts_saga_xml',
    description:
      'Export payment receipts (incasari) in Saga XML format. Exports all outgoing invoice payments for accounting software integration.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const result = await apiRequest('/api/v1/invoices/export/receipts-saga-xml', {
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_export_payments_saga_xml',
    description:
      'Export supplier payments (plati) in Saga XML format. Exports all incoming invoice payments for accounting software integration.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const result = await apiRequest('/api/v1/invoices/export/payments-saga-xml', {
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_export_efactura_zip',
    description:
      'Export e-Factura XML files as a ZIP archive. For large batches (>100 invoices), the export is processed asynchronously and returns a job ID to poll for completion.',
    inputSchema: z.object({
      direction: z
        .enum(['outgoing', 'incoming'])
        .describe('Invoice direction to export'),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date filter in ISO 8601 format (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('End date filter in ISO 8601 format (YYYY-MM-DD)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { direction, dateFrom, dateTo } = params as {
        direction: string;
        dateFrom?: string;
        dateTo?: string;
      };

      const body: Record<string, unknown> = { direction };
      if (dateFrom !== undefined) body.dateFrom = dateFrom;
      if (dateTo !== undefined) body.dateTo = dateTo;

      const result = await apiRequest('/api/v1/invoices/export/efactura-zip', {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_share_links_list',
    description:
      'List all share links for an invoice, including view counts, expiry info, and status (active/revoked/expired).',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/share-links`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_share_links_create',
    description:
      'Create a new shareable link for an invoice. Returns the share URL, token, and expiry date. The link allows the recipient to view the invoice without authentication.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID'),
      expiryDays: z
        .number()
        .int()
        .optional()
        .describe('Number of days until the link expires (default: 30)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, expiryDays } = params as { uuid: string; expiryDays?: number };
      const body: Record<string, unknown> = {};
      if (expiryDays !== undefined) body.expiryDays = expiryDays;

      const result = await apiRequest(`/api/v1/invoices/${uuid}/share-links`, {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'invoices_share_links_revoke',
    description:
      'Revoke/delete a share link for an invoice, making it permanently inaccessible. Get linkId from invoices_share_links_list.',
    inputSchema: z.object({
      uuid: z.string().describe('Invoice UUID'),
      linkId: z.string().describe('Share link ID to revoke (from invoices_share_links_list)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, linkId } = params as { uuid: string; linkId: string };
      const result = await apiRequest(`/api/v1/invoices/${uuid}/share-links/${linkId}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(result);
    },
  },
];
