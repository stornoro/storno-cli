import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'white_label_config_get',
    description:
      'Get the organization\'s white-label branding configuration (Business plan). Returns whether the org is entitled, plus the custom app name, logo URL, accent color, and whether Storno branding is removed from PDFs and client emails.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const result = await apiRequest('/api/v1/white-label-config');
      return formatResponse(result);
    },
  },

  {
    name: 'white_label_config_update',
    description:
      'Create or update the organization\'s white-label branding (Business plan only). Set a custom app name, accent color, toggle white-label on/off, and remove the "Storno.ro" footer from generated PDFs and the emails your clients receive.',
    inputSchema: z.object({
      enabled: z
        .boolean()
        .optional()
        .describe('Enable or disable white-label branding (when off, default Storno branding is used)'),
      appName: z
        .string()
        .nullable()
        .optional()
        .describe('Custom app name shown in the app shell and browser tab (max 100 chars, null to clear)'),
      primaryColor: z
        .string()
        .nullable()
        .optional()
        .describe('Accent color in hex format (e.g., "#2563eb"), or null to clear'),
      removeBranding: z
        .boolean()
        .optional()
        .describe('Remove the "Storno.ro" footer from generated PDFs and client-facing emails'),
      customDomain: z
        .string()
        .nullable()
        .optional()
        .describe('Custom domain to serve the app and client links (e.g. "facturi.example.com"), or null to clear. Changing it resets verification and returns a DNS TXT record to add.'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) body[key] = value;
      }

      const result = await apiRequest('/api/v1/white-label-config', {
        method: 'PUT',
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'white_label_config_verify_domain',
    description:
      'Verify the custom domain by checking that the DNS TXT record (_storno-verify.<domain>) returned when the domain was set has been published. On success the domain becomes active for client links.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const result = await apiRequest('/api/v1/white-label-config/domain/verify', {
        method: 'POST',
        body: {},
      });
      return formatResponse(result);
    },
  },
];
