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
      'List all ANAF OAuth tokens associated with the authenticated user. Each token enables e-Factura synchronization for a specific company CIF. Returns token ID, CIF, expiry, and validity status.',
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
      'Create a device-based authentication token link for completing the ANAF OAuth flow. Returns a unique URL that can be opened in a browser to complete ANAF authentication. Maximum 5 active links per user. Link expires after a short period.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest('/api/v1/anaf/token-links', {
        method: 'POST',
      });
      return formatResponse(res);
    },
  },

  {
    name: 'anaf_delete_token',
    description:
      'Delete an ANAF OAuth token. This revokes e-Factura synchronization access for the CIF associated with this token. The token ID is an integer obtained from anaf_tokens.',
    inputSchema: z.object({
      id: z.number().describe('The ANAF token ID to delete (integer ID from anaf_tokens)'),
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
      id: z.number().describe('The ANAF token ID to validate (integer ID from anaf_tokens)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest(`/api/v1/anaf/tokens/${params.id}/validate-cif`, {
        method: 'POST',
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
