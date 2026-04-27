import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'licensing_create_key',
    description:
      'Generate a new license key for a self-hosted Storno instance. Only the organization owner can create license keys. The full 64-character license key is returned ONLY ONCE — store it immediately. Each self-hosted instance should use its own key.',
    inputSchema: z.object({
      instanceName: z
        .string()
        .optional()
        .describe('Human-readable name for the self-hosted instance (e.g. "Production", "Staging")'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { instanceName } = params as { instanceName?: string };

      const body: Record<string, unknown> = {};
      if (instanceName !== undefined) body.instanceName = instanceName;

      const res = await apiRequest('/api/v1/licensing/keys', {
        method: 'POST',
        body: Object.keys(body).length > 0 ? body : undefined,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'licensing_list_keys',
    description:
      'List all license keys issued for the current organization. Keys are returned with masked values (first and last 8 characters shown). Includes active and revoked keys with lastValidatedAt timestamps to verify self-hosted instances are running. Only the organization owner can list keys.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/licensing/keys');
      return formatResponse(res);
    },
  },

  {
    name: 'licensing_revoke_key',
    description:
      'Revoke (deactivate) a license key. The associated self-hosted instance will fall back to the Free plan on its next validation cycle (within 24 hours). Revocation is a soft delete — the key record is kept with active: false. Revoked keys cannot be reactivated; generate a new key instead. Only the organization owner can revoke keys.',
    inputSchema: z.object({
      id: z.string().describe('UUID of the license key to revoke'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id } = params as { id: string };

      const res = await apiRequest(`/api/v1/licensing/keys/${id}`, {
        method: 'DELETE',
      });
      return formatResponse(res);
    },
  },

  {
    name: 'licensing_validate',
    description:
      'Validate a self-hosted license key and retrieve the current plan, features, and subscription details. This endpoint does NOT require authentication — the license key itself is the credential. Returns plan features, organization name, billing period end, and trial info if applicable. Used by self-hosted instances every 24 hours.',
    inputSchema: z.object({
      licenseKey: z
        .string()
        .length(64)
        .describe('64-character hex license key issued for the self-hosted instance'),
      instanceName: z
        .string()
        .optional()
        .describe('Human-readable name for this self-hosted instance (stored for identification)'),
      instanceUrl: z
        .string()
        .url()
        .optional()
        .describe('Public URL of the self-hosted instance (stored for identification in the dashboard)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const { licenseKey, instanceName, instanceUrl } = params as {
        licenseKey: string;
        instanceName?: string;
        instanceUrl?: string;
      };

      const body: Record<string, unknown> = { licenseKey };
      if (instanceName !== undefined) body.instanceName = instanceName;
      if (instanceUrl !== undefined) body.instanceUrl = instanceUrl;

      const res = await apiRequest('/api/v1/licensing/validate', {
        method: 'POST',
        body,
        noAuth: true,
      });
      return formatResponse(res);
    },
  },
];
