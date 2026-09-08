import { z } from 'zod';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

const companyIdSchema = z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)');
const DOSAR_TYPES = ['rental_contract', 'annual_return', 'periodic', 'fiscal_status', 'generic'] as const;
const DOSAR_STATUSES = ['active', 'attention', 'closed'] as const;

/**
 * Dosare (case files): a rental contract, one year's Declarația unică, the periodic
 * returns or the company's fiscal standing, grouping the declarations filed for it,
 * the SPV requests, the ANAF messages the inbox sync links to them, and deadlines.
 */
export const tools = [
  {
    name: 'dosare_list',
    description:
      "Case files (dosare) of the company: rental contracts (with tenant, rent, period, the 30-day C168 deadline), yearly Declarația unică dosare (25 May deadline), periodic returns, fiscal standing. Each carries status (active / attention / closed), next step, deadline with days left, and counts of linked declarations, SPV requests and ANAF messages.",
    inputSchema: z.object({
      type: z.enum(DOSAR_TYPES).optional(),
      status: z.enum(DOSAR_STATUSES).optional(),
      clientId: z.string().uuid().optional().describe('Only dosare linked to this client (the tenant)'),
      supplierId: z.string().uuid().optional().describe('Only dosare linked to this supplier'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest('/api/v1/dosare', { query: { type: params.type as string | undefined, status: params.status as string | undefined, clientId: params.clientId as string | undefined, supplierId: params.supplierId as string | undefined }, companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_actions',
    description:
      'What needs the user\'s attention across all dosare: "todo" (rejected filings with the reason, requests in error, dosare flagged for a decision, deadlines within 14 days, contracts expiring within 60 days, unread somații/decizii), "inProgress" (filings ANAF is processing, requests without answer) and "answers" (recipisas, answers, certificates received in the last 14 days). Start here when the user asks "what do I have to do?".',
    inputSchema: z.object({ companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest('/api/v1/dosare/actions', { companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_stats',
    description:
      'Rental portfolio of the company: every property with tenant, rent, period, active/expiring state and linked declarations; active contracts; contracts expiring within 60 days; monthly rent by currency; expected gross rent per income year from the contracts (RON) versus what the D212s declared per year (with the declaration status). Answers "how much rent did I collect and declare last year?".',
    inputSchema: z.object({ companyId: companyIdSchema, csvOutFile: z.string().optional().describe('Write the portfolio as a CSV file to this path instead of returning JSON') }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      if (params.csvOutFile) {
        const res = await apiRequest('/api/v1/dosare/stats', { query: { format: 'csv' }, companyId: params.companyId as string | undefined, binary: true });
        if (!res.ok) return formatResponse(res);
        const out = resolve(params.csvOutFile as string);
        writeFileSync(out, Buffer.isBuffer(res.data) ? res.data : Buffer.from(String(res.data)));
        return formatResponse({ ok: true, status: 200, data: { file: out } });
      }
      return formatResponse(await apiRequest('/api/v1/dosare/stats', { companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_get',
    description: 'One dosar with its linked declarations, SPV requests, ANAF messages and the chronological timeline (filed, index, recipisa, answers).',
    inputSchema: z.object({ id: z.string().uuid(), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/dosare/${params.id as string}`, { companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_create',
    description:
      'Create a dosar. For a rental contract pass subject {numar, data (contract date), adresa (property), chirias, chiriasCif (tenant CNP/CUI — needed for C168), chirie (monthly), moneda, deLa, panaLa, dataIncetare?}: the title and the 30-day C168 deadline are derived. For the yearly Declarația unică use dosare_annual_return instead. Other types: title, deadlineAt, deadlineLabel, nextStep, notes.',
    inputSchema: z.object({
      type: z.enum(DOSAR_TYPES),
      title: z.string().optional(),
      subject: z.record(z.string(), z.unknown()).optional(),
      status: z.enum(DOSAR_STATUSES).optional(),
      nextStep: z.string().optional(),
      deadlineAt: z.string().optional().describe('YYYY-MM-DD'),
      deadlineLabel: z.string().optional(),
      notes: z.string().optional(),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const { companyId, ...body } = params as Record<string, unknown> & { companyId?: string };
      return formatResponse(await apiRequest('/api/v1/dosare', { method: 'POST', body, companyId }));
    },
  },
  {
    name: 'dosare_update',
    description: 'Update a dosar: title, subject fields (merged), status (active / attention / closed), nextStep, deadlineAt + deadlineLabel, notes, and the link to the other party as a client / supplier of the company (clientId / supplierId; null unlinks). The link is found by the tenant CUI/CNP automatically when a dosar is created; set it by hand when the client record has a different identifier.',
    inputSchema: z.object({
      id: z.string().uuid(),
      clientId: z.string().uuid().nullable().optional(),
      supplierId: z.string().uuid().nullable().optional(),
      title: z.string().optional(),
      subject: z.record(z.string(), z.unknown()).optional(),
      status: z.enum(DOSAR_STATUSES).optional(),
      nextStep: z.string().nullable().optional(),
      deadlineAt: z.string().nullable().optional(),
      deadlineLabel: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const { id, companyId, ...body } = params as Record<string, unknown> & { id: string; companyId?: string };
      return formatResponse(await apiRequest(`/api/v1/dosare/${id}`, { method: 'PATCH', body, companyId }));
    },
  },
  {
    name: 'dosare_delete',
    description: 'Delete a dosar. Its declarations, requests and messages are kept, only ungrouped.',
    inputSchema: z.object({ id: z.string().uuid(), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/dosare/${params.id as string}`, { method: 'DELETE', companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_attach',
    description: 'Attach (or detach) a declaration, an SPV request or an ANAF message to a dosar. A declaration brings its archived recipisas along; a request brings its answer.',
    inputSchema: z.object({
      id: z.string().uuid().describe('Dosar id'),
      declarationId: z.string().uuid().optional(),
      requestId: z.string().uuid().optional(),
      documentId: z.string().uuid().optional(),
      detach: z.boolean().optional().describe('true → remove the link instead'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const { id, companyId, detach, ...body } = params as Record<string, unknown> & { id: string; companyId?: string; detach?: boolean };
      return formatResponse(await apiRequest(`/api/v1/dosare/${id}/${detach ? 'detach' : 'attach'}`, { method: 'POST', body, companyId }));
    },
  },
  {
    name: 'dosare_annual_return',
    description: 'Ensure the "Declarația unică <an>" dosar (one per filing year) with its 25 May deadline; returns it. Default year: the one whose 25 May is next. Deadline reminders go out 30, 7 and 1 days before.',
    inputSchema: z.object({ an: z.number().int().optional().describe('Filing year, e.g. 2026 for the income of 2025'), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest('/api/v1/dosare/annual-return', { method: 'POST', body: params.an ? { an: params.an } : {}, companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_d212_prefill',
    description: 'D212 rent-scenario input prefilled from the rental-contract dosare for the income year of a Declarația unică dosar (contract, period within the year, gross rent = monthly rent × months for RON contracts; foreign-currency rents come back as 0 with a note to convert at BNR rates). Review it with the user, then dosare_d212_create.',
    inputSchema: z.object({ id: z.string().uuid().describe('Declarația unică dosar id'), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/dosare/${params.id as string}/d212-prefill`, { companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_d212_create',
    description: 'Create the D212 draft (rent scenario) inside a Declarația unică dosar from the reviewed input (schema: declaration_form_spec D212; omit input to use the prefill as is). The draft then goes through declarations_validate (ANAF DUKIntegrator), declarations_prepare / declarations_agent_result (sign + file with the certificate through the local agent) and the recipisa lands in the dosar.',
    inputSchema: z.object({ id: z.string().uuid(), input: z.record(z.string(), z.unknown()).optional(), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/dosare/${params.id as string}/d212`, { method: 'POST', body: params.input ? { input: params.input } : {}, companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_files_upload',
    description: 'Put a file into a dosar: the scanned contract (kind contract), an addendum (act_aditional), the termination document or the signed sworn statement (incetare), a signed declaration (declaratie), anything else (altele). PDF, JPG, PNG or TIFF, up to 10 MB. Files in a dosar become the zip attachment of the C168 filed from it.',
    inputSchema: z.object({ id: z.string().uuid().describe('Dosar id'), path: z.string().describe('Local file path'), kind: z.enum(['contract', 'act_aditional', 'incetare', 'declaratie', 'altele']).optional(), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const abs = resolve(params.path as string);
      return formatResponse(await apiRequest(`/api/v1/dosare/${params.id as string}/files`, { method: 'POST', filePath: abs, fileFieldName: 'file', formFields: { kind: (params.kind as string | undefined) ?? 'altele' }, companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_files_download',
    description: 'Download a file kept in a dosar to a local path (e.g. to sign it with agent_sign_pdf, then upload the signed copy with dosare_files_upload).',
    inputSchema: z.object({ id: z.string().uuid().describe('Dosar id'), fileId: z.string().uuid(), outFile: z.string(), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const res = await apiRequest(`/api/v1/dosare/${params.id as string}/files/${params.fileId as string}/download`, { binary: true, companyId: params.companyId as string | undefined });
      if (!res.ok) return formatResponse(res);
      const out = resolve(params.outFile as string);
      writeFileSync(out, Buffer.isBuffer(res.data) ? res.data : Buffer.from(String(res.data)));
      return formatResponse({ ok: true, status: 200, data: { file: out } });
    },
  },
  {
    name: 'dosare_c168_prefill',
    description:
      "The C168 input (registration / amendment / termination of the rental contract) prefilled from a rental-contract dosar and the company, with Storno's rule issues listing what is still missing (nomenclator address codes for the property, tenant and landlord; tenant CNP …). Fill the gaps with anaf_nomenclator_* and the user, then dosare_c168_create. Also lists the dosar files that can be attached.",
    inputSchema: z.object({ id: z.string().uuid().describe('Rental-contract dosar id'), actiune: z.enum(['inregistrare', 'modificare', 'incetare']).optional(), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/dosare/${params.id as string}/c168-prefill`, { query: { actiune: (params.actiune as string | undefined) ?? 'inregistrare' }, companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_c168_create',
    description:
      'Create the C168 declaration in the dosar from the reviewed input (schema: declaration_form_spec C168) with the attachment: dosar files by id (fileIds) and/or local files (attachmentPaths) — the scanned contract for a registration, the addendum for an amendment, the termination document or the signed sworn statement for a termination. Storno applies its rules (errors → 422 with issues), stores the reviewed addresses in the dosar for next time and sets the next step. Then declarations_validate and declarations_file_via_agent. ANAF processes one C168 per landlord and period at a time.',
    inputSchema: z.object({
      id: z.string().uuid().describe('Rental-contract dosar id'),
      actiune: z.enum(['inregistrare', 'modificare', 'incetare']),
      input: z.record(z.string(), z.unknown()).optional().describe('Reviewed C168 input; omitted → the prefill as is'),
      fileIds: z.array(z.string().uuid()).optional(),
      attachmentPaths: z.array(z.string()).optional(),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const attachments = ((params.attachmentPaths as string[] | undefined) ?? []).map((p) => { const abs = resolve(p); return { name: basename(abs), contentBase64: readFileSync(abs).toString('base64') }; });
      return formatResponse(await apiRequest(`/api/v1/dosare/${params.id as string}/c168`, { method: 'POST', body: { actiune: params.actiune, input: params.input, fileIds: params.fileIds, attachments }, companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_registry_proposals',
    description:
      "Contracts listed in ANAF's registry extract (\"Registrul contractelor de locatiune\", the answer to the C168 SPV request — request it with spv_request_prepare type C168) with their state after all filings (active / expired without termination / terminated), each matched to the existing dosare. Reads the newest extract archived in the SPV inbox, or the PDF at pdfPath. Then dosare_registry_import for the ones without a dosar.",
    inputSchema: z.object({ pdfPath: z.string().optional().describe('Local PDF of the extract, when it was downloaded by hand'), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      if (params.pdfPath) {
        return formatResponse(await apiRequest('/api/v1/dosare/registry-proposals', { method: 'POST', filePath: resolve(params.pdfPath as string), fileFieldName: 'file', formFields: {}, companyId: params.companyId as string | undefined }));
      }
      return formatResponse(await apiRequest('/api/v1/dosare/registry-proposals', { companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_registry_import',
    description: 'Create rental-contract dosare for registry contracts (pass the contract objects from dosare_registry_proposals, usually those with existingDosarId null). Terminated contracts become closed dosare; expired ones without a termination filing are flagged for attention (file C168 încetare or an addendum).',
    inputSchema: z.object({ contracts: z.array(z.record(z.string(), z.unknown())).min(1), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest('/api/v1/dosare/registry-import', { method: 'POST', body: { contracts: params.contracts }, companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_billing',
    description:
      "Everything invoiced between the landlord and the tenant of a rental dosar (matched by the tenant's CUI/CNP on clients and suppliers): the recurring invoice, the invoices issued to the tenant with paid / partial / unpaid / overdue state and days overdue, totals per currency, the invoices received from the tenant (e.g. works compensated with the rent) and, when the dosar records an investment clause, the compensation balance. Answers \"did the tenant pay?\" and \"how much rent is outstanding?\".",
    inputSchema: z.object({ id: z.string().uuid().describe('Rental-contract dosar id'), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/dosare/${params.id as string}/billing`, { companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'dosare_document',
    description:
      "Generate a legal document from a rental-contract dosar, prefilled with the landlord (company), tenant, contract and property: 'conventie_incetare_inchiriere' (termination agreement), 'declaratie_incetare_contract' (landlord's sworn statement, the C168 termination attachment), 'act_aditional_inchiriere' (addendum: extension and/or new rent; fields act{numar,data}, prelungire{data_inceput,data_sfarsit}, chirie_noua{suma,valuta,de_la}) or 'notificare_incetare_inchiriere' (termination notice: data_incetare, preaviz_zile, motiv). Without `render` you get the prefilled fields to review with the user; with render:true and the reviewed `fields` (overrides) you get the PDF (written to outFile when given). Sign it by hand or with agent_sign_pdf, then attach it to the C168 termination.",
    inputSchema: z.object({
      id: z.string().uuid().describe('Rental-contract dosar id'),
      type: z.enum(['conventie_incetare_inchiriere', 'declaratie_incetare_contract', 'act_aditional_inchiriere', 'notificare_incetare_inchiriere']),
      render: z.boolean().optional(),
      fields: z.record(z.string(), z.unknown()).optional().describe('Overrides for the prefilled fields (e.g. locatar.adresa, data_incetare, motiv)'),
      outFile: z.string().optional(),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const path = `/api/v1/dosare/${params.id as string}/document/${params.type as string}`;
      if (!params.render) return formatResponse(await apiRequest(path, { companyId: params.companyId as string | undefined }));
      const res = await apiRequest(path, { method: 'POST', body: (params.fields as Record<string, unknown> | undefined) ?? {}, companyId: params.companyId as string | undefined });
      if (!res.ok || !params.outFile) return formatResponse(res);
      const data = res.data as { title: string; fileName: string; pdfBase64: string };
      const out = resolve(params.outFile as string);
      writeFileSync(out, Buffer.from(data.pdfBase64, 'base64'));
      return formatResponse({ ok: true, status: 200, data: { title: data.title, file: out } });
    },
  },
];
