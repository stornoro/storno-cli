import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse } from '../utils/errors.js';

export const tools = [
  {
    name: 'integration_invoicing_activity',
    description:
      'Check whether a fiscal code (CUI/CIF) invoices through Storno, and how many invoices it issued recently. Built for platforms that give their users a benefit for invoicing here, so it is NOT authenticated with your user token — the credential is a shared integration key, configured server-side as INTEGRATION_API_KEY. Returns only { active, invoicesLast30d, windowDays, invoicesInWindow }: no company name, no amounts, no clients. Counts issued outgoing invoices only — drafts, cancelled and rejected ones do not count, so a company cannot earn a benefit by issuing and voiding. Returns active: false for an unknown fiscal code and for a suspended organization alike. If the server has no key configured the endpoint answers 404 ("not enabled"), and a wrong key answers 401.',
    inputSchema: z.object({
      cui: z
        .string()
        .describe('Fiscal code to look up. Written however you have it — "RO12345678", "12345678", spaced or dotted are all accepted'),
      integrationKey: z
        .string()
        .optional()
        .describe('The shared integration key. Falls back to the STORNO_INTEGRATION_KEY environment variable when omitted'),
      window: z
        .number()
        .int()
        .min(1)
        .max(365)
        .optional()
        .describe('How many days back to count, 1-365 (default 30). The 30-day figure is reported as invoicesLast30d regardless'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const { cui, integrationKey, window } = params as {
        cui: string;
        integrationKey?: string;
        window?: number;
      };

      const key = integrationKey || process.env.STORNO_INTEGRATION_KEY;
      if (!key) {
        return JSON.stringify(
          {
            ok: false,
            error:
              'No integration key. Pass integrationKey, or set STORNO_INTEGRATION_KEY in the environment.',
          },
          null,
          2
        );
      }

      const res = await apiRequest('/api/v1/integrations/invoicing-activity', {
        query: { cui, window },
        headers: { 'X-Integration-Key': key },
        noAuth: true,
      });
      return formatResponse(res);
    },
  },
];
