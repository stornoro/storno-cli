import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'pdf_template_config_get',
    description:
      'Get the PDF template configuration for the current company. Returns the active template slug, primary color, font, logo/bank info visibility, footer text, and custom CSS. Creates a default config if none exists.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/pdf-template-config', { companyId });
      return formatResponse(res);
    },
  },

  {
    name: 'pdf_template_config_update',
    description:
      'Update the PDF template configuration for the current company. Customize the template design, colors, fonts, logo visibility, bank info display, footer text, and custom CSS applied to all generated PDFs.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      templateSlug: z
        .enum(['classic', 'modern', 'minimal', 'bold'])
        .optional()
        .describe('Template design to use: classic, modern, minimal, or bold'),
      primaryColor: z
        .string()
        .optional()
        .describe('Primary brand color in hex format (e.g., "#2563eb")'),
      fontFamily: z
        .string()
        .optional()
        .describe('CSS font family for the PDF (e.g., "DejaVu Sans", "Roboto")'),
      showLogo: z
        .boolean()
        .optional()
        .describe('Show company logo on PDFs (default: true)'),
      showBankInfo: z
        .boolean()
        .optional()
        .describe('Show bank account information on PDFs (default: true)'),
      footerText: z
        .string()
        .optional()
        .describe('Custom footer text displayed at the bottom of PDFs'),
      customCss: z
        .string()
        .optional()
        .describe('Custom CSS styles injected into the PDF template'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...body } = params;
      const res = await apiRequest('/api/v1/pdf-template-config', {
        method: 'PUT',
        companyId,
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'pdf_template_config_templates',
    description:
      'List all available PDF template designs with their slugs, names, descriptions, and default colors. Use the slug value when updating the template configuration.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/pdf-template-config/templates', { companyId });
      return formatResponse(res);
    },
  },

  {
    name: 'pdf_template_config_preview',
    description:
      'Generate an HTML preview of a PDF template with sample invoice data. Use this to preview how a template will look before saving configuration changes.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      templateSlug: z
        .enum(['classic', 'modern', 'minimal', 'bold'])
        .optional()
        .describe('Template design to preview (default: classic)'),
      primaryColor: z
        .string()
        .optional()
        .describe('Primary color to preview in hex format (e.g., "#6366f1")'),
      fontFamily: z
        .string()
        .optional()
        .describe('Font family to preview (e.g., "Roboto")'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const body: Record<string, unknown> = {};
      if (params.templateSlug) body.templateSlug = params.templateSlug;
      if (params.primaryColor) body.primaryColor = params.primaryColor;
      if (params.fontFamily) body.fontFamily = params.fontFamily;

      const res = await apiRequest('/api/v1/pdf-template-config/preview', {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(res);
    },
  },
];
