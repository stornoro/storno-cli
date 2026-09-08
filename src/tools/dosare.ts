import { z } from 'zod';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest('/api/v1/dosare', { query: { type: params.type as string | undefined, status: params.status as string | undefined }, companyId: params.companyId as string | undefined }));
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
    inputSchema: z.object({ companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
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
    description: 'Update a dosar: title, subject fields (merged), status (active / attention / closed), nextStep, deadlineAt + deadlineLabel, notes.',
    inputSchema: z.object({
      id: z.string().uuid(),
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
    name: 'dosare_document',
    description:
      "Generate a legal document from a rental-contract dosar, prefilled with the landlord (company), tenant, contract and property: 'conventie_incetare_inchiriere' (termination agreement) or 'declaratie_incetare_contract' (landlord's sworn statement, the C168 termination attachment). Without `render` you get the prefilled fields to review with the user; with render:true and the reviewed `fields` (overrides) you get the PDF (written to outFile when given). Sign it by hand or with agent_sign_pdf, then attach it to the C168 termination.",
    inputSchema: z.object({
      id: z.string().uuid().describe('Rental-contract dosar id'),
      type: z.enum(['conventie_incetare_inchiriere', 'declaratie_incetare_contract']),
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
