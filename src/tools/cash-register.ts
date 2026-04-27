import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

const dateRangeFields = {
  from: z
    .string()
    .optional()
    .describe('Start date YYYY-MM-DD (defaults to the cash account opening date or 30 days ago)'),
  to: z
    .string()
    .optional()
    .describe('End date YYYY-MM-DD (defaults to today)'),
};

export const tools = [
  {
    name: 'cash_register_balance',
    description:
      'Live snapshot of the till — opening balance, cash in/out since opening, manual movements, and current balance. Returns { configured: false } if no cash-type bank account exists or its opening balance is not set.',
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
      const result = await apiRequest('/api/v1/cash-register/balance', { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'cash_register_ledger',
    description:
      'Daily cash ledger across the requested date range. Each day bucket includes opening balance, chronological entries (receipts, cash payments, manual movements), totals, and closing balance. Range capped at 366 days.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      ...dateRangeFields,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();
      const query = new URLSearchParams();
      if (params.from) query.set('from', String(params.from));
      if (params.to) query.set('to', String(params.to));
      const qs = query.toString();
      const result = await apiRequest(
        `/api/v1/cash-register/ledger${qs ? `?${qs}` : ''}`,
        { companyId },
      );
      return formatResponse(result);
    },
  },

  {
    name: 'cash_register_movements_list',
    description:
      'List manual cash movements (deposits, withdrawals, miscellaneous) in a date range. Receipts and invoice payments are NOT returned here — use cash_register_ledger for the full picture.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      ...dateRangeFields,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();
      const query = new URLSearchParams();
      if (params.from) query.set('from', String(params.from));
      if (params.to) query.set('to', String(params.to));
      const qs = query.toString();
      const result = await apiRequest(
        `/api/v1/cash-register/movements${qs ? `?${qs}` : ''}`,
        { companyId },
      );
      return formatResponse(result);
    },
  },

  {
    name: 'cash_register_movements_create',
    description:
      'Record a manual cash movement (deposit, withdrawal, or miscellaneous). Direction is auto-set for deposits (out) and withdrawals (in); for kind=other, direction must be supplied. movementDate cannot be earlier than the cash account opening date.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      kind: z
        .enum(['deposit', 'withdrawal', 'other'])
        .describe('deposit (cash leaves the till), withdrawal (cash put into the till), or other (miscellaneous; direction required)'),
      direction: z
        .enum(['in', 'out'])
        .optional()
        .describe('Cash flow direction. Required only when kind=other; ignored otherwise.'),
      amount: z.number().describe('Positive amount, >= 0.01'),
      movementDate: z
        .string()
        .describe('YYYY-MM-DD. Cannot be earlier than the cash account opening date.'),
      description: z.string().optional().describe('Free-form note shown in the ledger'),
      documentNumber: z.string().optional().describe('Reference number (e.g., bank slip / expense receipt)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();
      const { companyId: _cid, ...body } = params;
      const result = await apiRequest('/api/v1/cash-register/movements', {
        method: 'POST',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'cash_register_movements_update',
    description:
      'Update a manual cash movement. All fields optional; omitted fields keep their current value. Currency cannot be changed. Changing kind between deposit/withdrawal re-applies auto-direction.',
    inputSchema: z.object({
      uuid: z.string().describe('Movement UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      kind: z.enum(['deposit', 'withdrawal', 'other']).optional(),
      direction: z.enum(['in', 'out']).optional(),
      amount: z.number().optional(),
      movementDate: z.string().optional().describe('YYYY-MM-DD'),
      description: z.string().nullable().optional().describe('Pass null to clear'),
      documentNumber: z.string().nullable().optional().describe('Pass null to clear'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();
      const { uuid, companyId: _cid, ...body } = params as { uuid: string } & Record<string, unknown>;
      const result = await apiRequest(`/api/v1/cash-register/movements/${uuid}`, {
        method: 'PATCH',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'cash_register_movements_delete',
    description:
      'Permanently delete a manual cash movement. Receipts and invoice payments cannot be deleted via this endpoint — use their respective resources.',
    inputSchema: z.object({
      uuid: z.string().describe('Movement UUID'),
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
      const result = await apiRequest(`/api/v1/cash-register/movements/${uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(result);
    },
  },
];
