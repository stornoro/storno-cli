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
      'Get backend version plus web and mobile (iOS/Android/Huawei) latest+min versions and store URLs. Pass `platform` to get a flat `client` object for that mobile surface, and `version` to also get a resolved `gate` with `tier` (blocking/recommended/ok/unknown) so you do not have to compare versions yourself.',
    inputSchema: z.object({
      platform: z
        .enum(['ios', 'android', 'huawei'])
        .optional()
        .describe('Mobile platform to get a flat `client` object for. Omit for the full payload.'),
      version: z
        .string()
        .optional()
        .describe('Current client version (e.g. `1.4.2`). Only honoured when `platform` is also supplied. Drives the `gate.tier` field.'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const platform = params.platform as 'ios' | 'android' | 'huawei' | undefined;
      const version = typeof params.version === 'string' ? params.version : undefined;
      const search = new URLSearchParams();
      if (platform) search.set('platform', platform);
      if (version) search.set('version', version);
      const qs = search.toString();
      const path = qs ? `/api/v1/version?${qs}` : '/api/v1/version';
      const result = await apiRequest(path);
      return formatResponse(result);
    },
  },
];
