import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'reports_vat',
    description:
      'Generate a detailed VAT (TVA) report for a specific month. Returns a summary of sales, purchases, VAT collected, VAT deductible, and net VAT due, along with per-invoice details. Requires X-Company header (companyId param or STORNO_COMPANY_ID env var).',
    inputSchema: z.object({
      year: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .describe('Report year (e.g. 2026)'),
      month: z
        .number()
        .int()
        .min(1)
        .max(12)
        .describe('Report month (1–12)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { year, month, companyId } = params as {
        year: number;
        month: number;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/reports/vat', {
        companyId: effectiveCompanyId,
        query: { year, month },
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
      'Get balance analysis (Analiza Balante) for a year. Returns financial indicators (revenue, expenses, profit, turnover, salaries, etc.), monthly evolution, profitability ratios, top expenses by account, and year-over-year comparison. Data comes from uploaded trial balance PDFs. Requires X-Company header.',
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
