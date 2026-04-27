import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'product_categories_list',
    description:
      "List all product categories for the active company, ordered by sortOrder then name. Categories appear as a chip strip above the POS product grid and double as fallback colour swatches for products that don't have their own colour.",
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
      const result = await apiRequest('/api/v1/product-categories', { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'product_categories_create',
    description:
      'Create a new POS product category. Categories are scoped to a single company.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      name: z.string().describe('Display name, 1–100 characters'),
      color: z
        .string()
        .nullable()
        .optional()
        .describe('Optional hex colour ("#RRGGBB" or "RRGGBB"); invalid values are silently dropped'),
      sortOrder: z
        .number()
        .int()
        .optional()
        .describe('Sort order in the chip strip (smaller = earlier; default 0)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();
      const { companyId: _c, ...body } = params;
      const result = await apiRequest('/api/v1/product-categories', {
        method: 'POST',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'product_categories_update',
    description:
      "Update a product category. All fields optional; omitted fields stay unchanged. Pass color=null to clear the swatch.",
    inputSchema: z.object({
      uuid: z.string().describe('Category UUID to update'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      name: z.string().optional().describe('Display name, 1–100 characters'),
      color: z.string().nullable().optional().describe('Hex colour swatch; null to clear'),
      sortOrder: z.number().int().optional().describe('Sort order in the chip strip'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();
      const { uuid, companyId: _c, ...body } = params as { uuid: string } & Record<string, unknown>;
      const result = await apiRequest(`/api/v1/product-categories/${uuid}`, {
        method: 'PATCH',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'product_categories_delete',
    description:
      "Delete a product category. Products that were in the category lose the assignment (categoryId is set to null) but are not deleted.",
    inputSchema: z.object({
      uuid: z.string().describe('Category UUID to delete'),
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
      const result = await apiRequest(`/api/v1/product-categories/${uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(result);
    },
  },
];
