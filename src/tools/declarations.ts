import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'declarations_list',
    description:
      'List tax declarations for the active company. Supports filtering by type, status, year, and month. Returns paginated list of declarations with their status and period.',
    inputSchema: z.object({
      type: z
        .enum(['d394', 'd300', 'd390', 'd100', 'd112'])
        .optional()
        .describe('Declaration type filter'),
      status: z
        .enum(['draft', 'validated', 'submitted', 'processing', 'accepted', 'rejected', 'error'])
        .optional()
        .describe('Status filter'),
      year: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .optional()
        .describe('Year filter (e.g. 2026)'),
      month: z
        .number()
        .int()
        .min(1)
        .max(12)
        .optional()
        .describe('Month filter (1–12)'),
      page: z.number().int().optional().describe('Page number (default: 1)'),
      limit: z.number().int().optional().describe('Items per page (default: 10, max: 20)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { companyId, ...query } = params as {
        type?: string;
        status?: string;
        year?: number;
        month?: number;
        page?: number;
        limit?: number;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/declarations', {
        companyId: effectiveCompanyId,
        query,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_get',
    description:
      'Get a single tax declaration by UUID. Returns full declaration details including populated data, status, metadata, and error messages.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID'),
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

      const res = await apiRequest(`/api/v1/declarations/${id}`, {
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_create',
    description:
      'Create a new tax declaration and auto-populate it from existing invoice data. Supported types: d394, d300, d390, d100, d112. The system automatically aggregates invoice data by partner CIF and VAT rate for the specified period.',
    inputSchema: z.object({
      type: z
        .enum(['d394', 'd300', 'd390', 'd100', 'd112'])
        .describe('Declaration type'),
      year: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .describe('Declaration year (e.g. 2026)'),
      month: z
        .number()
        .int()
        .min(1)
        .max(12)
        .describe('Declaration month (1–12)'),
      periodType: z
        .string()
        .optional()
        .describe('Period type (default: "monthly")'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { companyId, ...body } = params as {
        type: string;
        year: number;
        month: number;
        periodType?: string;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/declarations', {
        companyId: effectiveCompanyId,
        method: 'POST',
        body,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_recalculate',
    description:
      'Recalculate a draft declaration by re-populating its data from current invoices. Only works on declarations in "draft" status.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID to recalculate'),
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

      const res = await apiRequest(`/api/v1/declarations/${id}/recalculate`, {
        companyId: effectiveCompanyId,
        method: 'POST',
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_validate',
    description:
      'Validate a draft declaration by generating and checking the XML output. Transitions the declaration to "validated" status if successful.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID to validate'),
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

      const res = await apiRequest(`/api/v1/declarations/${id}/validate`, {
        companyId: effectiveCompanyId,
        method: 'POST',
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_submit',
    description:
      'Submit a declaration to ANAF. Generates XML, uploads to ANAF SPV, and begins async status polling. Works on "draft" or "validated" declarations.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID to submit'),
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

      const res = await apiRequest(`/api/v1/declarations/${id}/submit`, {
        companyId: effectiveCompanyId,
        method: 'POST',
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_delete',
    description:
      'Soft-delete a tax declaration. Cannot delete accepted declarations.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID to delete'),
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

      const res = await apiRequest(`/api/v1/declarations/${id}`, {
        companyId: effectiveCompanyId,
        method: 'DELETE',
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_sync',
    description:
      'Sync declarations from ANAF for a given year. Discovers filed declarations via SPV messages, creates missing local records, downloads recipise, and updates in-flight statuses. Returns 202 (async processing).',
    inputSchema: z.object({
      year: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .describe('Year to sync declarations for (e.g. 2026)'),
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

      const res = await apiRequest('/api/v1/declarations/sync', {
        companyId: effectiveCompanyId,
        method: 'POST',
        body: { year },
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_refresh_statuses',
    description:
      'Refresh statuses for all in-flight (submitted/processing) declarations from ANAF. Checks SPV messages for status updates and downloads recipise. Returns 202 (async processing).',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { companyId } = params as { companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/declarations/refresh-statuses', {
        companyId: effectiveCompanyId,
        method: 'POST',
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_download_xml',
    description:
      'Download the generated XML for a tax declaration. Returns the raw XML content.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID'),
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

      const res = await apiRequest(`/api/v1/declarations/${id}/xml`, {
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_prepare',
    description:
      'Prepare a declaration for agent-based submission. Returns XML content, ANAF URL, Bearer token, and CIF needed by the local agent to proxy the mTLS request. Use operation param for different flows: submit (default), listMessages, download.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID'),
      operation: z
        .enum(['submit', 'listMessages', 'download'])
        .optional()
        .describe('Operation type (default: submit)'),
      downloadId: z
        .string()
        .optional()
        .describe('ANAF download ID (required for operation=download)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, operation, downloadId, companyId } = params as {
        id: string;
        operation?: string;
        downloadId?: string;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const query: Record<string, string> = {};
      if (operation) query.operation = operation;
      if (downloadId) query.downloadId = downloadId;

      const res = await apiRequest(`/api/v1/declarations/${id}/prepare`, {
        companyId: effectiveCompanyId,
        query,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_agent_result',
    description:
      'Submit the ANAF response received via the local agent back to the server. The server parses the response, extracts the upload ID, sets status to PROCESSING, and dispatches status checking.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID'),
      statusCode: z.number().int().describe('HTTP status code from ANAF response'),
      headers: z
        .record(z.string())
        .optional()
        .describe('Response headers from ANAF'),
      body: z.string().describe('Response body from ANAF'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, statusCode, headers, body, companyId } = params as {
        id: string;
        statusCode: number;
        headers?: Record<string, string>;
        body: string;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/declarations/${id}/agent-result`, {
        companyId: effectiveCompanyId,
        method: 'POST',
        body: { statusCode, headers, body },
      });
      return formatResponse(res);
    },
  },
];
