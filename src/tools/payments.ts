import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'payments_list',
    description:
      'List all payments recorded for a specific invoice, ordered by payment date (most recent first). Returns payment amount, date, method, reference number, and notes. The sum of payments determines the invoice amountPaid and balance.',
    inputSchema: z.object({
      invoiceId: z.string().describe('Invoice UUID to list payments for'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { invoiceId } = params as { invoiceId: string };
      const result = await apiRequest(`/api/v1/invoices/${invoiceId}/payments`, {
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'payments_create',
    description:
      'Record a payment received for an invoice. Updates the invoice amountPaid and balance, and automatically changes invoice status to "partially_paid" or "paid" as appropriate. Supports partial payments with full details (method, reference, notes).',
    inputSchema: z.object({
      invoiceId: z.string().describe('Invoice UUID to record payment for'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      amount: z
        .number()
        .positive()
        .describe('Payment amount (must be greater than 0)'),
      paymentDate: z
        .string()
        .describe('Date payment was received in ISO 8601 format (YYYY-MM-DD)'),
      paymentMethod: z
        .enum(['bank_transfer', 'cash', 'card', 'other'])
        .optional()
        .describe(
          'Payment method: bank_transfer (default), cash, card, or other'
        ),
      currency: z
        .string()
        .optional()
        .describe(
          'Currency code (ISO 4217). Defaults to invoice currency. Include if payment is in a different currency.'
        ),
      reference: z
        .string()
        .optional()
        .describe('Payment reference number (e.g., bank transfer reference, receipt number)'),
      notes: z
        .string()
        .optional()
        .describe('Additional notes about this payment'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { invoiceId, companyId: _cid, ...rest } = params as {
        invoiceId: string;
      } & Record<string, unknown>;

      const body: Record<string, unknown> = {};
      const fields = ['amount', 'paymentDate', 'paymentMethod', 'currency', 'reference', 'notes'];
      for (const field of fields) {
        if (rest[field] !== undefined) body[field] = rest[field];
      }

      const result = await apiRequest(`/api/v1/invoices/${invoiceId}/payments`, {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'payments_delete',
    description:
      'Permanently delete a recorded payment from an invoice. Updates the invoice amountPaid and balance, and may change the invoice status back to "unpaid" or "partially_paid". This action is irreversible — use with caution for corrections.',
    inputSchema: z.object({
      invoiceId: z.string().describe('Invoice UUID'),
      paymentId: z.string().describe('Payment UUID to delete (from payments_list)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { invoiceId, paymentId } = params as {
        invoiceId: string;
        paymentId: string;
      };
      const result = await apiRequest(
        `/api/v1/invoices/${invoiceId}/payments/${paymentId}`,
        { method: 'DELETE', companyId }
      );
      return formatResponse(result);
    },
  },
];
