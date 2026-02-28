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
      'Export accounting data as a ZIP archive for import into accounting software (Saga, Winmentor, or Ciel). The ZIP contains XML files for clients, suppliers, products, invoices, receipts, and payments. Filter by date range.',
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
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { target, dateFrom, dateTo } = params as {
        target: string;
        dateFrom?: string;
        dateTo?: string;
      };

      const body: Record<string, unknown> = { target };
      if (dateFrom) body.dateFrom = dateFrom;
      if (dateTo) body.dateTo = dateTo;

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
