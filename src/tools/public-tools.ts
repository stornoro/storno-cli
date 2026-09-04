import { z } from 'zod';
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
