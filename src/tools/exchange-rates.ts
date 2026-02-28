import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'exchange_rates_list',
    description:
      'Get current BNR (Banca Nationala a Romaniei) exchange rates. Rates are updated daily around 13:00 EET. Returns rates for all supported currencies expressed as: 1 foreign currency = X RON. On weekends and holidays, the last available rates are returned.',
    inputSchema: z.object({
      date: z
        .string()
        .optional()
        .describe('Specific date for rates (YYYY-MM-DD, defaults to latest available rates)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest('/api/v1/exchange-rates', {
        query: {
          date: params.date as string | undefined,
        },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'exchange_rates_convert',
    description:
      'Convert an amount between two currencies using current BNR exchange rates. For non-RON to non-RON conversions, cross-rates through RON are calculated. Result is rounded to 2 decimal places.',
    inputSchema: z.object({
      from: z.string().describe('Source currency code (ISO 4217, e.g., EUR, USD, RON)'),
      to: z.string().describe('Target currency code (ISO 4217, e.g., RON, EUR, USD)'),
      amount: z.number().describe('Amount to convert'),
      date: z
        .string()
        .optional()
        .describe('Specific date for exchange rate (YYYY-MM-DD, defaults to latest rates)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest('/api/v1/exchange-rates/convert', {
        query: {
          from: params.from as string,
          to: params.to as string,
          amount: params.amount as number,
          date: params.date as string | undefined,
        },
      });
      return formatResponse(res);
    },
  },
];
