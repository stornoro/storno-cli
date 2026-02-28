import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'system_health',
    description:
      'Check the Storno API system health status. Returns database, queue, storage, and service diagnostics when authenticated. Useful for troubleshooting connectivity or service issues.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      const result = await apiRequest('/api/v1/system/health');
      return formatResponse(result);
    },
  },

  {
    name: 'system_version',
    description:
      'Get the Storno API version information including release date, minimum requirements, and changelog URL.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      const result = await apiRequest('/api/v1/version');
      return formatResponse(result);
    },
  },
];
