import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'email_templates_list',
    description:
      'List all email templates configured for the selected company. Templates support dynamic variables like {{invoice_number}}, {{client_name}}, {{total}}, {{currency}}, {{due_date}}, {{issue_date}}, {{company_name}}. If no templates exist, a default template is automatically created.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/email-templates', { companyId });
      return formatResponse(res);
    },
  },

  {
    name: 'email_templates_create',
    description:
      'Create a new email template for invoice communications. Templates support dynamic variables ({{invoice_number}}, {{client_name}}, {{total}}, {{currency}}, {{due_date}}, {{issue_date}}, {{company_name}}) that are replaced with actual data when emails are sent.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      name: z.string().describe('Template name for internal reference'),
      subject: z.string().describe('Email subject line (supports variables like {{invoice_number}})'),
      body: z.string().describe('Email body content (supports variables and HTML formatting)'),
      isDefault: z
        .boolean()
        .optional()
        .describe('Set as default template (default: false). Only one template can be default'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...body } = params;
      const res = await apiRequest('/api/v1/email-templates', {
        method: 'POST',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'email_templates_update',
    description:
      'Update an existing email template. All fields are optional but at least one must be provided. Setting isDefault to true will unset the current default template.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the email template to update'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      name: z.string().optional().describe('Template name for internal reference'),
      subject: z.string().optional().describe('Email subject line (supports variables)'),
      body: z.string().optional().describe('Email body content (supports variables and HTML formatting)'),
      isDefault: z
        .boolean()
        .optional()
        .describe('Set as default template. Only one template can be default at a time'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _cid, ...body } = params;
      const res = await apiRequest(`/api/v1/email-templates/${uuid}`, {
        method: 'PATCH',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'email_templates_delete',
    description:
      'Permanently delete an email template. Cannot delete the last remaining template or the default template (set another as default first). Emails already sent using this template are not affected.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the email template to delete'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/email-templates/${params.uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(res);
    },
  },
];
