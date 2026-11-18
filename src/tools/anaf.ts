import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'anaf_status',
    description:
      'Check the current ANAF integration status for the authenticated user. Returns token count, overall validity, and per-token details including CIF, expiry, and validity for each saved ANAF token.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest('/api/v1/anaf/status');
      return formatResponse(res);
    },
  },

  {
    name: 'anaf_tokens',
    description:
      'List all ANAF OAuth tokens of the authenticated user: id (UUID), label, expiresAt, isExpired, lastUsedAt, validatedCifs and exclusive. An exclusive token is bound to one company and used for it alone; the others are shared by the companies of the organization.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest('/api/v1/anaf/tokens');
      return formatResponse(res);
    },
  },

  {
    name: 'anaf_create_token_link',
    description:
      'Create a link the certificate holder opens on their own device to authorize ANAF access (no Storno account needed there). Returns linkToken, linkUrl, companyId, exclusive and expiresAt. A link lasts 24 hours and a user may hold 5 active links, or the higher limit set on the organization. With exclusive=true the resulting token is bound to that company and used for it alone: the certificate must have SPV rights on its CIF, no other token of the organization is ever used for the company, and deleting the token revokes that one company. Without it, tokens are shared: any token of the organization can serve any of its companies (one certificate for all companies).',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID the link is for. The token is validated against the CIF of this company. Required when exclusive is true.'),
      exclusive: z
        .boolean()
        .optional()
        .describe('Bind the resulting token to the company and use it for that company only. Default false (shared tokens).'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const body: Record<string, unknown> = {};
      if (params.companyId) body.companyId = params.companyId;
      if (params.exclusive !== undefined) body.exclusive = params.exclusive;

      const res = await apiRequest('/api/v1/anaf/token-links', {
        method: 'POST',
        body,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'anaf_token_link_result',
    description:
      'Result of a token link you created: expired, used, completed, the tokenId the link produced (null until the holder has authorized), the companyId it was created for and whether it is exclusive. Poll this after sending a link to learn exactly which token came out of it, also when several links are authorized at the same time.',
    inputSchema: z.object({
      linkToken: z.string().describe('The linkToken returned by anaf_create_token_link'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest(`/api/v1/anaf/token-links/${encodeURIComponent(String(params.linkToken))}/result`);
      return formatResponse(res);
    },
  },

  {
    name: 'anaf_delete_token',
    description:
      'Delete an ANAF OAuth token. A shared token stops serving every company that relied on it. An exclusive token (exclusive: true in anaf_tokens) revokes ANAF access for the one company it is bound to and nothing else. The token ID is the UUID from anaf_tokens or anaf_token_link_result.',
    inputSchema: z.object({
      id: z.string().describe('The ANAF token ID to delete (UUID from anaf_tokens)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest(`/api/v1/anaf/tokens/${params.id}`, {
        method: 'DELETE',
      });
      return formatResponse(res);
    },
  },

  {
    name: 'anaf_validate_cif',
    description:
      'Validate that an ANAF token has proper access to e-Factura for a specific CIF. Checks organization ownership, ANAF registry, and e-Factura access permissions. Returns validation result with any error messages.',
    inputSchema: z.object({
      id: z.string().describe('The ANAF token ID to validate (UUID from anaf_tokens)'),
      cif: z.string().describe('CIF of a company in your organization to check the token against'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest(`/api/v1/anaf/tokens/${params.id}/validate-cif`, {
        method: 'POST',
        body: { cif: params.cif },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'anaf_sync_trigger',
    description:
      'Manually trigger e-Factura synchronization for all companies with valid ANAF tokens. Validates token availability and subscription plan rate limits, then dispatches an async sync job to fetch new invoices from ANAF SPV.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest('/api/v1/sync/trigger', {
        method: 'POST',
      });
      return formatResponse(res);
    },
  },

  {
    name: 'anaf_sync_status',
    description:
      'Get the current e-Factura synchronization status and configuration. Returns whether sync is enabled, the last successful sync timestamp, token validity, and the sync frequency interval.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest('/api/v1/sync/status');
      return formatResponse(res);
    },
  },

  {
    name: 'anaf_sync_log',
    description:
      'Retrieve the recent e-Factura sync activity log showing the last 50 synced invoices. Each entry shows the invoice ID, company CIF, sync timestamp, and status (success, failed, or skipped).',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest('/api/v1/sync/log');
      return formatResponse(res);
    },
  },
];
