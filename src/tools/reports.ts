import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'reports_vat',
    description:
      'VAT (TVA) summary of a period: issued (collected) and received (deductible) invoices totalled and broken down by VAT rate, net VAT and invoice counts, in the invoice currencies. Period: year+month (default: current month), year+quarter, year+period=year (whole year) or from+to (YYYY-MM-DD). Filters: direction (outgoing|incoming), clientId, supplierId, currency (ISO code), vatRate (only the lines at that rate count), documentType (invoice|credit_note), finalOnly (leave drafts, rejected and converted documents out). Requires X-Company header (companyId param or STORNO_COMPANY_ID env var).',
    inputSchema: z.object({
      year: z.number().int().min(2000).max(2100).optional().describe('Report year (default: current year)'),
      month: z.number().int().min(1).max(12).optional().describe('Report month (1–12); the default period when no quarter / period / range is given'),
      quarter: z.number().int().min(1).max(4).optional().describe('Quarter (1–4) instead of a month'),
      period: z.enum(['year']).optional().describe("'year' for the whole year"),
      from: z.string().optional().describe('Range start, YYYY-MM-DD (with to)'),
      to: z.string().optional().describe('Range end, YYYY-MM-DD (with from)'),
      direction: z.enum(['outgoing', 'incoming']).optional().describe('Only issued or only received invoices'),
      clientId: z.string().optional().describe('Only invoices of this client (UUID)'),
      supplierId: z.string().optional().describe('Only invoices of this supplier (UUID)'),
      currency: z.string().optional().describe('Only invoices in this currency (ISO code, e.g. RON)'),
      vatRate: z.number().optional().describe('Only the lines at this VAT rate (e.g. 21); totals are then summed from those lines'),
      documentType: z.enum(['invoice', 'credit_note']).optional().describe('Only invoices or only credit notes'),
      finalOnly: z.boolean().optional().describe('Leave drafts, rejected and converted documents out (cancelled ones never count)'),
      companyId: z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { companyId, ...rest } = params as Record<string, unknown> & { companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const query: Record<string, string | number | boolean> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined && v !== null && v !== '') query[k] = v as string | number | boolean;
      }
      if (query.finalOnly === true) query.finalOnly = 1;
      if (query.finalOnly === false) delete query.finalOnly;

      const res = await apiRequest('/api/v1/reports/vat', {
        companyId: effectiveCompanyId,
        query,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'reports_vat_oss',
    description:
      'Quarterly OSS (One Stop Shop, EU special scheme) view of the VAT: VAT charged to consumers in other EU member states, grouped by state of consumption, rate and invoice currency, converted to EUR at the ECB rate of the last day of the quarter (the D398 rule). Returns the payment due date (end of the month after the quarter), the unique reference RO/<vatCode>/Q<n>.<year> and the ANAF OSS account. EUR amounts are null while the quarter is still running (no ECB rate yet).',
    inputSchema: z.object({
      year: z.number().int().min(2000).max(2100).describe('Report year (e.g. 2026)'),
      quarter: z.number().int().min(1).max(4).describe('Quarter (1–4)'),
      companyId: z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { year, quarter, companyId } = params as { year: number; quarter: number; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/reports/vat/oss', {
        companyId: effectiveCompanyId,
        query: { year, quarter },
      });
      return formatResponse(res);
    },
  },
  {
    name: 'reports_sales_analysis',
    description:
      'Generate a sales analysis report for a date range. Returns KPI summary (annual total, invoiced, collected, outstanding), monthly revenue trends, recent invoices, top clients, and top products. Requires X-Company header (companyId param or STORNO_COMPANY_ID env var).',
    inputSchema: z.object({
      dateFrom: z
        .string()
        .describe('Start date in YYYY-MM-DD format (e.g. 2026-01-01)'),
      dateTo: z
        .string()
        .describe('End date in YYYY-MM-DD format (e.g. 2026-02-26)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { dateFrom, dateTo, companyId } = params as {
        dateFrom: string;
        dateTo: string;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/reports/sales', {
        companyId: effectiveCompanyId,
        query: { dateFrom, dateTo },
      });
      return formatResponse(res);
    },
  },
  {
    name: 'balance_analysis',
    description:
      'Get balance analysis (Analiza Balante) for a year. Returns the standard indicator bag (revenue, expenses, profit, turnover, salaries, etc.), monthly evolution, top expenses, year-over-year comparison, plus 8 grouped financial-ratio sections: balanceSheet (raw figures), liquidity (current/quick/cash ratio + working capital + NFR + net cash), solvency (debt-to-equity, financial autonomy, debt ratio, general solvency, interest coverage), profitabilityRatios (gross/operating/EBITDA/net margins, ROA/ROE/ROCE, EBIT, EBITDA), efficiency (asset/fixed-asset/inventory turnover, DSO/DPO/CCC), fiscal (VAT payable, salary debts, state-budget debts, micro-enterprise EUR threshold, VAT RON threshold), cashflow (cash runway in months, burn rate, break-even, contribution rate, operating leverage), aging (receivables aging buckets 0-30/31-60/61-90/90+ with IFRS 9 simplified provision), concentration (top 5/10 client revenue share, top clients list). Each ratio carries status: normal|warning|critical|na. Trial-balance sections show hasData=false until balances are uploaded; aging and concentration come from invoice data. Requires X-Company header.',
    inputSchema: z.object({
      year: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .describe('Analysis year (e.g. 2025)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { year, companyId } = params as { year: number; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/balances/analysis', {
        companyId: effectiveCompanyId,
        query: { year },
      });
      return formatResponse(res);
    },
  },
  {
    name: 'balance_list',
    description:
      'List uploaded trial balances (Balante de verificare) for a year. Shows upload status (pending/processing/completed/failed), month, account count, and source software for each uploaded balance.',
    inputSchema: z.object({
      year: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .describe('Year to list balances for (e.g. 2025)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { year, companyId } = params as { year: number; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/balances', {
        companyId: effectiveCompanyId,
        query: { year },
      });
      return formatResponse(res);
    },
  },
  {
    name: 'balance_rows',
    description:
      'Get the parsed account rows for a trial balance. Returns all account codes, names, and 10 numeric columns (initial/previous/current/total/final debit & credit). Useful for verifying PDF parsing results.',
    inputSchema: z.object({
      id: z.string().describe('Trial balance UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, companyId } = params as { id: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/balances/${id}/rows`, {
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'balance_reprocess',
    description:
      'Reprocess a trial balance PDF. Re-parses the PDF file and updates the account rows. Useful after parser improvements.',
    inputSchema: z.object({
      id: z.string().describe('Trial balance UUID to reprocess'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, companyId } = params as { id: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/balances/${id}/reprocess`, {
        companyId: effectiveCompanyId,
        method: 'POST',
      });
      return formatResponse(res);
    },
  },
  {
    name: 'balance_delete',
    description:
      'Delete an uploaded trial balance by ID. This soft-deletes the balance and its parsed account rows.',
    inputSchema: z.object({
      id: z.string().describe('Trial balance UUID to delete'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, companyId } = params as { id: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/balances/${id}`, {
        companyId: effectiveCompanyId,
        method: 'DELETE',
      });
      return formatResponse(res);
    },
  },
];
