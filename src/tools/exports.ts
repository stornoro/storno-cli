import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'exports_download',
    description:
      'Download a generated export file (ZIP archive). Export files are single-use and auto-deleted after download. The filename is typically provided by the endpoint that generated the export (e.g. POST /api/v1/invoices/export). Common formats: invoices-export-YYYY-MM.zip, vat-report-YYYY-MM.zip, clients-export-YYYY-MM-DD.zip.',
    inputSchema: z.object({
      filename: z
        .string()
        .describe(
          'Export filename to download (e.g. "invoices-export-2026-02.zip"). Obtained from the export generation endpoint response.'
        ),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { filename } = params as { filename: string };

      const res = await apiRequest(`/api/v1/exports/${filename}`, {
        binary: true,
      });
      return formatResponse(res);
    },
  },
];
