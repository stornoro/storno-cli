import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'import_sources',
    description:
      'Get available import sources and import types. Returns supported import sources (SmartBill, Saga, Oblio, FGO, Facturis, etc.) and import types (clients, products, invoices_issued, invoices_received, recurring_invoices).',
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

      const result = await apiRequest('/api/v1/import/sources', { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'import_preview',
    description:
      'Get a preview of an uploaded import job including detected columns, sample data, and column mapping suggestions. Use after uploading a file to review before executing.',
    inputSchema: z.object({
      id: z.string().describe('Import job ID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id } = params as { id: string };
      const result = await apiRequest(`/api/v1/import/${id}/preview`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'import_mapping',
    description:
      'Save column mapping for an import job. Maps CSV columns to Storno fields. Call after reviewing the preview to confirm or adjust mappings before executing.',
    inputSchema: z.object({
      id: z.string().describe('Import job ID'),
      columnMapping: z
        .record(z.string())
        .describe('Object mapping CSV column names to Storno field names'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id, columnMapping } = params as {
        id: string;
        columnMapping: Record<string, string>;
      };
      const result = await apiRequest(`/api/v1/import/${id}/mapping`, {
        method: 'PATCH',
        companyId,
        body: { columnMapping },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'import_execute',
    description:
      'Execute an import job after mapping is confirmed. The import runs asynchronously via a message queue. Check status with import_get.',
    inputSchema: z.object({
      id: z.string().describe('Import job ID'),
      importOptions: z
        .record(z.unknown())
        .optional()
        .describe('Optional import options (e.g., skipDuplicates, updateExisting)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id, importOptions } = params as {
        id: string;
        importOptions?: Record<string, unknown>;
      };

      const body: Record<string, unknown> = {};
      if (importOptions) body.importOptions = importOptions;

      const result = await apiRequest(`/api/v1/import/${id}/execute`, {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'import_get',
    description:
      'Get full status and details of an import job including progress, row counts (imported, skipped, failed), and error details.',
    inputSchema: z.object({
      id: z.string().describe('Import job ID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id } = params as { id: string };
      const result = await apiRequest(`/api/v1/import/${id}`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'import_upload',
    description:
      'Upload a file (CSV, XLSX, or XML) to start a new import job. Requires importType (clients, products, invoices_issued, invoices_received, recurring_invoices) and source (smartbill, saga, oblio, fgo, facturis_online, easybill, ciel, factureaza, facturare_pro, icefact, bolt, facturis, emag, generic). Returns the created import job with preview data.',
    inputSchema: z.object({
      filePath: z.string().describe('Absolute path to the file to upload (CSV, XLSX, or XML)'),
      importType: z
        .enum(['clients', 'products', 'invoices_issued', 'invoices_received', 'recurring_invoices'])
        .describe('Type of data being imported'),
      source: z
        .enum([
          'smartbill', 'saga', 'oblio', 'fgo', 'facturis_online', 'easybill',
          'ciel', 'factureaza', 'facturare_pro', 'icefact', 'bolt', 'facturis', 'emag', 'generic',
        ])
        .describe('Source application the file was exported from'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { filePath, importType, source } = params as {
        filePath: string;
        importType: string;
        source: string;
      };

      const result = await apiRequest('/api/v1/import/upload', {
        method: 'POST',
        companyId,
        filePath,
        formFields: { importType, source },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'import_template',
    description:
      'Download a CSV template for a specific import type. Returns base64-encoded CSV with column headers and example rows that can be filled in and uploaded via import_upload.',
    inputSchema: z.object({
      importType: z
        .enum(['clients', 'products', 'invoices_issued', 'invoices_received', 'recurring_invoices'])
        .describe('Type of import to get template for'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { importType } = params as { importType: string };
      const result = await apiRequest('/api/v1/import/template', {
        companyId,
        binary: true,
        query: { importType },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'import_history',
    description:
      'List past import jobs for the active company. Returns job ID, type, source, status, row counts, and timestamps.',
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe('Number of results (max 200, default: 50)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { limit } = params as { limit?: number };
      const result = await apiRequest('/api/v1/import/history', {
        companyId,
        query: { limit },
      });
      return formatResponse(result);
    },
  },
];
