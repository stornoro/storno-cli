import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'accounting_export_settings_get',
    description:
      'Get the accounting export configuration for the active company. Returns settings for Saga, Winmentor, and Ciel accounting software integrations including account codes, journal mappings, and export preferences.',
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

      const result = await apiRequest('/api/v1/accounting-export/settings', { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'accounting_export_settings_update',
    description:
      'Update accounting export configuration for the active company. Settings are merged with existing config. Configure account codes, journal mappings, and export preferences for Saga, Winmentor, or Ciel.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      settings: z
        .record(z.unknown())
        .describe('Accounting export settings object to merge with existing config'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { settings } = params as { settings: Record<string, unknown> };
      const result = await apiRequest('/api/v1/accounting-export/settings', {
        method: 'PUT',
        companyId,
        body: settings,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'accounting_export_zip',
    description:
      'Export accounting data as a ZIP archive for import into accounting software (Saga, Winmentor, or Ciel). The ZIP contains XML files for clients, suppliers, products, invoices, receipts, and payments. Filter by date range. For SAGA you may override the chart-of-accounts at export time (e.g. card analytic 5125.2) via accounts.{cash,bank,card,clients,suppliers}; values fall back to the company’s stored settings.',
    inputSchema: z.object({
      target: z
        .enum(['saga', 'winmentor', 'ciel'])
        .describe('Target accounting software format'),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date filter (YYYY-MM-DD)'),
      dateTo: z
        .string()
        .optional()
        .describe('End date filter (YYYY-MM-DD)'),
      includeDiscount: z
        .boolean()
        .optional()
        .describe('SAGA only: include invoice-level discount in <Antet>'),
      exportAccounts: z
        .boolean()
        .optional()
        .describe('SAGA only: include conturi_cli/conturi_frn files (default true)'),
      exportBnr: z
        .boolean()
        .optional()
        .describe('SAGA only: include curs_bnr file with current exchange rates'),
      accounts: z
        .object({
          cash: z.string().optional().describe('Cash account, e.g. 5311'),
          bank: z.string().optional().describe('Bank transfer account, e.g. 5121'),
          card: z.string().optional().describe('Card analytic account, e.g. 5125.2 (SAGA requires a leaf analytic)'),
          clients: z.string().optional().describe('Clients account, e.g. 4111'),
          suppliers: z.string().optional().describe('Suppliers account, e.g. 4011'),
        })
        .partial()
        .optional()
        .describe('SAGA only: per-export chart-of-accounts overrides; missing keys fall back to stored settings'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const {
        target,
        dateFrom,
        dateTo,
        includeDiscount,
        exportAccounts,
        exportBnr,
        accounts,
      } = params as {
        target: string;
        dateFrom?: string;
        dateTo?: string;
        includeDiscount?: boolean;
        exportAccounts?: boolean;
        exportBnr?: boolean;
        accounts?: Record<string, string | undefined>;
      };

      const body: Record<string, unknown> = { target };
      if (dateFrom) body.dateFrom = dateFrom;
      if (dateTo) body.dateTo = dateTo;

      const options: Record<string, unknown> = {};
      if (includeDiscount !== undefined) options.includeDiscount = includeDiscount;
      if (exportAccounts !== undefined) options.exportAccounts = exportAccounts;
      if (exportBnr !== undefined) options.exportBnr = exportBnr;
      if (accounts && Object.keys(accounts).length > 0) options.accounts = accounts;
      if (Object.keys(options).length > 0) body.options = options;

      const result = await apiRequest('/api/v1/accounting-export/zip', {
        method: 'POST',
        companyId,
        body,
        binary: true,
      });
      return formatResponse(result);
    },
  },
];
