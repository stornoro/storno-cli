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
        .enum(['bank_transfer', 'cash', 'card', 'cheque', 'other'])
        .optional()
        .describe(
          'Payment method: bank_transfer (default), cash, card, cheque, or other'
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

  {
    name: 'payments_receipt_issue',
    description:
      'Issue the chitanță (cash receipt) for a cash payment already recorded on an issued invoice: a number from the receipt series (the company default, or seriesId) and a date (default: the payment date). The receipt documents the existing payment and never records a second one — the invoice balance and the cash register keep the same single payment. Idempotent: a payment that already has a receipt keeps it. 422 for non-cash payments, received invoices, or when no receipt series exists.',
    inputSchema: z.object({
      invoiceId: z.string().describe('Invoice UUID'),
      paymentId: z.string().describe('Payment UUID (from payments_list; paymentMethod must be cash)'),
      seriesId: z.string().optional().describe('Receipt series UUID (type receipt); default: the company default receipt series'),
      date: z.string().optional().describe('Receipt date YYYY-MM-DD (default: the payment date)'),
      companyId: z.string().optional().describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();
      const { invoiceId, paymentId, seriesId, date } = params as { invoiceId: string; paymentId: string; seriesId?: string; date?: string };
      const body: Record<string, string> = {};
      if (seriesId) body.seriesId = seriesId;
      if (date) body.date = date;
      const result = await apiRequest(`/api/v1/invoices/${invoiceId}/payments/${paymentId}/receipt`, { method: 'POST', body, companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'payments_receipt_pdf',
    description:
      'Download the PDF of the chitanță issued for a cash payment (see payments_receipt_issue). A5 landscape: company, payer, amount in figures and in words, the invoice it settles, the payment date.',
    inputSchema: z.object({
      invoiceId: z.string().describe('Invoice UUID'),
      paymentId: z.string().describe('Payment UUID with a receipt issued'),
      companyId: z.string().optional().describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();
      const { invoiceId, paymentId } = params as { invoiceId: string; paymentId: string };
      const result = await apiRequest(`/api/v1/invoices/${invoiceId}/payments/${paymentId}/receipt/pdf`, { companyId, binary: true });
      return formatResponse(result);
    },
  },
];
