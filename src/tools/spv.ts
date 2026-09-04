import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

const CATEGORIES = [
  'somatie', 'decizie', 'notificare', 'adresa', 'analiza_risc', 'recipisa', 'declaratie',
  'certificat', 'raspuns', 'plata', 'extras_cont', 'ajutor_stat', 'facturi_arhiva', 'tezaur', 'registru', 'altele',
] as const;
const SEVERITIES = ['critical', 'high', 'normal', 'low'] as const;

const companyIdSchema = z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)');

export const tools = [
  {
    name: 'spv_documents_list',
    description:
      'List the archived ANAF SPV inbox for a company: every message (somatii / enforcement notices, decizii, notificari, adrese, recipise, certificate, plati...) classified by category and severity, with archived-PDF status. Critical items (SOMATII, inactivation/VAT-cancellation decisions, risk reports) carry short legal deadlines. Documents get into the archive through the local storno-agent sync (certificate/mTLS), see spv_sync_prepare.',
    inputSchema: z.object({
      category: z.enum(CATEGORIES).optional().describe('Filter by category'),
      severity: z.enum(SEVERITIES).optional().describe('Filter by severity'),
      unread: z.boolean().optional().describe('Only documents not yet read'),
      search: z.string().optional().describe('Search in message type, details or ANAF id'),
      from: z.string().optional().describe('ANAF date from (YYYY-MM-DD)'),
      to: z.string().optional().describe('ANAF date to (YYYY-MM-DD)'),
      page: z.number().int().optional().describe('Page number (default: 1)'),
      limit: z.number().int().optional().describe('Items per page (default: 10, max: 100)'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const { companyId, ...query } = params as Record<string, unknown> & { companyId?: string };
      const res = await apiRequest('/api/v1/spv/documents', {
        query: { ...query, unread: query.unread ? 1 : undefined },
        companyId,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'spv_documents_stats',
    description:
      'Counts for the SPV inbox archive of a company: total, unread, PDFs still to download, breakdown by category and by severity, plus the category and severity lists.',
    inputSchema: z.object({ companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const res = await apiRequest('/api/v1/spv/documents/stats', { companyId: params.companyId as string | undefined });
      return formatResponse(res);
    },
  },
  {
    name: 'spv_documents_get',
    description: 'Get one archived SPV document with all details (ANAF ids, dates, archive status, download errors).',
    inputSchema: z.object({
      uuid: z.string().describe('SPV document UUID'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const res = await apiRequest(`/api/v1/spv/documents/${params.uuid}`, { companyId: params.companyId as string | undefined });
      return formatResponse(res);
    },
  },
  {
    name: 'spv_documents_download',
    description: 'Download the archived PDF of an SPV document to a local file. Fails with SPV_FILE_PENDING when the agent has not fetched it yet, or SPV_FILE_PURGED when retention removed it.',
    inputSchema: z.object({
      uuid: z.string().describe('SPV document UUID'),
      outputPath: z.string().describe('Local file path to write the PDF to'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const res = await apiRequest(`/api/v1/spv/documents/${params.uuid}/download`, {
        binary: true,
        filePath: params.outputPath as string,
        companyId: params.companyId as string | undefined,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'spv_documents_mark_read',
    description: 'Mark one SPV document as read (or all unread documents of the company when uuid is omitted).',
    inputSchema: z.object({
      uuid: z.string().optional().describe('SPV document UUID; omit to mark everything read'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = params.companyId as string | undefined;
      const res = params.uuid
        ? await apiRequest(`/api/v1/spv/documents/${params.uuid}/read`, { method: 'PATCH', body: {}, companyId })
        : await apiRequest('/api/v1/spv/documents/read-all', { method: 'POST', body: {}, companyId });
      return formatResponse(res);
    },
  },
  {
    name: 'spv_sync_prepare',
    description:
      'Step 1 of an SPV inbox sync. Returns the ANAF listaMesaje URL the local storno-agent must GET with the qualified certificate (mTLS; the OAuth token is not accepted by SPVWS2), plus any PDFs still pending download. Relay the ANAF response with spv_sync_agent_result.',
    inputSchema: z.object({
      days: z.number().int().min(1).max(60).optional().describe('How many days back to list (default and max: 60)'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const res = await apiRequest('/api/v1/spv/sync-prepare', {
        method: 'POST',
        body: { days: params.days },
        companyId: params.companyId as string | undefined,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'spv_sync_agent_result',
    description:
      'Step 2 of an SPV inbox sync: relay the raw ANAF listaMesaje response fetched by the agent. Every message is archived and classified, users are notified (push/email) about critical and important documents, and the response lists the PDFs the agent should now fetch from descarcare and upload with spv_document_upload.',
    inputSchema: z.object({
      statusCode: z.number().int().describe('HTTP status ANAF returned'),
      body: z.string().describe('Raw response body from ANAF (JSON)'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const res = await apiRequest('/api/v1/spv/sync-agent-result', {
        method: 'POST',
        body: { statusCode: params.statusCode, body: params.body },
        companyId: params.companyId as string | undefined,
      });
      return formatResponse(res);
    },
  },
  {
    name: 'spv_document_upload',
    description:
      'Step 3 of an SPV inbox sync: store the PDF the agent fetched from ANAF descarcare for a document. Pass the body base64-encoded. HTML answers (expired SPV session) are rejected with SPV_NOT_A_DOCUMENT.',
    inputSchema: z.object({
      uuid: z.string().describe('SPV document UUID (from spv_sync_agent_result documents[])'),
      statusCode: z.number().int().describe('HTTP status ANAF returned for descarcare'),
      bodyBase64: z.string().describe('Response body, base64-encoded'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const res = await apiRequest(`/api/v1/spv/documents/${params.uuid}/agent-document`, {
        method: 'POST',
        body: { statusCode: params.statusCode, body: params.bodyBase64, bodyEncoding: 'base64' },
        companyId: params.companyId as string | undefined,
      });
      return formatResponse(res);
    },
  },
];
