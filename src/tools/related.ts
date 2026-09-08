import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

const RELATED_TYPES = ['client', 'supplier', 'invoice', 'recurring_invoice', 'declaration', 'spv_document', 'spv_request', 'dosar'] as const;

export const tools = [
  {
    name: 'related_get',
    description:
      'Everything in Storno connected to one record, whatever it is: for a client → its dosare (rental contracts), recurring invoices, recent invoices, the declarations and ANAF messages of those dosare; for an invoice → the client, the rental dosar of that tenant, the recurring invoice that issued it, sibling invoices; for a declaration or SPV message → the dosar behind it and its client; for a dosar → client, supplier, recurring invoice, invoices, declarations, SPV requests and messages. Every item has type, id, title, subtitle, status, date and the web page (href). Use it to answer "what else do we have about X?" before searching list by list.',
    inputSchema: z.object({
      type: z.enum(RELATED_TYPES).describe('What the id is'),
      id: z.string().uuid().describe('The record UUID'),
      companyId: z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/related/${params.type}/${params.id}`, { companyId: params.companyId as string | undefined }));
    },
  },
];
