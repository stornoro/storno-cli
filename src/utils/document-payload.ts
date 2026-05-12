import { apiRequest, ApiResponse, ApiError } from '../client.js';

interface VatRate {
  id: string;
  rate: string;
  categoryCode: string;
}

const vatRateCache = new Map<string, Map<string, VatRate>>();

async function loadVatRates(companyId: string): Promise<Map<string, VatRate> | null> {
  const cached = vatRateCache.get(companyId);
  if (cached) return cached;

  const res = (await apiRequest('/api/v1/vat-rates', { companyId })) as
    | ApiResponse<{ data: VatRate[] } | VatRate[]>
    | ApiError;
  if (!res.ok) return null;

  const payload = res.data as { data?: VatRate[] } | VatRate[];
  const list = Array.isArray(payload) ? payload : payload.data ?? [];
  const map = new Map<string, VatRate>();
  for (const r of list) map.set(r.id, r);
  vatRateCache.set(companyId, map);
  return map;
}

/**
 * Translates AI-friendly field names into the field names expected by the
 * backend managers. Currently:
 *  - `seriesId` → `documentSeriesId`
 *  - per-line `vatRateId` → `vatRate` (numeric string) + `vatCategoryCode`
 *
 * Mutates a shallow copy of `body` and returns it. Lines are copied too.
 */
export async function preparePayload(
  body: Record<string, unknown>,
  companyId: string
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { ...body };

  if ('seriesId' in out && !('documentSeriesId' in out)) {
    out.documentSeriesId = out.seriesId;
    delete out.seriesId;
  }

  if (Array.isArray(out.lines)) {
    const rates = await loadVatRates(companyId);
    out.lines = out.lines.map((line) => {
      if (!line || typeof line !== 'object') return line;
      const l = { ...(line as Record<string, unknown>) };
      const id = l.vatRateId as string | undefined;
      if (id && rates) {
        const rate = rates.get(id);
        if (rate) {
          if (!('vatRate' in l)) l.vatRate = rate.rate;
          if (!('vatCategoryCode' in l)) l.vatCategoryCode = rate.categoryCode;
        }
      }
      delete l.vatRateId;
      return l;
    });
  }

  return out;
}
