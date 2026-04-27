import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'nc_codes_search',
    description:
      'Search NC (Combined Nomenclature / NACE) classification codes by code number or description. NC codes are used in e-Transport declarations for goods classification. Returns matching codes with their descriptions.',
    inputSchema: z.object({
      search: z.string().describe('Search query (NC code number or description text)'),
      limit: z
        .number()
        .int()
        .optional()
        .describe('Maximum results to return (max 100, default: 30)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { search, limit } = params as { search: string; limit?: number };
      const result = await apiRequest('/api/v1/nc-codes', {
        query: { search, limit },
      });
      return formatResponse(result);
    },
  },
];
