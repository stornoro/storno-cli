import { z } from 'zod';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { formatResponse } from '../utils/errors.js';

const ok = (data: unknown) => formatResponse({ ok: true, status: 200, data });
const fail = (error: string, details?: unknown) => formatResponse({ ok: false, status: 502, error, details });

/**
 * Tools that talk to the local Storno Agent (https://agent.storno.ro:17394 → 127.0.0.1),
 * the program that holds the user's qualified certificate (USB token) and signs /
 * uploads on their machine. They only work when the MCP server runs on the same
 * computer as the agent (Claude Desktop / Claude Code with the stdio transport).
 *
 * PIN: pass `pin`, or set STORNO_AGENT_PIN in the MCP server environment. Nothing
 * is sent to ANAF without it.
 */
const AGENT_BASE = process.env.STORNO_AGENT_URL || 'https://agent.storno.ro:17394';
const PORTAL_SESSION_URL = 'https://decl.anaf.mfinante.gov.ro/WAS6DUS/';
const PORTAL_UPLOAD_URL = 'https://decl.anaf.mfinante.gov.ro/WAS6DUS/displayFile.do';

async function agent(path: string, body?: unknown, timeoutMs = 300_000): Promise<any> {
  // The agent's TLS certificate is issued for agent.storno.ro and is trusted by browsers;
  // Node may not have the intermediate, so allow it explicitly for the loopback agent only.
  const res = await fetch(`${AGENT_BASE}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Storno-Agent': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: `Agent answered HTTP ${res.status}: ${text.slice(0, 200)}` };
  }
}

function pinFrom(params: Record<string, unknown>): string | undefined {
  const pin = (params.pin as string | undefined) || process.env.STORNO_AGENT_PIN;
  return pin && pin.trim() !== '' ? pin : undefined;
}

function pdfFiles(inputs: string[]): string[] {
  const out: string[] = [];
  for (const p of inputs) {
    const abs = resolve(p);
    const st = statSync(abs);
    if (st.isDirectory()) {
      for (const f of readdirSync(abs)) {
        if (extname(f).toLowerCase() === '.pdf' && !f.endsWith('.signed.pdf')) out.push(join(abs, f));
      }
    } else {
      out.push(abs);
    }
  }
  return out;
}

function signedPath(file: string, outDir?: string): string {
  const name = basename(file, extname(file)) + '.signed.pdf';
  return join(outDir ? resolve(outDir) : dirname(file), name);
}

export const tools = [
  {
    name: 'agent_status',
    description: 'Is the local Storno Agent running, which version, and is an update available. The agent lives on the user\'s computer and holds the qualified certificate (USB token) used for ANAF declarations, SPV and PDF signing.',
    inputSchema: z.object({}),
    handler: async (): Promise<string> => {
      try {
        return ok(await agent('/health', undefined, 5_000));
      } catch (e) {
        return fail(`Agent not running: ${(e as Error).message}`, { hint: 'Install or start the Storno Agent: https://get.storno.ro/agent' });
      }
    },
  },
  {
    name: 'agent_certificates',
    description: 'Qualified certificates the local Storno Agent can use (USB tokens, Keychain / Windows store identities): id, subject, issuer, expiry. The id is what agent_sign_pdf and the submission tools need.',
    inputSchema: z.object({}),
    handler: async (): Promise<string> => ok(await agent('/certificates', undefined, 60_000)),
  },
  {
    name: 'agent_sign_pdf',
    description:
      'Sign one or many PDF files with the qualified certificate through the local Storno Agent (PAdES/CMS signature embedded in the PDF), e.g. declarations produced by DUKIntegrator, contracts, any document ANAF or a partner wants signed. Pass file paths and/or directories (all *.pdf inside); each signed copy is written next to the original as <name>.signed.pdf (or into outDir). Requires the certificate PIN (pin or STORNO_AGENT_PIN); the batch stops at the first PIN error to protect the token.',
    inputSchema: z.object({
      files: z.array(z.string()).min(1).describe('PDF paths and/or directories'),
      certificateId: z.string().describe('Certificate id from agent_certificates'),
      pin: z.string().optional().describe('Token PIN; defaults to STORNO_AGENT_PIN'),
      outDir: z.string().optional().describe('Directory for the signed copies (default: next to each file)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const pin = pinFrom(params);
      if (!pin) return fail('PIN required: pass pin or set STORNO_AGENT_PIN. Nothing is signed without it.');
      const files = pdfFiles(params.files as string[]);
      if (files.length === 0) return fail('No PDF files found');
      const items = files.map((f) => ({ name: basename(f), pdf: readFileSync(f).toString('base64') }));
      const res = await agent('/sign', { certificateId: params.certificateId, pin, items }, 120_000 * items.length);
      if (res.error && !res.results) return fail(String(res.error));
      const report = (res.results as Array<{ index: number; name: string; pdf?: string; bytes?: number; error?: string }>).map((r) => {
        if (!r.pdf) return { file: files[r.index], error: r.error };
        const out = signedPath(files[r.index], params.outDir as string | undefined);
        writeFileSync(out, Buffer.from(r.pdf, 'base64'));
        return { file: files[r.index], signed: out, bytes: r.bytes };
      });
      return ok({ signed: report.filter((r) => 'signed' in r).length, failed: report.filter((r) => 'error' in r).length, aborted: res.aborted ?? false, reason: res.reason, files: report });
    },
  },
  {
    name: 'agent_submit_declaration_pdf',
    description:
      "File a declaration PDF (made by DUKIntegrator, XML embedded, e.g. from Storno's declarations or a C168/D212 built with the public tools) at ANAF: the local agent signs it with the certificate and uploads it to the e-guvernare declarations portal (WAS6DUS), then returns ANAF's upload index. Track it with anaf_declaration_status (index + CUI/CNP); the recipisa arrives in the SPV inbox and on StareD112. Requires the PIN.",
    inputSchema: z.object({
      file: z.string().describe('Path to the DUK-generated PDF'),
      certificateId: z.string(),
      pin: z.string().optional(),
      fileName: z.string().optional().describe('Name sent to ANAF (default: the file name)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const pin = pinFrom(params);
      if (!pin) return fail('PIN required: pass pin or set STORNO_AGENT_PIN.');
      const file = resolve(params.file as string);
      const res = await agent('/sign-and-submit', {
        pdf: readFileSync(file).toString('base64'),
        certificateId: params.certificateId,
        pin,
        uploadUrl: PORTAL_UPLOAD_URL,
        uploadHeaders: {},
        uploadMode: 'multipart',
        uploadField: 'linkdoc',
        fileName: (params.fileName as string | undefined) || basename(file),
        sessionUrl: PORTAL_SESSION_URL,
      }, 400_000);
      if (res.error) return fail(String(res.error));
      const text = String(res.body ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const index = text.match(/Indexul este\s*(\d+)/i)?.[1] ?? null;
      const reason = text.match(/Motivul:\s*([^.]{0,200})/i)?.[1]?.trim() ?? null;
      return ok({ accepted: !!index, index, statusCode: res.statusCode, message: index ? `Depus cu succes. Index ${index}.` : (reason ?? text.slice(0, 300)), statusUrl: 'https://www.anaf.ro/StareD112' });
    },
  },
];
