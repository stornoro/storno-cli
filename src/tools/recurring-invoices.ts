import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

const recurringLineItemSchema = z.object({
  description: z.string().describe('Line item description'),
  quantity: z.number().describe('Quantity (must be > 0)'),
  unitPrice: z.number().describe('Price per unit'),
  vatRateId: z.string().describe('UUID of the VAT rate'),
  unitOfMeasure: z.string().optional().describe('Unit of measure code (default: "buc")'),
  productId: z.string().optional().describe('UUID of linked product'),
  priceRule: z
    .enum(['fixed', 'exchange_rate', 'markup'])
    .optional()
    .describe('Pricing rule: fixed (default), exchange_rate, or markup'),
  referenceCurrency: z.string().optional().describe('Reference currency (required if priceRule is exchange_rate)'),
  markupPercent: z.number().optional().describe('Markup percentage (required if priceRule is markup)'),
});

export const tools = [
  {
    name: 'recurring_invoices_list',
    description:
      'List recurring invoice templates for the selected company. Supports filtering by active status and frequency.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 20, max: 100)'),
      search: z.string().optional().describe('Search term to filter by reference or notes'),
      isActive: z.boolean().optional().describe('Filter by active status (true/false)'),
      frequency: z
        .enum(['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual'])
        .optional()
        .describe('Filter by generation frequency'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/recurring-invoices', {
        companyId,
        query: {
          page: params.page as number | undefined,
          limit: params.limit as number | undefined,
          search: params.search as string | undefined,
          isActive: params.isActive as boolean | undefined,
          frequency: params.frequency as string | undefined,
        },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'recurring_invoices_get',
    description:
      'Get detailed information about a specific recurring invoice template including all line items used as a template for generated invoices.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the recurring invoice template'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/recurring-invoices/${params.uuid}`, { companyId });
      return formatResponse(res);
    },
  },

  {
    name: 'recurring_invoices_create',
    description:
      'Create a new recurring invoice template. The system will automatically generate invoices based on the specified frequency and schedule. Supports fixed, exchange_rate, and markup pricing rules on line items.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      clientId: z.string().describe('UUID of the client'),
      seriesId: z.string().describe('UUID of the document series'),
      reference: z.string().optional().describe('Human-readable reference for this recurring invoice'),
      documentType: z.enum(['invoice', 'credit_note']).describe('Document type to generate'),
      currency: z.string().describe('ISO 4217 currency code (e.g., RON, EUR)'),
      invoiceTypeCode: z.string().describe('e-Factura invoice type code (e.g., "380")'),
      frequency: z
        .enum(['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual'])
        .describe('How often to generate invoices'),
      frequencyDay: z.number().describe('Day of month for generation (1-31)'),
      frequencyMonth: z.number().optional().describe('Month for annual generation (1-12, required if frequency is annual)'),
      nextIssuanceDate: z.string().describe('ISO 8601 date for the first invoice generation (YYYY-MM-DD)'),
      stopDate: z.string().optional().describe('ISO 8601 date to stop generation (YYYY-MM-DD)'),
      dueDateType: z.enum(['fixed', 'relative']).describe('How due date is calculated'),
      dueDateDays: z
        .number()
        .optional()
        .describe('Days after issue date for due date (required if dueDateType is relative)'),
      dueDateFixedDay: z
        .number()
        .optional()
        .describe('Fixed day of month for due date (1-31, required if dueDateType is fixed)'),
      notes: z.string().optional().describe('Internal notes'),
      paymentTerms: z.string().optional().describe('Payment terms text'),
      autoEmailEnabled: z.boolean().optional().describe('Auto-send email on invoice generation (default: false)'),
      autoEmailTime: z.string().optional().describe('Time to send email (HH:mm, default: "09:00")'),
      autoEmailDayOffset: z.number().optional().describe('Days offset for email sending (default: 0)'),
      penaltyEnabled: z.boolean().optional().describe('Enable late payment penalties (default: false)'),
      penaltyPercentPerDay: z.number().optional().describe('Daily penalty percentage'),
      penaltyGraceDays: z.number().optional().describe('Grace period in days before penalties apply'),
      lines: z.array(recurringLineItemSchema).describe('Array of line items (minimum 1 required)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...body } = params;
      const res = await apiRequest('/api/v1/recurring-invoices', {
        method: 'POST',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'recurring_invoices_update',
    description:
      'Update an existing recurring invoice template. All fields are optional but at least one must be provided. When updating lines, the entire lines array replaces existing lines.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the recurring invoice template to update'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      clientId: z.string().optional().describe('UUID of the client'),
      seriesId: z.string().optional().describe('UUID of the document series'),
      reference: z.string().optional().describe('Human-readable reference'),
      documentType: z.enum(['invoice', 'credit_note']).optional().describe('Document type to generate'),
      currency: z.string().optional().describe('ISO 4217 currency code'),
      invoiceTypeCode: z.string().optional().describe('e-Factura invoice type code'),
      frequency: z
        .enum(['weekly', 'biweekly', 'monthly', 'bimonthly', 'quarterly', 'semiannual', 'annual'])
        .optional()
        .describe('How often to generate invoices'),
      frequencyDay: z.number().optional().describe('Day of month for generation (1-31)'),
      frequencyMonth: z.number().optional().describe('Month for annual generation (1-12)'),
      nextIssuanceDate: z.string().optional().describe('ISO 8601 date for next invoice generation (YYYY-MM-DD)'),
      stopDate: z.string().nullable().optional().describe('ISO 8601 date to stop generation (null to remove)'),
      dueDateType: z.enum(['fixed', 'relative']).optional().describe('How due date is calculated'),
      dueDateDays: z.number().optional().describe('Days after issue date for due date'),
      dueDateFixedDay: z.number().optional().describe('Fixed day of month for due date (1-31)'),
      notes: z.string().nullable().optional().describe('Internal notes'),
      paymentTerms: z.string().nullable().optional().describe('Payment terms text'),
      autoEmailEnabled: z.boolean().optional().describe('Auto-send email on invoice generation'),
      autoEmailTime: z.string().optional().describe('Time to send email (HH:mm)'),
      autoEmailDayOffset: z.number().optional().describe('Days offset for email sending'),
      penaltyEnabled: z.boolean().optional().describe('Enable late payment penalties'),
      penaltyPercentPerDay: z.number().optional().describe('Daily penalty percentage'),
      penaltyGraceDays: z.number().optional().describe('Grace period in days before penalties apply'),
      lines: z.array(recurringLineItemSchema).optional().describe('Array of line items (replaces all existing lines)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _cid, ...body } = params;
      const res = await apiRequest(`/api/v1/recurring-invoices/${uuid}`, {
        method: 'PUT',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'recurring_invoices_delete',
    description:
      'Permanently delete a recurring invoice template. Previously generated invoices from this template are not affected. Use toggle to temporarily pause instead.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the recurring invoice template to delete'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/recurring-invoices/${params.uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'recurring_invoices_toggle',
    description:
      'Toggle the active status of a recurring invoice template to pause or resume automatic invoice generation. If active, it will be paused; if paused, it will be resumed.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the recurring invoice template to toggle'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/recurring-invoices/${params.uuid}/toggle`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'recurring_invoices_bulk_delete',
    description:
      'Delete multiple recurring invoice templates in a single request. Returns the count of deleted items and any errors for items that could not be deleted.',
    inputSchema: z.object({
      ids: z.array(z.string()).min(1).max(100).describe('Array of recurring invoice UUIDs to delete (1-100)'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/recurring-invoices/bulk-delete', {
        method: 'POST',
        companyId,
        body: { ids: params.ids },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'recurring_invoices_bulk_toggle_active',
    description:
      'Toggle the active/paused status of multiple recurring invoices at once. Set active=true to resume or active=false to pause invoice generation.',
    inputSchema: z.object({
      ids: z.array(z.string()).min(1).max(100).describe('Array of recurring invoice UUIDs (1-100)'),
      active: z.boolean().describe('Set to true to activate, false to pause'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/recurring-invoices/bulk-toggle-active', {
        method: 'POST',
        companyId,
        body: { ids: params.ids, active: params.active },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'recurring_invoices_bulk_issue_now',
    description:
      'Immediately generate invoices from multiple recurring invoice templates. Useful for triggering generation outside the normal schedule. Does not update the nextIssuanceDate.',
    inputSchema: z.object({
      ids: z.array(z.string()).min(1).max(100).describe('Array of recurring invoice UUIDs (1-100)'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/recurring-invoices/bulk-issue-now', {
        method: 'POST',
        companyId,
        body: { ids: params.ids },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'recurring_invoices_issue_now',
    description:
      'Manually trigger immediate invoice generation from a recurring invoice template, bypassing the scheduled generation. Useful for testing configurations or creating one-off invoices. Does not update the nextIssuanceDate.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the recurring invoice template to issue now'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/recurring-invoices/${params.uuid}/issue-now`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(res);
    },
  },
];
