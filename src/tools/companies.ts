import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig, updateConfig } from '../config.js';

export const tools = [
  {
    name: 'companies_list',
    description:
      'List all companies belonging to the authenticated user\'s organization. Returns company details including CIF, addresses, bank info, sync settings, and ANAF token status. Use this to find company UUIDs for the companies_select tool.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const result = await apiRequest('/api/v1/companies');
      return formatResponse(result);
    },
  },

  {
    name: 'companies_get',
    description:
      'Get detailed information for a specific company by UUID. Returns all configuration settings, bank info, sync settings, and ANAF token validity status.',
    inputSchema: z.object({
      uuid: z.string().describe('Company UUID'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/companies/${uuid}`);
      return formatResponse(result);
    },
  },

  {
    name: 'companies_create',
    description:
      'Create a new company by providing its CIF (Romanian tax identification number). The system automatically validates the CIF with ANAF and retrieves official registration data (name, address, VAT status). The CIF can be provided with or without the RO prefix.',
    inputSchema: z.object({
      cif: z
        .string()
        .describe(
          'Romanian tax identification number / CIF (e.g., "12345678" or "RO12345678")'
        ),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { cif } = params as { cif: string };
      const result = await apiRequest('/api/v1/companies', {
        method: 'POST',
        body: { cif },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'companies_update',
    description:
      'Update configuration settings for a company. Note: core ANAF data (CIF, registration number, VAT status, official address) cannot be modified as they are synced from official ANAF sources. Only editable fields like contact info, bank details, and sync settings can be changed.',
    inputSchema: z.object({
      uuid: z.string().describe('Company UUID'),
      name: z.string().optional().describe('Company display name'),
      bankName: z.string().optional().describe('Bank name'),
      bankAccount: z.string().optional().describe('IBAN account number'),
      bankBic: z.string().optional().describe('BIC/SWIFT code'),
      defaultCurrency: z
        .string()
        .optional()
        .describe('Default currency code (e.g., "RON", "EUR")'),
      phone: z.string().optional().describe('Contact phone number'),
      email: z.string().email().optional().describe('Contact email address'),
      syncDaysBack: z
        .number()
        .int()
        .min(1)
        .max(365)
        .optional()
        .describe('Number of days to sync back from ANAF (1-365)'),
      efacturaDelayHours: z
        .number()
        .int()
        .min(0)
        .max(72)
        .optional()
        .describe('Hours to delay e-Factura sync (0-72)'),
      archiveEnabled: z.boolean().optional().describe('Enable automatic archiving'),
      archiveRetentionYears: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Years to retain archived data (1-50)'),
      enabledModules: z
        .array(z.enum(['delivery_notes', 'receipts', 'proforma_invoices', 'recurring_invoices', 'reports', 'efactura', 'spv_messages']))
        .nullable()
        .optional()
        .describe('Array of enabled module keys for sidebar visibility (null = all enabled). Valid keys: delivery_notes, receipts, proforma_invoices, recurring_invoices, reports, efactura, spv_messages'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid, ...rest } = params as { uuid: string } & Record<string, unknown>;
      const body: Record<string, unknown> = {};
      const fields = [
        'name',
        'bankName',
        'bankAccount',
        'bankBic',
        'defaultCurrency',
        'phone',
        'email',
        'syncDaysBack',
        'efacturaDelayHours',
        'archiveEnabled',
        'archiveRetentionYears',
        'enabledModules',
      ];
      for (const field of fields) {
        if (rest[field] !== undefined) body[field] = rest[field];
      }

      const result = await apiRequest(`/api/v1/companies/${uuid}`, {
        method: 'PATCH',
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'companies_delete',
    description:
      'Permanently delete a company and all associated data (invoices, clients, products, ANAF tokens). This triggers an asynchronous cascade deletion. Only Owner or Admin roles can delete companies. This action cannot be undone.',
    inputSchema: z.object({
      uuid: z.string().describe('Company UUID to delete'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/companies/${uuid}`, {
        method: 'DELETE',
      });
      return formatResponse(result);
    },
  },

  {
    name: 'companies_upload_logo',
    description:
      'Upload a logo image for a company. Accepts PNG, JPG, or SVG files up to 2MB. The logo appears on PDF documents (invoices, proformas, delivery notes, receipts).',
    inputSchema: z.object({
      uuid: z.string().describe('Company UUID'),
      filePath: z.string().describe('Absolute path to the logo image file (PNG, JPG, or SVG)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid, filePath } = params as { uuid: string; filePath: string };
      const result = await apiRequest(`/api/v1/companies/${uuid}/logo`, {
        method: 'POST',
        filePath,
        fileFieldName: 'logo',
      });
      return formatResponse(result);
    },
  },

  {
    name: 'companies_delete_logo',
    description:
      'Remove the logo from a company. PDFs will no longer include the company logo.',
    inputSchema: z.object({
      uuid: z.string().describe('Company UUID'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/companies/${uuid}/logo`, {
        method: 'DELETE',
      });
      return formatResponse(result);
    },
  },

  {
    name: 'companies_set_active',
    description:
      'Set the organization-level active company by UUID. Calls PUT /api/v1/companies/{uuid}/set-active on the server and returns the updated list of all companies with the new active company reflected. Requires COMPANY_EDIT permission. Use companies_list first to find available company UUIDs.',
    inputSchema: z.object({
      companyId: z
        .string()
        .describe('Company UUID to mark as the active company for the organization.'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { companyId } = params as { companyId: string };
      const result = await apiRequest(`/api/v1/companies/${companyId}/set-active`, {
        method: 'PUT',
      });
      return formatResponse(result);
    },
  },

  {
    name: 'companies_select',
    description:
      'Select the active company for the current session. This sets the X-Company header used by all subsequent invoice, client, product, and other company-scoped requests. Call companies_list first to find available company UUIDs.',
    inputSchema: z.object({
      companyId: z
        .string()
        .describe(
          'Company UUID to set as the active company for this session. All subsequent API calls will use this company context.'
        ),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const { companyId } = params as { companyId: string };
      updateConfig({ companyId });

      return JSON.stringify(
        {
          success: true,
          message: `Active company set to: ${companyId}`,
          companyId,
        },
        null,
        2
      );
    },
  },
];
