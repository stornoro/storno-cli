import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'borderou_providers',
    description:
      'List available borderou (bank statement) providers. Returns supported banks and file formats for bank statement import and reconciliation.',
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

      const result = await apiRequest('/api/v1/borderou/providers', { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'borderou_upload',
    description:
      'Upload a bank statement or borderou file (CSV, XLSX, XLS) for transaction import and reconciliation. Parses the file, creates transactions, and runs automatic matching against existing invoices.',
    inputSchema: z.object({
      filePath: z.string().describe('Absolute path to the file to upload (CSV, XLSX, or XLS)'),
      sourceType: z
        .enum(['borderou', 'bank_statement'])
        .describe('Type of upload: "borderou" for payment lists, "bank_statement" for bank exports'),
      provider: z.string().describe('Bank or provider name (from borderou_providers)'),
      currency: z.string().optional().describe('Currency code (default: RON)'),
      bordereauNumber: z.string().optional().describe('Borderou reference number'),
      bankAccountId: z.string().optional().describe('Bank account UUID (for bank_statement type)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { filePath, sourceType, provider, currency, bordereauNumber, bankAccountId } = params as {
        filePath: string;
        sourceType: string;
        provider: string;
        currency?: string;
        bordereauNumber?: string;
        bankAccountId?: string;
      };

      const formFields: Record<string, string> = { sourceType, provider };
      if (currency) formFields.currency = currency;
      if (bordereauNumber) formFields.bordereauNumber = bordereauNumber;
      if (bankAccountId) formFields.bankAccountId = bankAccountId;

      const result = await apiRequest('/api/v1/borderou/upload', {
        method: 'POST',
        companyId,
        filePath,
        formFields,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'borderou_transactions',
    description:
      'List borderou transactions with pagination. Returns imported bank statement transactions with matching status, amounts, and linked invoice/proforma references.',
    inputSchema: z.object({
      page: z.number().int().optional().describe('Page number (default: 1)'),
      limit: z.number().int().optional().describe('Items per page (default: 20)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { page, limit } = params as { page?: number; limit?: number };
      const result = await apiRequest('/api/v1/borderou/transactions', {
        companyId,
        query: { page, limit },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'borderou_transaction_get',
    description:
      'Get detailed information about a specific borderou transaction including matched invoice/proforma details.',
    inputSchema: z.object({
      id: z.string().describe('Transaction ID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id } = params as { id: string };
      const result = await apiRequest(`/api/v1/borderou/transactions/${id}`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'borderou_transaction_update',
    description:
      'Update a borderou transaction match. Link or unlink the transaction to an invoice or proforma invoice for reconciliation.',
    inputSchema: z.object({
      id: z.string().describe('Transaction ID'),
      clientId: z.string().optional().describe('Client UUID to match'),
      invoiceId: z.string().optional().describe('Invoice UUID to match'),
      proformaInvoiceId: z.string().optional().describe('Proforma invoice UUID to match'),
      amount: z.number().optional().describe('Override matched amount'),
      documentType: z
        .enum(['invoice', 'proforma'])
        .optional()
        .describe('Document type for matching'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id, companyId: _cid, ...rest } = params as { id: string } & Record<
        string,
        unknown
      >;

      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) body[key] = value;
      }

      const result = await apiRequest(`/api/v1/borderou/transactions/${id}`, {
        method: 'PUT',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'borderou_transaction_available_invoices',
    description:
      'Get invoices or proforma invoices available to match against a borderou transaction. Search by number, client name, or amount.',
    inputSchema: z.object({
      id: z.string().describe('Transaction ID'),
      search: z.string().optional().describe('Search by invoice number, client name, or amount'),
      type: z
        .enum(['invoice', 'proforma'])
        .optional()
        .describe('Filter by document type (default: both)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id, search, type } = params as {
        id: string;
        search?: string;
        type?: string;
      };
      const result = await apiRequest(
        `/api/v1/borderou/transactions/${id}/available-invoices`,
        { companyId, query: { search, type } }
      );
      return formatResponse(result);
    },
  },

  {
    name: 'borderou_transactions_save',
    description:
      'Save and persist selected borderou transaction matches. Creates payment records for matched transactions and updates invoice payment status.',
    inputSchema: z.object({
      transactionIds: z
        .array(z.string())
        .describe('Array of transaction IDs to save'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { transactionIds } = params as { transactionIds: string[] };
      const result = await apiRequest('/api/v1/borderou/transactions/save', {
        method: 'POST',
        companyId,
        body: { transactionIds },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'borderou_transactions_rematch',
    description:
      'Re-run the automatic matching algorithm on selected borderou transactions. Useful after adding new invoices or updating client data.',
    inputSchema: z.object({
      transactionIds: z
        .array(z.string())
        .describe('Array of transaction IDs to re-match'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { transactionIds } = params as { transactionIds: string[] };
      const result = await apiRequest('/api/v1/borderou/transactions/re-match', {
        method: 'POST',
        companyId,
        body: { transactionIds },
      });
      return formatResponse(result);
    },
  },
];
