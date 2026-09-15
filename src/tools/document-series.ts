import { z } from 'zod';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'document_series_list',
    description:
      'List all document series for the active company, optionally filtered by type. Document series define the numbering prefixes for invoices (e.g., "FAC"), proformas ("PRO"), credit notes, and delivery notes. Each series tracks the current and next available number.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      type: z
        .enum(['invoice', 'proforma', 'credit_note', 'delivery_note'])
        .optional()
        .describe(
          'Filter by document type: invoice, proforma, credit_note, or delivery_note'
        ),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { type } = params as { type?: string };
      const result = await apiRequest('/api/v1/document-series', {
        companyId,
        query: type ? { type } : undefined,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'document_series_create',
    description:
      'Create a new document series. The prefix must be unique per company and document type. Common patterns: "FAC" for invoices, "FAC2026" for annual series, "PRO" for proformas. Use currentNumber to set the starting number (default: 0, so first document gets number 1).',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      prefix: z
        .string()
        .describe(
          'Series prefix (must be unique per company+type). Examples: "FAC", "FAC2026", "PRO", "AVZ"'
        ),
      type: z
        .enum(['invoice', 'proforma', 'credit_note', 'delivery_note'])
        .describe('Document type this series is for'),
      currentNumber: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
          'Starting number — the last used number (default: 0, meaning next document gets 1)'
        ),
      active: z
        .boolean()
        .optional()
        .describe('Whether the series is active and available for new documents (default: true)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...rest } = params;
      const body: Record<string, unknown> = {};
      const fields = ['prefix', 'type', 'currentNumber', 'active'];
      for (const field of fields) {
        if (rest[field] !== undefined) body[field] = rest[field];
      }

      const result = await apiRequest('/api/v1/document-series', {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'document_series_update',
    description:
      'Update an existing document series. Only "currentNumber" and "active" can be changed — prefix and type are immutable after creation. Use active=false to deactivate a series (e.g., at end of fiscal year). Changing currentNumber affects the next document number, use with extreme caution to avoid duplicates.',
    inputSchema: z.object({
      uuid: z.string().describe('Document series UUID to update'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      currentNumber: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe(
          'Update the last used number (CAUTION: setting lower than max existing number may create duplicates)'
        ),
      active: z
        .boolean()
        .optional()
        .describe('Set series active or inactive (inactive = not available for new documents)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _cid, ...rest } = params as { uuid: string } & Record<
        string,
        unknown
      >;
      const body: Record<string, unknown> = {};
      if (rest.currentNumber !== undefined) body.currentNumber = rest.currentNumber;
      if (rest.active !== undefined) body.active = rest.active;

      const result = await apiRequest(`/api/v1/document-series/${uuid}`, {
        method: 'PATCH',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'document_series_set_default',
    description:
      'Set a document series as the default for its type. The default series is auto-selected when creating new documents of that type. Only one series can be default per type.',
    inputSchema: z.object({
      uuid: z.string().describe('Document series UUID to set as default'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/document-series/${uuid}/set-default`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'document_series_delete',
    description:
      'Permanently delete a document series. Cannot delete a series that has been used for any documents. Consider marking as inactive (active=false) instead, to preserve referential integrity and the audit trail. Only delete if the series was created by mistake and never used.',
    inputSchema: z.object({
      uuid: z.string().describe('Document series UUID to delete'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { uuid } = params as { uuid: string };
      const result = await apiRequest(`/api/v1/document-series/${uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'document_series_numbering_decision',
    description:
      'Decizia de numerotare: the yearly internal decision (OMFP 2634/2015) that names the person responsible for allocating document numbers and lists, per document type, the series and the number range allocated for the year. Built from the company\'s document series: first number = the first number issued in that year (or the next free number), planned last number = first + rangeSize - 1 (extended to the highest number already issued). Returns the decision as JSON (company identification, legal basis, rows with firstNumber/lastNumber/format, warnings for missing representative or registration number); pass outFile to save the signed-ready PDF instead ("DECIZIA nr. … din …", table, signature block, Romanian).',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
      year: z.number().int().min(2000).max(2100).optional().describe('Year of the decision (default: current year)'),
      decisionNumber: z.number().int().min(1).optional().describe('Decision number (default 1)'),
      decisionDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe('Decision date YYYY-MM-DD (default 1 January of the year)'),
      responsible: z.string().max(200).optional().describe('Person responsible for numbering (default: the company representative)'),
      rangeSize: z
        .number()
        .int()
        .min(1)
        .max(9999999)
        .optional()
        .describe('Numbers allocated per series; planned last number = first + rangeSize - 1 (default 9999)'),
      outFile: z.string().optional().describe('Where to write the PDF; when omitted the decision is returned as JSON'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { year, decisionNumber, decisionDate, responsible, rangeSize, outFile } = params as {
        year?: number;
        decisionNumber?: number;
        decisionDate?: string;
        responsible?: string;
        rangeSize?: number;
        outFile?: string;
      };
      const query = { year, decisionNumber, decisionDate, responsible, rangeSize };

      if (!outFile) {
        return formatResponse(await apiRequest('/api/v1/document-series/numbering-decision', { companyId, query }));
      }

      const res = await apiRequest('/api/v1/document-series/numbering-decision.pdf', { companyId, query, binary: true });
      if (!res.ok) return formatResponse(res);
      const out = resolve(outFile);
      writeFileSync(out, Buffer.isBuffer(res.data) ? res.data : Buffer.from(String(res.data)));
      return formatResponse({ ok: true, status: 200, data: { file: out, next: 'Print it, have the representative and the responsible person sign it, and keep it with the accounting records.' } });
    },
  },
];
