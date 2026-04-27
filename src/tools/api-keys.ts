import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'api_keys_list',
    description:
      'List all API tokens for the authenticated user within the current organization. Returns both active and revoked tokens sorted by creation date, newest first. The raw token value is never included — only the tokenPrefix for identification.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/api-tokens');
      return formatResponse(res);
    },
  },

  {
    name: 'api_keys_scopes',
    description:
      'List all permission scopes available to the current user, grouped by category. Only scopes the user already holds are returned — useful for inspecting what permissions a token can be granted.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/api-tokens/scopes');
      return formatResponse(res);
    },
  },
];
