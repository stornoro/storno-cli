import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

const companyIdSchema = z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)');

/**
 * Partner verification: check a client or supplier against the public registries
 * (ANAF for Romanian companies, VIES for EU partners) and store the snapshot on the
 * partner — VAT registration, VAT on collection (with its period), inactive taxpayer,
 * RO e-Factura register, VIES validity. Nothing on the partner's invoicing settings
 * (isVatPayer, vatCode) is changed by a verification.
 */
export const tools = [
  {
    name: 'partner_verify',
    description:
      'Check one client or supplier at ANAF (Romanian company with CUI) or VIES (EU partner with a VAT number) and store the snapshot on it: vatRegistered, vatOnCollection (+ vatOnCollectionFrom/To), inactive, efacturaRegistered, viesValid, verificationNotes, vatStatusCheckedAt. Returns the updated partner and `result`: checked (bool), source (anaf | vies), changes (became_inactive, reactivated, lost_vat_registration, vat_registered, vat_on_collection, vat_on_collection_ended, vies_invalid, vies_valid) and error (not_applicable for individuals / non-EU partners, registry_unavailable when the registry did not answer — the previous snapshot is kept, not_found when ANAF does not know the CUI). A degrading change also sends the `partner.status_changed` notification to the company members. Requires the client-edit permission; throttled per user like the registry lookups.',
    inputSchema: z.object({
      type: z.enum(['client', 'supplier']).describe('Partner kind'),
      uuid: z.string().describe('Client or supplier UUID'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const kind = params.type === 'supplier' ? 'suppliers' : 'clients';
      return formatResponse(
        await apiRequest(`/api/v1/${kind}/${params.uuid as string}/verify`, {
          method: 'POST',
          companyId: params.companyId as string | undefined,
        })
      );
    },
  },
  {
    name: 'partners_verify_all',
    description:
      'Re-check every client and supplier of the company whose last registry check is missing or older than `days` days (default 30; 0 = everyone). Romanian partners go to ANAF in batches of 100, EU partners to VIES one by one; individuals and non-EU partners are skipped. Returns counts: checked, changed (snapshot differs from the previous one), failed (registry did not answer — retried by the daily job), skipped, and `since`. The same run happens automatically every day at 06:40 for partners older than 30 days.',
    inputSchema: z.object({
      days: z.number().int().min(0).max(3650).optional().describe('Re-check partners checked more than this many days ago (default 30, 0 = all)'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(
        await apiRequest('/api/v1/partners/verify-all', {
          method: 'POST',
          companyId: params.companyId as string | undefined,
          body: params.days === undefined ? {} : { days: params.days as number },
        })
      );
    },
  },
];
