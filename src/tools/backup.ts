import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'backup_create',
    description:
      'Create a new backup job for the active company. The backup is processed asynchronously and includes all company data (invoices, clients, products, settings). Optionally include uploaded files (PDFs, XMLs). Returns a job ID to check status.',
    inputSchema: z.object({
      includeFiles: z
        .boolean()
        .optional()
        .describe('Include uploaded files (PDFs, XMLs) in backup (default: true)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const body: Record<string, unknown> = {};
      if (params.includeFiles !== undefined) body.includeFiles = params.includeFiles;

      const result = await apiRequest('/api/v1/backup', {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'backup_status',
    description:
      'Get the status of a backup job. Returns progress percentage, current step, and download URL when complete. Statuses: pending, processing, completed, failed.',
    inputSchema: z.object({
      id: z.string().describe('Backup job ID'),
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
      const result = await apiRequest(`/api/v1/backup/${id}/status`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'backup_download',
    description:
      'Download a completed backup as a ZIP file. Returns base64-encoded binary data. The backup must be in "completed" status.',
    inputSchema: z.object({
      id: z.string().describe('Backup job ID'),
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
      const result = await apiRequest(`/api/v1/backup/${id}/download`, {
        companyId,
        binary: true,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'backup_restore',
    description:
      'Upload a backup ZIP file to restore company data. The restore runs asynchronously. Use backup_restore_status to check progress. WARNING: if purgeExisting is true, all current company data will be deleted before restoring.',
    inputSchema: z.object({
      filePath: z.string().describe('Absolute path to the backup ZIP file to restore'),
      purgeExisting: z
        .boolean()
        .optional()
        .describe('Delete all existing company data before restoring (default: false)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { filePath, purgeExisting } = params as {
        filePath: string;
        purgeExisting?: boolean;
      };

      const formFields: Record<string, string> = {};
      if (purgeExisting !== undefined) formFields.purgeExisting = String(purgeExisting);

      const result = await apiRequest('/api/v1/backup/restore', {
        method: 'POST',
        companyId,
        filePath,
        formFields,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'backup_restore_status',
    description:
      'Get the status of a restore job. Returns progress percentage and current step. Same as backup_status but specifically for restore jobs.',
    inputSchema: z.object({
      id: z.string().describe('Restore job ID'),
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
      const result = await apiRequest(`/api/v1/backup/restore/${id}/status`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'backup_history',
    description:
      'List recent backup jobs for the active company. Returns job ID, status, creation date, file size, and whether files were included.',
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe('Number of results (max 50, default: 20)'),
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
      const result = await apiRequest('/api/v1/backup/history', {
        companyId,
        query: { limit },
      });
      return formatResponse(result);
    },
  },
];
