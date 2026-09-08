import { z } from 'zod';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { agent, pinFrom, agentRemembersPin, PIN_MISSING } from './agent.js';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'declarations_list',
    description:
      'List tax declarations for the active company. Supports filtering by type, status, year, and month. Returns paginated list of declarations with their status and period.',
    inputSchema: z.object({
      type: z
        .enum(['d394', 'd300', 'd390', 'd100', 'd112'])
        .optional()
        .describe('Declaration type filter'),
      status: z
        .enum(['draft', 'validated', 'submitted', 'processing', 'accepted', 'rejected', 'error'])
        .optional()
        .describe('Status filter'),
      year: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .optional()
        .describe('Year filter (e.g. 2026)'),
      month: z
        .number()
        .int()
        .min(1)
        .max(12)
        .optional()
        .describe('Month filter (1–12)'),
      page: z.number().int().optional().describe('Page number (default: 1)'),
      limit: z.number().int().optional().describe('Items per page (default: 10, max: 20)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { companyId, ...query } = params as {
        type?: string;
        status?: string;
        year?: number;
        month?: number;
        page?: number;
        limit?: number;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/declarations', {
        companyId: effectiveCompanyId,
        query,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_get',
    description:
      'Get a single tax declaration by UUID. Returns full declaration details including populated data, status, metadata, and error messages.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, companyId } = params as { id: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/declarations/${id}`, {
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_create',
    description:
      "Create a new tax declaration. VAT and payroll types (d394, d300, d390, d100, d112) are auto-populated from the company's invoices for the period. Form-based types are filled from plain JSON: 'd212' (Declarația unică, rent income; month 12) and 'c168' (rental contract registration/amendment/termination; month 12) take `data.input` in the shape of declaration_form_spec, and c168 needs `data.attachments` [{name, contentBase64}] (the scanned contract / termination document) for the PDF. Then declarations_validate → declarations_file_via_agent.",
    inputSchema: z.object({
      type: z
        .enum(['d394', 'd300', 'd390', 'd100', 'd112', 'd212', 'c168'])
        .describe('Declaration type'),
      data: z.record(z.string(), z.unknown()).optional().describe('For d212 / c168: { input: <form input>, attachments?: [{name, contentBase64}] }'),
      dosarId: z.string().uuid().optional().describe('Attach the new declaration to this dosar'),
      year: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .describe('Declaration year (e.g. 2026)'),
      month: z
        .number()
        .int()
        .min(1)
        .max(12)
        .describe('Declaration month (1–12)'),
      periodType: z
        .string()
        .optional()
        .describe('Period type (default: "monthly")'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { companyId, ...body } = params as {
        type: string;
        year: number;
        month: number;
        periodType?: string;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/declarations', {
        companyId: effectiveCompanyId,
        method: 'POST',
        body,
      });
      if (res.ok && (params.data || params.dosarId)) {
        const created = res.data as { id: string };
        if (params.data) {
          const upd = await apiRequest(`/api/v1/declarations/${created.id}`, { method: 'PATCH', body: { data: params.data }, companyId: effectiveCompanyId });
          if (!upd.ok) return formatResponse(upd);
          res.data = upd.data;
        }
        if (params.dosarId) {
          await apiRequest(`/api/v1/dosare/${params.dosarId as string}/attach`, { method: 'POST', body: { declarationId: created.id }, companyId: effectiveCompanyId });
        }
      }
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_recalculate',
    description:
      'Recalculate a draft declaration by re-populating its data from current invoices. Only works on declarations in "draft" status.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID to recalculate'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, companyId } = params as { id: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/declarations/${id}/recalculate`, {
        companyId: effectiveCompanyId,
        method: 'POST',
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_validate',
    description:
      'Validate a draft declaration by generating and checking the XML output. Transitions the declaration to "validated" status if successful.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID to validate'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, companyId } = params as { id: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/declarations/${id}/validate`, {
        companyId: effectiveCompanyId,
        method: 'POST',
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_submit',
    description:
      'Submit a declaration to ANAF. Generates XML, uploads to ANAF SPV, and begins async status polling. Works on "draft" or "validated" declarations.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID to submit'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, companyId } = params as { id: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/declarations/${id}/submit`, {
        companyId: effectiveCompanyId,
        method: 'POST',
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_delete',
    description:
      'Soft-delete a tax declaration. Cannot delete accepted declarations.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID to delete'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, companyId } = params as { id: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/declarations/${id}`, {
        companyId: effectiveCompanyId,
        method: 'DELETE',
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_sync',
    description:
      'RETIRED server-side sync: ANAF SPVWS2 accepts only the qualified certificate (mTLS), so this endpoint now answers 409 AGENT_REQUIRED. Declarations and SPV messages are pulled through the local storno-agent from the web app (declarations page or the SPV documents page); the tools spv_sync_prepare / spv_sync_agent_result cover the same flow for automation.',
    inputSchema: z.object({
      year: z
        .number()
        .int()
        .min(2000)
        .max(2100)
        .describe('Year to sync declarations for (e.g. 2026)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { year, companyId } = params as { year: number; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/declarations/sync', {
        companyId: effectiveCompanyId,
        method: 'POST',
        body: { year },
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_refresh_statuses',
    description:
      'RETIRED server-side status refresh: answers 409 AGENT_REQUIRED because ANAF SPVWS2 requires the qualified certificate (mTLS). Refresh statuses from the web app through the local storno-agent.',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { companyId } = params as { companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/declarations/refresh-statuses', {
        companyId: effectiveCompanyId,
        method: 'POST',
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_download_xml',
    description:
      'Download the generated XML for a tax declaration. Returns the raw XML content.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, companyId } = params as { id: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/declarations/${id}/xml`, {
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_update',
    description: 'Update a draft declaration: `data` (for d212 / c168 the form input under data.input and attachments under data.attachments) and/or `metadata`. Only drafts can be edited.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID'),
      data: z.record(z.string(), z.unknown()).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
      companyId: z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const { id, companyId, ...body } = params as Record<string, unknown> & { id: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();
      return formatResponse(await apiRequest(`/api/v1/declarations/${id}`, { method: 'PATCH', body, companyId: effectiveCompanyId }));
    },
  },
  {
    name: 'declarations_file_via_agent',
    description:
      "File a declaration at ANAF in one call, the way the web app does: Storno prepares the XML and the DUK PDF (with the attachment zip for c168), the local Storno Agent signs it with the qualified certificate and uploads it to the e-guvernare portal, and Storno records ANAF's upload index (status processing; the recipisa arrives in the SPV inbox and in the dosar). Needs the agent on this computer and the PIN (pin, STORNO_AGENT_PIN, or the PIN remembered on this computer by the agent). Check declarations_validate first. Remember: one C168 per landlord and period in processing at a time.",
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID'),
      certificateId: z.string().describe('Certificate id from agent_certificates'),
      pin: z.string().optional().describe('Token PIN; defaults to STORNO_AGENT_PIN, or to the PIN the agent remembers for this certificate'),
      companyId: z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const pin = pinFrom(params);
      const { id, certificateId, companyId } = params as { id: string; certificateId: string; companyId?: string };
      if (!pin && !(await agentRemembersPin(certificateId))) return formatResponse({ ok: false, status: 400, error: PIN_MISSING });
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const prep = await apiRequest(`/api/v1/declarations/${id}/prepare`, { companyId: effectiveCompanyId, query: { operation: 'submit' } });
      if (!prep.ok) return formatResponse(prep);
      const p = prep.data as { pdfBase64: string; anafUrl: string; uploadMode?: string; uploadField?: string; fileName?: string; sessionUrl?: string };
      let agentRes: any;
      try {
        agentRes = await agent('/sign-and-submit', {
          pdf: p.pdfBase64,
          certificateId,
          pin,
          uploadUrl: p.anafUrl,
          uploadHeaders: {},
          uploadMode: p.uploadMode ?? 'multipart',
          uploadField: p.uploadField ?? 'linkdoc',
          fileName: p.fileName ?? `${id}.pdf`,
          sessionUrl: p.sessionUrl,
        }, 400_000);
      } catch (e) {
        return formatResponse({ ok: false, status: 502, error: `Storno Agent not reachable: ${(e as Error).message}`, details: { hint: 'Start the Storno Agent on this computer (https://get.storno.ro/agent) and plug in the token.' } });
      }
      if (agentRes.error) return formatResponse({ ok: false, status: 502, error: String(agentRes.error), details: agentRes.details });
      const result = await apiRequest(`/api/v1/declarations/${id}/agent-result`, {
        method: 'POST',
        body: { statusCode: agentRes.statusCode, headers: agentRes.headers ?? {}, body: agentRes.body ?? '' },
        companyId: effectiveCompanyId,
      });
      return formatResponse(result);
    },
  },
  {
    name: 'declarations_download_pdf',
    description:
      "The PDF ANAF accepts for this declaration (DUKIntegrator's form with the XML embedded and, for C168, the attachment zip), generated on demand from the current data. Use it when the user files by hand: they upload this file in SPV (persoane fizice: SPV → Depunere declarații) or on the e-guvernare portal with their own certificate. Written to outFile. Storno's rules and ANAF's validator run first; errors come back instead of a broken file.",
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID'),
      outFile: z.string().describe('Where to write the PDF'),
      refresh: z.boolean().optional().describe('Regenerate even if a PDF was already produced (drafts only)'),
      companyId: z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const effectiveCompanyId = (params.companyId as string | undefined) || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();
      const res = await apiRequest(`/api/v1/declarations/${params.id as string}/pdf`, { companyId: effectiveCompanyId, query: params.refresh ? { refresh: '1' } : {}, binary: true });
      if (!res.ok) return formatResponse(res);
      const out = resolve(params.outFile as string);
      writeFileSync(out, Buffer.isBuffer(res.data) ? res.data : Buffer.from(String(res.data)));
      return formatResponse({ ok: true, status: 200, data: { file: out, next: 'Upload this PDF in SPV (Depunere declarații) or file it with declarations_file_via_agent; then anaf_declaration_status / the recipisa in the SPV inbox.' } });
    },
  },
  {
    name: 'declarations_prepare',
    description:
      'Prepare a declaration for agent-based submission. Returns XML content, ANAF URL, Bearer token, and CIF needed by the local agent to proxy the mTLS request. Use operation param for different flows: submit (default), listMessages, download.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID'),
      operation: z
        .enum(['submit', 'listMessages', 'download'])
        .optional()
        .describe('Operation type (default: submit)'),
      downloadId: z
        .string()
        .optional()
        .describe('ANAF download ID (required for operation=download)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, operation, downloadId, companyId } = params as {
        id: string;
        operation?: string;
        downloadId?: string;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const query: Record<string, string> = {};
      if (operation) query.operation = operation;
      if (downloadId) query.downloadId = downloadId;

      const res = await apiRequest(`/api/v1/declarations/${id}/prepare`, {
        companyId: effectiveCompanyId,
        query,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'declarations_agent_result',
    description:
      'Submit the ANAF response received via the local agent back to the server. The server parses the response, extracts the upload ID, sets status to PROCESSING, and dispatches status checking.',
    inputSchema: z.object({
      id: z.string().describe('Declaration UUID'),
      statusCode: z.number().int().describe('HTTP status code from ANAF response'),
      headers: z
        .record(z.string())
        .optional()
        .describe('Response headers from ANAF'),
      body: z.string().describe('Response body from ANAF'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id, statusCode, headers, body, companyId } = params as {
        id: string;
        statusCode: number;
        headers?: Record<string, string>;
        body: string;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/declarations/${id}/agent-result`, {
        companyId: effectiveCompanyId,
        method: 'POST',
        body: { statusCode, headers, body },
      });
      return formatResponse(res);
    },
  },
];
