import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'vat_rates_list',
    description:
      'List all VAT rates configured for the active company, sorted by display position. Returns rate percentage, display label, e-Factura category code, and which rate is the default. Common Romanian rates: 19% (standard), 9% (reduced), 5% (super-reduced), 0% (exempt).',
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

      const result = await apiRequest('/api/v1/vat-rates', { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'vat_rates_create',
    description:
      'Create a new VAT rate for the active company. If isDefault is true, any existing default rate is demoted. If this is the first VAT rate, it automatically becomes the default. Common e-Factura category codes: S=standard, AA=reduced, E=exempt, O=outside scope, Z=zero rated, AE=reverse charge.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      rate: z
        .number()
        .min(0)
        .describe('VAT percentage (e.g., 19 for 19%, 0 for exempt)'),
      label: z
        .string()
        .describe('Display label shown in dropdowns (e.g., "TVA 19%", "Scutit")'),
      categoryCode: z
        .string()
        .optional()
        .describe(
          'e-Factura category code (default: "S"). Options: S, AA, E, O, Z, AE'
        ),
      isDefault: z
        .boolean()
        .optional()
        .describe('Set this as the default VAT rate for new invoice lines (default: false)'),
      position: z
        .number()
        .int()
        .optional()
        .describe(
          'Display order position in dropdowns (lower = first). Auto-assigned if not provided.'
        ),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...rest } = params;
      const body: Record<string, unknown> = {};
      const fields = ['rate', 'label', 'categoryCode', 'isDefault', 'position'];
      for (const field of fields) {
        if (rest[field] !== undefined) body[field] = rest[field];
      }

      const result = await apiRequest('/api/v1/vat-rates', {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'vat_rates_update',
    description:
      'Update an existing VAT rate. Note: changing the rate percentage does not retroactively affect existing invoices — those preserve the original rate. Only updates display label, category code, default status, or position. At least one field must be provided.',
    inputSchema: z.object({
      uuid: z.string().describe('VAT rate UUID to update'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      rate: z.number().min(0).optional().describe('VAT percentage'),
      label: z.string().optional().describe('Display label'),
      categoryCode: z
        .string()
        .optional()
        .describe('e-Factura category code (S, AA, E, O, Z, AE)'),
      isDefault: z
        .boolean()
        .optional()
        .describe('Set as default rate (demotes any existing default)'),
      position: z.number().int().optional().describe('Display order position'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _cid, ...rest } = params as { uuid: string } & Record<
        string,
        unknown
      >;
      const body: Record<string, unknown> = {};
      const fields = ['rate', 'label', 'categoryCode', 'isDefault', 'position'];
      for (const field of fields) {
        if (rest[field] !== undefined) body[field] = rest[field];
      }

      const result = await apiRequest(`/api/v1/vat-rates/${uuid}`, {
        method: 'PATCH',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'vat_rates_delete',
    description:
      'Soft-delete a VAT rate. The rate is marked as deleted but not physically removed, preserving historical invoice integrity. Cannot delete the default rate (set another as default first) or the last remaining rate. Existing invoices are not affected.',
    inputSchema: z.object({
      uuid: z.string().describe('VAT rate UUID to delete'),
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
      const result = await apiRequest(`/api/v1/vat-rates/${uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(result);
    },
  },
];
