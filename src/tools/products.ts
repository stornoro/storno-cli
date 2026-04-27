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

  {
    name: 'products_update',
    description:
      'Update an existing product by UUID. All fields are optional — only provided fields are changed. Useful for assigning product codes (so sales can be grouped per plan/SKU), fixing names, or adjusting default prices on sync-created products. Pass code=null to clear a code.',
    inputSchema: z.object({
      uuid: z.string().describe('Product UUID to update'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      name: z.string().optional().describe('Product name'),
      code: z
        .string()
        .nullable()
        .optional()
        .describe('Product code / SKU. Pass null to clear the existing code.'),
      description: z.string().nullable().optional().describe('Product description'),
      unitOfMeasure: z
        .string()
        .optional()
        .describe('Unit of measure code (e.g. "buc", "ore", "kg")'),
      defaultPrice: z
        .number()
        .optional()
        .describe('Default unit price'),
      currency: z.string().optional().describe('ISO 4217 currency code'),
      vatRate: z.number().optional().describe('VAT rate percentage (e.g. 19 for 19%)'),
      vatCategoryCode: z
        .string()
        .optional()
        .describe('VAT category code (e.g. "S", "Z", "E")'),
      ncCode: z.string().nullable().optional().describe('NC (Nomenclatura Combinata) code'),
      cpvCode: z.string().nullable().optional().describe('CPV code for public procurement'),
      color: z.string().nullable().optional().describe('Optional hex colour swatch shown on the POS product grid (e.g. "#1e40af"). Six-digit hex with or without leading "#"; pass null to clear.'),
      categoryId: z.string().nullable().optional().describe('UUID of a product_category for POS grid grouping; pass null to clear.'),
      sgrAmount: z.number().nullable().optional().describe('Romanian SGR (Sistem Garantie-Returnare) deposit per unit, e.g. 0.50 for plastic beverage bottles. Null clears it. The POS auto-injects a single VAT-exempt deposit line summing all SGR product quantities.'),
      isActive: z.boolean().optional().describe('Whether the product is active'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _c, ...rest } = params as Record<string, unknown>;

      const result = await apiRequest(`/api/v1/products/${uuid}`, {
        method: 'PATCH',
        companyId,
        body: rest,
      });
      return formatResponse(result);
    },
  },
];
