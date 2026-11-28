import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

const companyId = z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)');

export const tools = [
  {
    name: 'clients_insights',
    description:
      'Summary of one client over the last 12 months (current month included): how late it pays, what it buys, its share of the company sales, the monthly series and the top items. Use it to answer "is this client a good payer?", "how much do we invoice them?" or "what do they buy?". Amounts are net of VAT in the company currency. avgDaysLate needs at least 5 fully paid invoices and is null below that; a percent is null when there is no positive base to compare with. Drafts, cancelled and rejected invoices and proformas are not counted. Needs client.view and invoice.view.',
    inputSchema: z.object({
      uuid: z.string().uuid().describe('Client UUID'),
      companyId,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/clients/${params.uuid}/insights`, { companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'suppliers_insights',
    description:
      'Summary of one supplier over the last 12 months (current month included): what the company bought, its share of all purchases, this month against last month, what is still payable (VAT included), the top items, the item whose unit price rose the most, and the months a recurring service was missing or billed twice. Use it before paying or negotiating with a supplier. Amounts are net of VAT in the company currency unless a field is a balance or a due amount. Items group descriptions that differ only by a date, a period or HTML leftovers; samples shows up to three descriptions as received. Needs client.view and invoice.view.',
    inputSchema: z.object({
      uuid: z.string().uuid().describe('Supplier UUID'),
      companyId,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/suppliers/${params.uuid}/insights`, { companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'invoices_insights',
    description:
      'Context for one invoice. Every invoice gets how its net value compares with the partner usual one (the median of earlier invoices in the same currency, null below 5). An issued invoice also gets the expected payment date (due date moved by the client average delay) and what the client owes in total. A received invoice also gets its lines under clean names, the lines whose unit price rose against the last month, and what else falls due in the same week. Use it to review an invoice before approving or chasing it. Balances and due amounts include VAT, the rest is net.',
    inputSchema: z.object({
      uuid: z.string().uuid().describe('Invoice UUID'),
      companyId,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/invoices/${params.uuid}/insights`, { companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'reports_expenses',
    description:
      'Where the money went in one month: total purchases against the month before and the same month last year, the 12-month series ending at that month, the 5 largest suppliers and items, and the increases worth a look (suppliers and unit prices that rose sharply). Use it to answer "why did we spend more this month?". Amounts are net of VAT in the company currency; a percent is null when there is no positive base. Needs report.view and a plan with reports (otherwise 402 PLAN_LIMIT). A bad month answers 422 INVALID_MONTH.',
    inputSchema: z.object({
      month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional().describe('Month as YYYY-MM (default: the current month)'),
      companyId,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(
        await apiRequest('/api/v1/reports/expenses', {
          companyId: params.companyId as string | undefined,
          query: { month: params.month as string | undefined },
        }),
      );
    },
  },
];
