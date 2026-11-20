import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | null {
  return (params.companyId as string) || getConfig().companyId;
}

export const tools = [
  {
    name: 'import_sources',
    description:
      'Get available import sources and import types. Returns supported import sources (SmartBill, Saga, Oblio, FGO, Facturis, eMag, and the sales sources Uber, Bolt, Glovo, Tazz, WooCommerce, PrestaShop, cash_register, plus efactura for e-Factura XML files) and import types (clients, suppliers, products, invoices_issued, invoices_received, recurring_invoices, platform_sales, receipts, payments).',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const result = await apiRequest('/api/v1/import/sources', { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'import_preview',
    description:
      'Get a preview of an uploaded import job including detected columns, sample data, and column mapping suggestions. Use after uploading a file to review before executing.',
    inputSchema: z.object({
      id: z.string().describe('Import job ID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id } = params as { id: string };
      const result = await apiRequest(`/api/v1/import/${id}/preview`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'import_mapping',
    description:
      'Save column mapping for an import job. Maps CSV columns to Storno fields. Call after reviewing the preview to confirm or adjust mappings before executing.',
    inputSchema: z.object({
      id: z.string().describe('Import job ID'),
      columnMapping: z
        .record(z.string())
        .describe('Object mapping CSV column names to Storno field names'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id, columnMapping } = params as {
        id: string;
        columnMapping: Record<string, string>;
      };
      const result = await apiRequest(`/api/v1/import/${id}/mapping`, {
        method: 'PATCH',
        companyId,
        body: { columnMapping },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'import_execute',
    description:
      'Execute an import job after mapping is confirmed. The import runs asynchronously via a message queue. Check status with import_get. For invoice imports, importOptions.dateFrom / dateTo / clientCifs import only the invoices of a period or of some partners; an invalid value returns 422.',
    inputSchema: z.object({
      id: z.string().describe('Import job ID'),
      importOptions: z
        .record(z.unknown())
        .optional()
        .describe('Optional import options: markAsPaid (invoice imports); dateFrom and dateTo (YYYY-MM-DD, issue date, inclusive) and clientCifs (array of tax codes, or one string separated by commas, spaces or newlines; the RO prefix and spacing are ignored; at most 2000) keep only part of an invoice file, the other rows count as skipped, and with a filter set a row without a readable date or tax code is skipped too; groupBy = week | day | order and platformName / platformCif / platformCountry (platform_sales); includeAll to import orders whose status is not paid / completed (WooCommerce, PrestaShop); cashRegisterName, vatGroups ({"1": "21", "2": "11", "3": "5", "4": "0"}) and paymentTypes ({"1": "cash", "3": "card"}) for receipts'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id, importOptions } = params as {
        id: string;
        importOptions?: Record<string, unknown>;
      };

      const body: Record<string, unknown> = {};
      if (importOptions) body.importOptions = importOptions;

      const result = await apiRequest(`/api/v1/import/${id}/execute`, {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'import_get',
    description:
      'Get full status and details of an import job including progress, row counts (imported, skipped, failed), and error details.',
    inputSchema: z.object({
      id: z.string().describe('Import job ID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id } = params as { id: string };
      const result = await apiRequest(`/api/v1/import/${id}`, { companyId });
      return formatResponse(result);
    },
  },

  {
    name: 'import_upload',
    description:
      'Upload a file (CSV, XLSX, XML, or ZIP) to start a new import job. Requires importType (clients, suppliers, products, invoices_issued, invoices_received, recurring_invoices, platform_sales, receipts, payments) and source (smartbill, saga, oblio, fgo, facturis_online, easybill, ciel, factureaza, facturare_pro, icefact, bolt, facturis, emag, uber, glovo, tazz, woocommerce, prestashop, cash_register, efactura, generic). Platform statements (uber, bolt, glovo, tazz) use importType platform_sales and become one sales invoice to the platform plus the commission purchase invoice per group; shop exports (woocommerce, prestashop) use invoices_issued; the A4200 XML or a ZIP of a month exported by a fiscal cash register uses source cash_register with importType receipts. The invoice report of another invoicing or accounting program (or any spreadsheet, source generic) uses importType invoices_issued or invoices_received: one row per invoice or one row per invoice line, the mapping is suggested from the usual column names, collection status is read from the file and missing clients are created; the invoice XML those programs export for the accountant (<Facturi><Factura>, .xml with source smartbill, saga, oblio, fgo or generic) is read as well. A supplier list exported by another program (or any spreadsheet, source generic) uses importType suppliers: suppliers already known by fiscal code are not duplicated, only completed with the fields they miss. The facturis sales journal also reads columns added to it by their usual names (due date, amount left to pay, paid amount, state, reversed invoice). The invoice target field stornoOf holds the number of the invoice a storno reverses: the storno is linked to it and gets status refund. e-Factura XML (UBL Invoice or CreditNote, one .xml file or a .zip of up to 5000 of them) uses source efactura with importType invoices_issued or invoices_received: the invoices are kept as history with status synced and are never sent to ANAF, a credit note becomes a negative invoice linked to the invoice it names, an invoice of another company is refused with a row error, and numbers already present are skipped. Collections of issued invoices use importType payments (every source that imports invoices, including facturis and generic): one row per payment with invoiceNumber and amount (required), series, paymentDate, paymentMethod, reference, notes. The invoice is found by number, several rows for one invoice are its partial payments, a payment larger than what is left to pay is a row error, and importing the same file again adds nothing. Returns the created import job with preview data.',
    inputSchema: z.object({
      filePath: z.string().describe('Absolute path to the file to upload (CSV, XLSX, XML, or a ZIP of A4200 or e-Factura XML files)'),
      importType: z
        .enum(['clients', 'suppliers', 'products', 'invoices_issued', 'invoices_received', 'recurring_invoices', 'platform_sales', 'receipts', 'payments'])
        .describe('Type of data being imported'),
      source: z
        .enum([
          'smartbill', 'saga', 'oblio', 'fgo', 'facturis_online', 'easybill',
          'ciel', 'factureaza', 'facturare_pro', 'icefact', 'bolt', 'facturis', 'emag',
          'uber', 'glovo', 'tazz', 'woocommerce', 'prestashop', 'cash_register', 'efactura', 'generic',
        ])
        .describe('Source application the file was exported from; efactura for e-Factura XML files'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { filePath, importType, source } = params as {
        filePath: string;
        importType: string;
        source: string;
      };

      const result = await apiRequest('/api/v1/import/upload', {
        method: 'POST',
        companyId,
        filePath,
        formFields: { importType, source },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'import_template',
    description:
      'Download a CSV template for a specific import type. Returns base64-encoded CSV with column headers and example rows that can be filled in and uploaded via import_upload. Pass source for a platform or shop template (uber, bolt, glovo, tazz, woocommerce, prestashop) to get the columns of that export instead of the generic ones.',
    inputSchema: z.object({
      importType: z
        .enum(['clients', 'suppliers', 'products', 'invoices_issued', 'invoices_received', 'recurring_invoices', 'platform_sales', 'receipts', 'payments'])
        .describe('Type of import to get template for'),
      source: z
        .enum(['uber', 'bolt', 'glovo', 'tazz', 'woocommerce', 'prestashop'])
        .optional()
        .describe('Platform / shop whose column layout the template should use'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { importType, source } = params as { importType: string; source?: string };
      const result = await apiRequest('/api/v1/import/template', {
        companyId,
        binary: true,
        query: { importType, source },
      });
      return formatResponse(result);
    },
  },

  {
    name: 'import_revert',
    description:
      'Revert a completed or cancelled import job: deletes every record it created (invoices and their lines, receipts, clients, payments) and marks the job as reverted. Reverting a payments import removes its payments and restores the placeholder payments it replaced. Use it to undo an import that mapped the wrong columns or grouped the statement the wrong way.',
    inputSchema: z.object({
      id: z.string().describe('Import job ID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { id } = params as { id: string };
      const result = await apiRequest(`/api/v1/import/${id}/revert`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'import_history',
    description:
      'List past import jobs for the active company. Returns job ID, type, source, status, row counts, and timestamps.',
    inputSchema: z.object({
      limit: z
        .number()
        .int()
        .optional()
        .describe('Number of results (max 200, default: 50)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID override (uses active company if not set)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const { limit } = params as { limit?: number };
      const result = await apiRequest('/api/v1/import/history', {
        companyId,
        query: { limit },
      });
      return formatResponse(result);
    },
  },
];
