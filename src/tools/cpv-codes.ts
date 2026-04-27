import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'cpv_codes_search',
    description:
      'Search CPV (Common Procurement Vocabulary) classification codes by code number or description. CPV codes are used in e-Transport declarations and public procurement. Returns matching codes with their descriptions.',
    inputSchema: z.object({
      search: z.string().describe('Search query (CPV code number or description text)'),
      limit: z
        .number()
        .int()
        .optional()
        .describe('Maximum results to return (max 100, default: 30)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { search, limit } = params as { search: string; limit?: number };
      const result = await apiRequest('/api/v1/cpv-codes', {
        query: { search, limit },
      });
      return formatResponse(result);
    },
  },
];
