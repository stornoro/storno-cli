import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'company_registry_search',
    description:
      'Search the Romanian company registry (ONRC) by company name. Returns matching companies with CUI, name, and registration details. Useful for finding a company before creating a client. Results are cached for 5 minutes.',
    inputSchema: z.object({
      q: z
        .string()
        .min(2)
        .describe('Search query (company name, minimum 2 characters)'),
      limit: z
        .number()
        .int()
        .optional()
        .describe('Maximum results to return (default: 10)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { q, limit } = params as { q: string; limit?: number };
      const result = await apiRequest('/api/v1/company-registry/search', {
        query: { q, limit },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'company_registry_cities',
    description:
      'Get a list of cities for a given Romanian county. Optionally filter by city name. Useful for address auto-complete when creating clients or companies. Results are cached for 5 minutes.',
    inputSchema: z.object({
      county: z.string().describe('County code or name (e.g., "B" for Bucharest, "CJ" for Cluj)'),
      q: z
        .string()
        .optional()
        .describe('Optional search query to filter cities'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { county, q } = params as { county: string; q?: string };
      const result = await apiRequest('/api/v1/company-registry/cities', {
        query: { county, q },
      });
      return formatResponse(result);
    },
  },
];
