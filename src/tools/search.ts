import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

const SEARCH_TYPES = ['invoices', 'proformas', 'clients', 'suppliers', 'products'] as const;

export const tools = [
  {
    name: 'search',
    description:
      'Search the active company across invoices, proforma invoices, clients, suppliers and products in one call. The text is split into words and every word must match, in any order, so a name and a tax id can be combined ("exemplu 12345678"); a tax id with the country prefix ("RO12345678") matches the stored CUI and the VAT code. Returns groups of items, each with type, id, title, subtitle, status, date and the web page (href). Groups the user may not view are omitted. Use it to find a record before calling a get or list tool.',
    inputSchema: z.object({
      q: z.string().describe('Search text, at least 2 characters (shorter returns empty groups)'),
      types: z
        .array(z.enum(SEARCH_TYPES))
        .optional()
        .describe('Limit the search to these groups (default: all five)'),
      limit: z.number().int().min(1).max(20).optional().describe('Results per group (default 5, max 20)'),
      companyId: z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const types = params.types as string[] | undefined;
      return formatResponse(
        await apiRequest('/api/v1/search', {
          companyId: params.companyId as string | undefined,
          query: {
            q: params.q as string,
            types: types && types.length > 0 ? types.join(',') : undefined,
            limit: params.limit as number | undefined,
          },
        }),
      );
    },
  },
];
