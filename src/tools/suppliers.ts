import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'suppliers_list',
    description:
      'List suppliers for the selected company grouped alphabetically. Suppliers are automatically created from incoming invoices via ANAF e-Factura synchronization. Supports search by name, CUI, or email.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 50, max: 200)'),
      search: z.string().optional().describe('Search term to filter by name, CUI, or email'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/suppliers', {
        companyId,
        query: {
          page: params.page as number | undefined,
          limit: params.limit as number | undefined,
          search: params.search as string | undefined,
        },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'suppliers_create',
    description:
      'Create a new supplier manually. Requires name, county, city, address, and registration number. If a supplier with the same CIF already exists, returns the existing supplier instead.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      name: z.string().describe('Supplier name'),
      cif: z.string().optional().describe('Tax identification number (CIF)'),
      vatCode: z.string().optional().describe('VAT code (e.g., RO12345678)'),
      isVatPayer: z.boolean().optional().describe('Whether supplier is a VAT payer (default: false)'),
      registrationNumber: z.string().describe('Trade registry number (e.g., J40/123/2020)'),
      address: z.string().describe('Street address'),
      city: z.string().describe('City'),
      county: z.string().describe('County'),
      country: z.string().optional().describe('Country code ISO 3166-1 alpha-2 (default: RO)'),
      postalCode: z.string().optional().describe('Postal code'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      bankName: z.string().optional().describe('Bank name'),
      bankAccount: z.string().optional().describe('Bank account (IBAN)'),
      notes: z.string().optional().describe('Internal notes'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...body } = params;
      const res = await apiRequest('/api/v1/suppliers', {
        method: 'POST',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'suppliers_export_csv',
    description:
      'Export all suppliers for the active company as a CSV file. Returns base64-encoded UTF-8 CSV with BOM.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/suppliers/export/csv', {
        companyId,
        binary: true,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'suppliers_export_saga_xml',
    description:
      'Export all suppliers in SAGA accounting XML format. Returns base64-encoded XML file compatible with SAGA import.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/suppliers/export/saga-xml', {
        companyId,
        binary: true,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'suppliers_bulk_delete',
    description:
      'Soft-delete multiple suppliers in a single request. Returns the count of deleted items and any errors.',
    inputSchema: z.object({
      ids: z.array(z.string()).min(1).max(100).describe('Array of supplier UUIDs to delete (1-100)'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/suppliers/bulk-delete', {
        method: 'POST',
        companyId,
        body: { ids: params.ids },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'suppliers_get',
    description:
      'Get detailed information about a specific supplier including invoice history summary and the last 10 recent incoming invoices. Core data (name, CUI) comes from ANAF and is read-only.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the supplier to retrieve'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/suppliers/${params.uuid}`, { companyId });
      return formatResponse(res);
    },
  },

  {
    name: 'suppliers_update',
    description:
      'Update editable fields of a supplier record. Core data (name, CUI) from ANAF cannot be modified. Only contact information, address details, banking details, and internal notes can be updated.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the supplier to update'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      email: z.string().nullable().optional().describe('Email address'),
      phone: z.string().nullable().optional().describe('Phone number'),
      address: z.string().nullable().optional().describe('Street address'),
      city: z.string().nullable().optional().describe('City'),
      county: z.string().nullable().optional().describe('County'),
      country: z.string().optional().describe('Country code (ISO 3166-1 alpha-2, e.g., "RO")'),
      postalCode: z.string().nullable().optional().describe('Postal code'),
      bankName: z.string().nullable().optional().describe('Bank name'),
      bankAccount: z.string().nullable().optional().describe('Bank account (IBAN)'),
      notes: z.string().nullable().optional().describe('Internal notes about this supplier'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _cid, ...body } = params;
      const res = await apiRequest(`/api/v1/suppliers/${uuid}`, {
        method: 'PATCH',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'suppliers_delete',
    description:
      'Soft-delete a supplier record. The supplier is marked as deleted but not permanently removed. Existing incoming invoices from this supplier remain intact. If new invoices arrive from this supplier via ANAF sync, the supplier record will be restored automatically.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the supplier to delete'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/suppliers/${params.uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(res);
    },
  },
];
