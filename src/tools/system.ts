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
      'Get backend version plus web and mobile (iOS/Android/Huawei) latest+min versions and store URLs. Pass `platform` to get a flat `client` object for that mobile surface.',
    inputSchema: z.object({
      platform: z
        .enum(['ios', 'android', 'huawei'])
        .optional()
        .describe('Mobile platform to get a flat `client` object for. Omit for the full payload.'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const platform = params.platform as 'ios' | 'android' | 'huawei' | undefined;
      const path = platform ? `/api/v1/version?platform=${platform}` : '/api/v1/version';
      const result = await apiRequest(path);
      return formatResponse(result);
    },
  },
];
