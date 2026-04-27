import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'dashboard_stats',
    description:
      'Get comprehensive dashboard statistics for the selected company. Returns invoice counts (total, draft, issued, paid, overdue), revenue amounts (total revenue, VAT, paid, unpaid), monthly breakdown, top clients, top products, recent activity, and payment summary. Supports predefined periods (month, quarter, year) or custom date ranges.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      period: z
        .enum(['month', 'quarter', 'year'])
        .optional()
        .describe('Predefined time period for statistics'),
      from: z.string().optional().describe('Custom start date (YYYY-MM-DD), used instead of period'),
      to: z.string().optional().describe('Custom end date (YYYY-MM-DD), used instead of period'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/dashboard/stats', {
        companyId,
        query: {
          period: params.period as string | undefined,
          from: params.from as string | undefined,
          to: params.to as string | undefined,
        },
      });
      return formatResponse(res);
    },
  },
];
