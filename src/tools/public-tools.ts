import { z } from 'zod';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { apiRequest } from '../client.js';
import { formatResponse } from '../utils/errors.js';

const partySchema = z.object({
  name: z.string().describe('Legal name'),
  address: z.string().describe('Street address (BR-RO-081/082)'),
  city: z.string().describe('City. For Bucharest use the sector, e.g. "Sector 3"'),
  county: z.string().describe('County name or ISO code, e.g. "Cluj" or "CJ"'),
  country: z.string().optional().describe('ISO 3166-1 alpha-2, default RO'),
  registrationNumber: z.string().optional().describe('Trade register number, e.g. J12/345/2020'),
});

const lineSchema = z.object({
  description: z.string(),
  quantity: z.union([z.number(), z.string()]).describe('Positive quantity as on the original invoice. The generator negates it.'),
  unitPrice: z.union([z.number(), z.string()]).describe('Positive unit price'),
  vatRate: z.union([z.number(), z.string()]).optional().describe('0, 5, 9, 11, 19 or 21. Default 21 for VAT payers, 0 otherwise.'),
  unitOfMeasure: z.enum(['buc', 'kg', 'l', 'm', 'ora', 'zi', 'luna', 'set', 'pachet']).optional().describe('Default buc'),
  vatIncluded: z.boolean().optional().describe('Unit price includes VAT. Default false.'),
  vatCategoryCode: z.enum(['S', 'Z', 'E', 'AE', 'O', 'K', 'G']).optional().describe('UNCL5305 VAT category. Derived automatically when omitted.'),
});

export const tools = [
  {
    name: 'anaf_nomenclator_judete',
    description: "ANAF county nomenclator (cod judet as used in declaration XSDs: 40 = Municipiul Bucuresti, 13 = Constanta …) with the fiscal offices (organe fiscale, ufisc codes) of each county. Public, served from Storno's local mirror of ANAF's nomenclators, no account needed.",
    inputSchema: z.object({}),
    handler: async (): Promise<string> => formatResponse(await apiRequest('/api/v1/public/anaf/nomenclator/judete', { noAuth: true })),
  },
  {
    name: 'anaf_nomenclator_localitati',
    description: "ANAF locality nomenclator for a county: cod_localit (as required by declaration XSDs, e.g. C168 cod_localit_L), SIRUTA and town-hall codes. Optional q filters by name, diacritics-insensitive (\"sector 6\", \"cluj\"). Public, local mirror.",
    inputSchema: z.object({ judet: z.string().describe('County code, e.g. 40 for Bucuresti'), q: z.string().optional().describe('Name filter') }),
    handler: async (params: Record<string, unknown>): Promise<string> => formatResponse(await apiRequest(`/api/v1/public/anaf/nomenclator/localitati/${encodeURIComponent(String(params.judet))}`, { query: { q: params.q as string | undefined }, noAuth: true })),
  },
  {
    name: 'anaf_nomenclator_strazi',
    description: "ANAF street nomenclator for a locality: cod_strada + name (e.g. C168 cod_strada_C). q filters by word prefix, diacritics-insensitive (\"maniu\" finds \"Bld. Iuliu Maniu\"). Streets are cached locally on first use per locality. Public.",
    inputSchema: z.object({ judet: z.string().describe('County code, e.g. 40'), localitate: z.string().describe('Locality code from anaf_nomenclator_localitati, e.g. 6 for Sector 6'), q: z.string().optional().describe('Street name filter'), limit: z.number().int().min(1).max(200).optional() }),
    handler: async (params: Record<string, unknown>): Promise<string> => formatResponse(await apiRequest(`/api/v1/public/anaf/nomenclator/strazi/${encodeURIComponent(String(params.judet))}/${encodeURIComponent(String(params.localitate))}`, { query: { q: params.q as string | undefined, limit: params.limit as number | undefined }, noAuth: true })),
  },
  {
    name: 'document_types',
    description: 'Standard Romanian legal documents Storno can generate from structured fields (public, nothing stored): conventie_incetare_inchiriere (rental termination agreement between locator and locatar) and declaratie_incetare_contract (the locator\'s sworn statement that a rental contract ended, used as the mandatory C168 attachment). Returns each type with its required fields.',
    inputSchema: z.object({}),
    handler: async (): Promise<string> => formatResponse(await apiRequest('/api/v1/public/documents', { noAuth: true })),
  },
  {
    name: 'document_generate',
    description:
      "Generate a standard legal document as PDF (and HTML) from fields: 'conventie_incetare_inchiriere' (fields: data_conventie?, locator{nume, adresa, ci_serie?, ci_numar?, cnp?}, locatar{same}, contract{numar, data, adresa_imobil, numar_inregistrare_anaf?, data_inregistrare_anaf?}, data_incetare, termen_utilitati_zile?, garantie{suma?, valuta?, termen_zile?}) or 'declaratie_incetare_contract' (locator{nume, adresa, cnp?}, locatar{nume, cnp?}, contract{numar, data, adresa_imobil, data_inceput, data_sfarsit, chirie?, valuta?, numar_inregistrare_anaf?, data_inregistrare_anaf?}, data_incetare, motiv?, motiv_detalii?, organ_fiscal?, data_declaratie?). Dates as dd.mm.yyyy. Pass outFile to save the PDF locally (then sign it with agent_sign_pdf or have it signed by hand); otherwise the PDF comes back base64. Public, nothing stored.",
    inputSchema: z.object({
      type: z.enum(['conventie_incetare_inchiriere', 'declaratie_incetare_contract']),
      fields: z.record(z.unknown()).describe('Document fields (see description)'),
      outFile: z.string().optional().describe('Path where the PDF is written; when omitted the response carries pdfBase64'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const res = await apiRequest(`/api/v1/public/documents/${params.type as string}`, { method: 'POST', body: params.fields as Record<string, unknown>, noAuth: true });
      if (!res.ok || !params.outFile) return formatResponse(res);
      const data = res.data as { title: string; pdfBase64: string; html: string };
      const out = resolve(params.outFile as string);
      writeFileSync(out, Buffer.from(data.pdfBase64, 'base64'));
      return formatResponse({ ok: true, status: 200, data: { title: data.title, file: out, bytes: Buffer.byteLength(data.pdfBase64, 'base64') } });
    },
  },
  {
    name: 'anaf_declaration_status',
    description: "Processing status of a declaration filed on the ANAF e-guvernare portal (after agent_submit_declaration_pdf or any upload that returned an index): ANAF's public StareD112 by upload index and the taxpayer's CUI/CNP. States: ok (accepted), nok (validation errors, see recipisa), processing, unknown (not indexed yet). Returns the recipisa PDF URL when available. Public, no account.",
    inputSchema: z.object({ index: z.string().describe('Upload index returned by the portal'), cui: z.string().describe('CUI or CNP the declaration was filed for') }),
    handler: async (params: Record<string, unknown>): Promise<string> => formatResponse(await apiRequest(`/api/v1/public/declarations/status/${encodeURIComponent(String(params.index))}/${encodeURIComponent(String(params.cui))}`, { noAuth: true })),
  },
  {
    name: 'declaration_validate_xml',
    description:
      "Validate an ANAF tax declaration XML (D212 Declaratia unica, C168 rent contract registration, D177, D700, D100, D112, D300, D390, D394 …) with ANAF's own DUKIntegrator validators, the same jars the ANAF portal uses. Public endpoint: no account needed, nothing is stored, 60 requests/hour per IP. Returns ANAF's errors and warnings verbatim. When the root namespace is missing or belongs to another reporting period, Storno applies the namespace ANAF asks for and returns the corrected XML (namespaceCorrected=true): upload that one. Use it before filing in SPV, or in a build → validate → fix loop when assembling a declaration from a taxpayer's documents.",
    inputSchema: z.object({
      xml: z.string().describe('The declaration XML document (max 4 MB)'),
      type: z.string().optional().describe('Form code, e.g. D212, C168, D300. Inferred from the root element when omitted.'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const result = await apiRequest('/api/v1/public/declarations/validate', {
        method: 'POST',
        body: params,
        noAuth: true,
      });
      return formatResponse(result);
    },
  },
  {
    name: 'storno_xml_generate',
    description:
      'Generate an e-Factura (UBL 2.1, CIUS-RO) XML for a storno / credit invoice without an account. Public endpoint: nothing is stored, no authentication needed, rate limited per IP. Returns the XML, the XSD + Schematron validation report, and totals. The result is an Invoice (type 380) with negated quantities and a BillingReference to the original document, exactly what Storno issues for stornos. RON only. Use it to correct an invoice already accepted in SPV, or to test XML output before integrating.',
    inputSchema: z.object({
      seller: partySchema.extend({
        cif: z.string().describe('Seller CUI/CIF, with or without RO prefix'),
        vatPayer: z.boolean().optional().describe('Default true. When false all lines must have vatRate 0.'),
        email: z.string().optional(),
        phone: z.string().optional(),
        bankAccount: z.string().optional().describe('IBAN'),
        bankName: z.string().optional(),
      }),
      buyer: partySchema.extend({
        type: z.enum(['company', 'individual']).optional().describe('Default company'),
        cui: z.string().optional().describe('Required when type is company'),
        cnp: z.string().optional().describe('Required when type is individual (13 digits)'),
        vatPayer: z.boolean().optional(),
      }),
      original: z.object({
        number: z.string().describe('Number of the invoice being cancelled'),
        issueDate: z.string().describe('YYYY-MM-DD'),
      }),
      storno: z
        .object({
          number: z.string().optional().describe('Number of the storno invoice. Default STORNO-<date>.'),
          issueDate: z.string().optional().describe('YYYY-MM-DD, default today'),
          notes: z.string().optional().describe('Max 300 chars. Default "Storno factura #<number> din <date>".'),
        })
        .optional(),
      currency: z.literal('RON').optional(),
      lines: z.array(lineSchema).min(1).max(50),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const result = await apiRequest('/api/v1/public/storno-generator', {
        method: 'POST',
        body: params,
        noAuth: true,
      });
      return formatResponse(result);
    },
  },
];
