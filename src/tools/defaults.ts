import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'defaults_invoice',
    description:
      'Get all default values and dropdown options needed for invoice creation. Returns VAT rates, currencies with symbols, payment terms (in days), units of measure, payment methods, and current BNR exchange rates for EUR/USD/GBP/CHF relative to RON. Always fetch this before creating invoices — never hardcode these values.',
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

      const result = await apiRequest('/api/v1/invoice-defaults', { companyId });
      return formatResponse(result);
    },
  },
];
