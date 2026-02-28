import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'bank_accounts_list',
    description:
      'List all bank accounts configured for the active company. Returns IBAN, bank name, currency, and which account is the default per currency. Bank accounts appear on invoices as payment instructions.',
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

      const result = await apiRequest('/api/v1/bank-accounts', { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'bank_accounts_create',
    description:
      'Add a new bank account to the active company. IBAN must be in valid format and unique within the company. If isDefault is true, any existing default account for that currency is demoted. The first account for a currency automatically becomes the default.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      iban: z
        .string()
        .describe(
          'International Bank Account Number in valid IBAN format (e.g., "RO49AAAA1B31007593840000")'
        ),
      bankName: z
        .string()
        .optional()
        .describe('Name of the bank (e.g., "BCR", "Banca Transilvania", "ING Bank")'),
      currency: z
        .string()
        .optional()
        .describe('Currency code ISO 4217 (default: "RON"). Use "EUR" for Euro accounts.'),
      isDefault: z
        .boolean()
        .optional()
        .describe('Set as default account for this currency (default: false)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...rest } = params;
      const body: Record<string, unknown> = {};
      const fields = ['iban', 'bankName', 'currency', 'isDefault'];
      for (const field of fields) {
        if (rest[field] !== undefined) body[field] = rest[field];
      }

      const result = await apiRequest('/api/v1/bank-accounts', {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'bank_accounts_update',
    description:
      'Update an existing bank account. Can update IBAN, bank name, currency, or default status. If setting isDefault to true, any existing default for that currency is demoted. At least one field must be provided.',
    inputSchema: z.object({
      uuid: z.string().describe('Bank account UUID to update'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      iban: z.string().optional().describe('New IBAN (must be valid and unique within company)'),
      bankName: z
        .string()
        .nullable()
        .optional()
        .describe('Bank name (pass null to clear)'),
      currency: z.string().optional().describe('Currency code ISO 4217'),
      isDefault: z
        .boolean()
        .optional()
        .describe('Set as default account for this currency'),
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
      const fields = ['iban', 'bankName', 'currency', 'isDefault'];
      for (const field of fields) {
        if (rest[field] !== undefined) body[field] = rest[field];
      }

      const result = await apiRequest(`/api/v1/bank-accounts/${uuid}`, {
        method: 'PATCH',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'bank_accounts_delete',
    description:
      'Permanently delete a bank account. Cannot delete the last bank account for a company or the default account (set another as default first). Existing invoices that referenced this account retain the IBAN in their stored data.',
    inputSchema: z.object({
      uuid: z.string().describe('Bank account UUID to delete'),
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
      const result = await apiRequest(`/api/v1/bank-accounts/${uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(result);
    },
  },
];
