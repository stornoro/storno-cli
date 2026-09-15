import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

const companyIdSchema = z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)');

/**
 * Fiscal calendar: the filing deadlines derived from the company's profile (VAT payer and
 * period, income tax period, employees, person or company) and from its invoices
 * (intra-community operations → D390, foreign suppliers for non-VAT payers → D301).
 */
export const tools = [
  {
    name: 'fiscal_calendar',
    description:
      'Filing deadlines of the company for the next `days` days (default 60, max 366) from `from` (default today), plus the unfiled ones of the last month. Items: code (D300, D390, D394, D301, D100, D112, D406 SAF-T, D212, BILANT, and from the rental-contract dosare: C168 registration deadline, D212_ESTIMAT estimated income of a new contract for a natural person, CONTRACT_END contract end; these carry dosarId / dosarTitle), label, dueDate (moved to the next working day after weekends and Romanian legal holidays), nominalDueDate, daysLeft, period {year, month | quarter, from, to}, appliesBecause (vat_payer, intra_community_operations, non_vat_payer_foreign_suppliers, income_tax, employees, saft, individual, company, rental_contract), declarationType (the type to pass to declarations_create, null for SAF-T and the annual statements) and status: due, overdue (past due, nothing submitted) or filed (a submitted / accepted declaration of that type exists for the period). With allCompanies=true the list covers every company the user can see, each item carrying its company. The rules follow the company settings vatPeriod, incomeTaxPeriod and hasEmployees (companies_update).',
    inputSchema: z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Start date YYYY-MM-DD (default today)'),
      days: z.number().int().min(1).max(366).optional().describe('Window length in days (default 60)'),
      allCompanies: z.boolean().optional().describe('All companies of the organization instead of one (accountant view)'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const query = { from: params.from as string | undefined, days: params.days as number | undefined };
      const path = params.allCompanies ? '/api/v1/fiscal-calendar/all' : '/api/v1/fiscal-calendar';
      return formatResponse(await apiRequest(path, { query, companyId: params.companyId as string | undefined }));
    },
  },
];
