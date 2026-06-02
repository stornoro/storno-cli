import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'mailer_config_get',
    description:
      'Get the organization\'s custom email sender (SMTP) configuration (Business plan). Returns the host, port, encryption, username, from address/name, whether a password is saved, and the last test time. The password is never returned.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const result = await apiRequest('/api/v1/mailer-config');
      return formatResponse(result);
    },
  },

  {
    name: 'mailer_config_update',
    description:
      'Create or update the organization\'s custom email sender (Business plan only). Invoices, receipts, and delivery notes to clients are then sent through this SMTP server from your own address. Omit the password on update to keep the saved one.',
    inputSchema: z.object({
      enabled: z.boolean().optional().describe('Enable or disable the custom sender'),
      host: z.string().optional().describe('SMTP host (e.g., "smtp.example.com")'),
      port: z.number().optional().describe('SMTP port (e.g., 587 for STARTTLS, 465 for SSL)'),
      encryption: z
        .enum(['none', 'tls', 'ssl'])
        .optional()
        .describe('Connection encryption: "tls" (STARTTLS), "ssl" (implicit), or "none"'),
      username: z.string().optional().describe('SMTP username'),
      password: z.string().optional().describe('SMTP password (omit to keep the saved one)'),
      fromAddress: z.string().optional().describe('From address (must be authorized on the SMTP server)'),
      fromName: z.string().optional().describe('Display name for the sender'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) body[key] = value;
      }

      const result = await apiRequest('/api/v1/mailer-config', { method: 'PUT', body });
      return formatResponse(result);
    },
  },

  {
    name: 'mailer_config_test',
    description:
      'Send a test message through the custom email sender to verify the SMTP settings. Uses the saved configuration unless overridden by the parameters. Sends to testEmail, or to the from address if omitted.',
    inputSchema: z.object({
      testEmail: z.string().optional().describe('Recipient for the test message (defaults to the from address)'),
      host: z.string().optional(),
      port: z.number().optional(),
      encryption: z.enum(['none', 'tls', 'ssl']).optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      fromAddress: z.string().optional(),
      fromName: z.string().optional(),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) body[key] = value;
      }

      const result = await apiRequest('/api/v1/mailer-config/test', { method: 'POST', body });
      return formatResponse(result);
    },
  },

  {
    name: 'mailer_config_delete',
    description:
      'Delete the organization\'s custom email sender configuration. Client documents revert to being sent from the default Storno address.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const result = await apiRequest('/api/v1/mailer-config', { method: 'DELETE' });
      return formatResponse(result);
    },
  },
];
