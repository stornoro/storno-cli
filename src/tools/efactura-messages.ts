import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'efactura_messages_list',
    description:
      'List e-Factura messages from the ANAF SPV platform with pagination and filtering. Messages include responses to uploaded invoices, notifications (accepted/rejected), errors, warnings, and informational messages. Useful for troubleshooting invoice upload issues.',
    inputSchema: z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 20, max: 100)'),
      messageType: z
        .enum(['response', 'notification', 'error', 'warning', 'info'])
        .optional()
        .describe('Filter by message type'),
      status: z
        .enum(['ok', 'error', 'warning', 'pending'])
        .optional()
        .describe('Filter by message status'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest('/api/v1/efactura-messages', {
        query: {
          page: params.page as number | undefined,
          limit: params.limit as number | undefined,
          messageType: params.messageType as string | undefined,
          status: params.status as string | undefined,
        },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'efactura_messages_get',
    description:
      'Get full details of a specific e-Factura message including both parsed details and raw ANAF response data. Includes related invoice information when available. Useful for diagnosing specific invoice upload errors.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the e-Factura message to retrieve'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest(`/api/v1/efactura-messages/${params.uuid}`);
      return formatResponse(res);
    },
  },
];
