import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

const asOfSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .describe('Reference date (YYYY-MM-DD). Invoices issued after it are ignored and days overdue are counted up to it. Default: today.');

export const tools = [
  {
    name: 'client_statement',
    description:
      'Customer statement (situație clienți) for one client: the unpaid outgoing invoices as of a date (number, issue/due date, total, paid, outstanding, days overdue), totals, the client balance and the outstanding amount split into aging bands (current, 1–30, 31–60, 61–90, 91–120, 121–180, over 180 days overdue), plus the company bank accounts. Storno/credit documents are listed as credits and reduce the balance; invoices in other currencies than the company default are listed but summarised separately.',
    inputSchema: z.object({
      uuid: z.string().describe('Client UUID'),
      asOf: asOfSchema,
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, asOf } = params as { uuid: string; asOf?: string };
      const result = await apiRequest(`/api/v1/clients/${uuid}/statement`, {
        companyId,
        query: { asOf },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'client_statements',
    description:
      'Customer statements for every client of the company with a positive balance, sorted by balance descending, with company-wide totals and aging bands. Use it to see who owes money and how old the debt is before sending reminders with client_statement_email.',
    inputSchema: z.object({
      asOf: asOfSchema,
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { asOf } = params as { asOf?: string };
      const result = await apiRequest('/api/v1/clients/statements', {
        companyId,
        query: { asOf },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'client_statement_email',
    description:
      'E-mail the statement of unpaid invoices ("Facturi neachitate {company}") with the PDF attached. Pass `uuid` to send to one client (to its e-mail, or `to` — which must be an address of one of your clients), or omit it to send to every client with a balance of at least `minBalance` and an e-mail address. Use `dryRun: true` first: it returns who would receive the statement and who is skipped (no e-mail, below the minimum balance, unsubscribed) without sending anything. Requires the invoice-sending permission and a plan with e-mail sending. The bulk send stops at the plan\'s daily/burst e-mail limit and reports `stoppedReason`.',
    inputSchema: z.object({
      uuid: z
        .string()
        .optional()
        .describe('Client UUID. Omit to e-mail all clients with a balance.'),
      to: z
        .string()
        .email()
        .optional()
        .describe('Recipient override for a single client (defaults to the client e-mail)'),
      message: z
        .string()
        .max(2000)
        .optional()
        .describe('Optional message appended to the standard Romanian body (plain text)'),
      asOf: asOfSchema,
      minBalance: z
        .number()
        .min(0)
        .optional()
        .describe('Bulk only: minimum balance a client must owe to receive the statement (default 0.01)'),
      dryRun: z
        .boolean()
        .optional()
        .describe('Do not send; return the recipients and the skip reasons. For a single client it returns the statement that would be sent.'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, to, message, asOf, minBalance, dryRun } = params as {
        uuid?: string;
        to?: string;
        message?: string;
        asOf?: string;
        minBalance?: number;
        dryRun?: boolean;
      };

      if (uuid) {
        if (dryRun) {
          const statement = await apiRequest(`/api/v1/clients/${uuid}/statement`, {
            companyId,
            query: { asOf },
          });
          if (!statement.ok) return formatResponse(statement);
          return JSON.stringify({ dryRun: true, to: to ?? null, message: message ?? null, statement: statement.data }, null, 2);
        }
        const result = await apiRequest(`/api/v1/clients/${uuid}/statement/email`, {
          method: 'POST',
          companyId,
          body: { to, message, asOf },
        });
        return formatResponse(result);
      }

      const result = await apiRequest('/api/v1/clients/statements/email', {
        method: 'POST',
        companyId,
        body: { message, asOf, minBalance, dryRun: dryRun ?? false },
      });
      return formatResponse(result);
    },
  },
];
