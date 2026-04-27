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
      'Add a new bank account to the active company. For type=bank, IBAN is required and must be unique within the company. For type=cash (the till that backs POS / cash-register reports), IBAN is optional and openingBalance/openingBalanceDate enable cash-register tracking. A company can have at most one cash account. If isDefault is true, any existing default account for that currency is demoted.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      type: z
        .enum(['bank', 'cash'])
        .optional()
        .describe('Account type. "bank" (default) for IBAN-backed accounts; "cash" for the physical till that backs POS / cash-register reports.'),
      iban: z
        .string()
        .optional()
        .describe(
          'International Bank Account Number in valid IBAN format (e.g., "RO49AAAA1B31007593840000"). Required for type=bank, optional for type=cash.'
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
      openingBalance: z
        .number()
        .optional()
        .describe('Initial cash-on-hand. Required to enable cash-register reporting on cash accounts. Once set, locks and can only be modified via forward-going cash movements. Must be >= 0.'),
      openingBalanceDate: z
        .string()
        .optional()
        .describe('Date the opening balance was taken (YYYY-MM-DD). Required when openingBalance is supplied.'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...rest } = params;
      const body: Record<string, unknown> = {};
      const fields = ['type', 'iban', 'bankName', 'currency', 'isDefault', 'openingBalance', 'openingBalanceDate'];
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
      'Update an existing bank account. Can update type, IBAN, bank name, currency, default status, or initial opening balance. Once openingBalance has been persisted with a value > 0 it locks — further changes are rejected and corrections must be made via cash movements. At least one field must be provided.',
    inputSchema: z.object({
      uuid: z.string().describe('Bank account UUID to update'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      type: z
        .enum(['bank', 'cash'])
        .optional()
        .describe('Account type. Switching after creation is allowed but should be avoided once movements exist.'),
      iban: z
        .string()
        .nullable()
        .optional()
        .describe('New IBAN (must be valid and unique within company). Pass null to clear (only valid for cash accounts).'),
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
      openingBalance: z
        .number()
        .optional()
        .describe('Initial cash-on-hand. Locks once set; correct via cash movements thereafter.'),
      openingBalanceDate: z
        .string()
        .optional()
        .describe('Date the opening balance was taken (YYYY-MM-DD). Required when openingBalance is being set for the first time.'),
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
      const fields = ['type', 'iban', 'bankName', 'currency', 'isDefault', 'openingBalance', 'openingBalanceDate'];
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
