import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'clients_list',
    description:
      'List clients for the active company. Results are grouped alphabetically by name and can be filtered by type (company/individual) or searched by name, CUI/CNP, or email.',
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
        .describe('Search term to filter by name, CUI/CNP, or email'),
      type: z
        .enum(['company', 'individual'])
        .optional()
        .describe('Filter by client type: "company" or "individual"'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { page, limit, search, type } = params as {
        page?: number;
        limit?: number;
        search?: string;
        type?: string;
      };

      const result = await apiRequest('/api/v1/clients', {
        companyId,
        query: { page, limit, search, type },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'clients_get',
    description:
      'Get detailed information about a specific client by UUID, including invoice summary statistics (total count, unpaid amount, overdue amount, total revenue) and a list of the 10 most recent invoices.',
    inputSchema: z.object({
      uuid: z.string().describe('Client UUID'),
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
      const result = await apiRequest(`/api/v1/clients/${uuid}`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'clients_create',
    description:
      'Create a new client manually. Supports both company and individual client types. Company details (address, VAT, bank account, etc.) can be auto-filled using clients_anaf_lookup or clients_from_registry before calling this tool.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      name: z.string().describe('Client name (company or individual full name)'),
      type: z
        .enum(['company', 'individual'])
        .optional()
        .describe('Client type: "company" (default) or "individual"'),
      cui: z.string().optional().describe('Company tax ID / CUI (for company type)'),
      cnp: z.string().optional().describe('Personal numeric code / CNP (for individual type)'),
      vatCode: z.string().optional().describe('VAT registration code (e.g., RO12345678)'),
      isVatPayer: z.boolean().optional().describe('Whether the client is registered for VAT'),
      registrationNumber: z
        .string()
        .optional()
        .describe('Trade registry number (e.g., J40/1234/2020)'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      county: z.string().optional().describe('County / state'),
      country: z
        .string()
        .optional()
        .describe('ISO 3166-1 alpha-2 country code (default: RO)'),
      postalCode: z.string().optional().describe('Postal / ZIP code'),
      email: z.string().optional().describe('Client email address'),
      phone: z.string().optional().describe('Client phone number'),
      bankName: z.string().optional().describe('Bank name'),
      bankAccount: z.string().optional().describe('IBAN or bank account number'),
      defaultPaymentTermDays: z
        .number()
        .int()
        .optional()
        .describe('Default payment term in days for invoices issued to this client'),
      contactPerson: z.string().optional().describe('Name of the primary contact person'),
      notes: z.string().optional().describe('Internal notes about the client'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...body } = params;
      const result = await apiRequest('/api/v1/clients', {
        method: 'POST',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'clients_update',
    description:
      'Update an existing client by UUID. All fields are optional — only the provided fields will be updated.',
    inputSchema: z.object({
      uuid: z.string().describe('Client UUID to update'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      name: z.string().optional().describe('Client name (company or individual full name)'),
      type: z
        .enum(['company', 'individual'])
        .optional()
        .describe('Client type: "company" or "individual"'),
      cui: z.string().optional().describe('Company tax ID / CUI (for company type)'),
      cnp: z.string().optional().describe('Personal numeric code / CNP (for individual type)'),
      vatCode: z.string().optional().describe('VAT registration code (e.g., RO12345678)'),
      isVatPayer: z.boolean().optional().describe('Whether the client is registered for VAT'),
      registrationNumber: z
        .string()
        .optional()
        .describe('Trade registry number (e.g., J40/1234/2020)'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      county: z.string().optional().describe('County / state'),
      country: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
      postalCode: z.string().optional().describe('Postal / ZIP code'),
      email: z.string().optional().describe('Client email address'),
      phone: z.string().optional().describe('Client phone number'),
      bankName: z.string().optional().describe('Bank name'),
      bankAccount: z.string().optional().describe('IBAN or bank account number'),
      defaultPaymentTermDays: z
        .number()
        .int()
        .optional()
        .describe('Default payment term in days for invoices issued to this client'),
      contactPerson: z.string().optional().describe('Name of the primary contact person'),
      notes: z.string().optional().describe('Internal notes about the client'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _cid, ...body } = params;
      const result = await apiRequest(`/api/v1/clients/${uuid}`, {
        method: 'PATCH',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'clients_delete',
    description:
      'Permanently delete a client by UUID. Clients with existing invoices or documents cannot be deleted.',
    inputSchema: z.object({
      uuid: z.string().describe('Client UUID to delete'),
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
      const result = await apiRequest(`/api/v1/clients/${uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'clients_bulk_delete',
    description:
      'Delete multiple clients in a single request. Accepts up to 100 client UUIDs. Clients with existing documents will be skipped or cause an error depending on server configuration.',
    inputSchema: z.object({
      ids: z
        .array(z.string())
        .max(100)
        .describe('Array of client UUIDs to delete (max 100)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const result = await apiRequest('/api/v1/clients/bulk-delete', {
        method: 'POST',
        companyId,
        body: { ids: params.ids },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'clients_anaf_lookup',
    description:
      'Look up company details by CUI in the ANAF public registry without creating a client. Returns pre-filled form data (name, address, VAT status, registration number, etc.) that can be used to populate a clients_create call.',
    inputSchema: z.object({
      cui: z.string().describe('Company tax ID / CUI to look up in ANAF'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { cui } = params as { cui: string };
      const result = await apiRequest('/api/v1/clients/anaf-lookup', {
        companyId,
        query: { cui },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'clients_from_registry',
    description:
      'Create a client by looking up a CUI in the ANAF registry and auto-filling all available details (name, address, VAT status, registration number, etc.). Use this instead of clients_create when you only have a CUI and want the company details resolved automatically.',
    inputSchema: z.object({
      cui: z.string().describe('Company tax ID / CUI to look up and create a client from'),
      name: z
        .string()
        .optional()
        .describe('Fallback name if ANAF does not return one'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const body: Record<string, unknown> = { cui: params.cui };
      if (params.name) body.name = params.name;

      const result = await apiRequest('/api/v1/clients/from-registry', {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'clients_export_csv',
    description:
      'Export all clients for the active company as a CSV file. Returns base64-encoded binary data representing the CSV file contents.',
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

      const result = await apiRequest('/api/v1/clients/export/csv', {
        companyId,
        binary: true,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'clients_export_saga_xml',
    description:
      'Export clients in Saga XML format for import into Saga accounting software. Returns the XML document as text.',
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

      const result = await apiRequest('/api/v1/clients/export/saga-xml', {
        companyId,
      });
      return formatResponse(result);
    },
  },
];
