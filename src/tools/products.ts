import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'products_list',
    description:
      'List products for the active company. Products are sync-only and are automatically extracted from invoice line items during ANAF synchronization — they cannot be manually created or edited. Results can be filtered by active status and searched by name, code, or description.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      page: z.number().int().optional().describe('Page number (default: 1)'),
      limit: z
        .number()
        .int()
        .optional()
        .describe('Items per page, max 200 (default: 50)'),
      search: z
        .string()
        .optional()
        .describe('Search term to filter by product name, code, or description'),
      isActive: z
        .boolean()
        .optional()
        .describe('Filter by active status (true = active only, false = inactive only)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { page, limit, search, isActive } = params as {
        page?: number;
        limit?: number;
        search?: string;
        isActive?: boolean;
      };

      const result = await apiRequest('/api/v1/products', {
        companyId,
        query: {
          page,
          limit,
          search,
          isActive: isActive !== undefined ? String(isActive) : undefined,
        },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'products_get',
    description:
      'Get detailed information about a specific product by UUID, including usage statistics (total usage count, total revenue generated, average quantity, first and last usage dates).',
    inputSchema: z.object({
      uuid: z.string().describe('Product UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/products/${uuid}`, { companyId });
      return formatResponse(result);
    },
  },
];
