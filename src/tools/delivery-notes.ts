import { z } from 'zod';
import { apiRequest } from '../client.js';
import type { ApiResponse, ApiError } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { preparePayload } from '../utils/document-payload.js';
import { getConfig } from '../config.js';

/**
 * Format a response from the delivery note create/update endpoints.
 * These endpoints return `{ deliveryNote: {...}, validation: {...} }`.
 * The function unwraps the delivery note and appends any validation
 * warnings or errors as a separate section so the caller is aware of them.
 */
function formatDeliveryNoteResponse(res: ApiResponse | ApiError): string {
  if (!res.ok) {
    return formatResponse(res);
  }

  const data = (res as ApiResponse).data as Record<string, unknown>;

  // Handle both the new wrapped format and any legacy bare-object responses.
  if (!data || typeof data.deliveryNote === 'undefined') {
    return formatResponse(res);
  }

  const deliveryNote = data.deliveryNote;
  const validation = data.validation as
    | { valid?: boolean; errors?: unknown[]; warnings?: unknown[] }
    | undefined;

  const parts: string[] = [JSON.stringify(deliveryNote, null, 2)];

  if (validation) {
    const hasErrors = Array.isArray(validation.errors) && validation.errors.length > 0;
    const hasWarnings = Array.isArray(validation.warnings) && validation.warnings.length > 0;

    if (hasErrors || hasWarnings) {
      parts.push('Validation:\n' + JSON.stringify(validation, null, 2));
    }
  }

  return parts.join('\n\n');
}

const deliveryLineItemSchema = z.object({
  uuid: z.string().optional().describe('UUID of existing line item (omit to create new)'),
  description: z.string().describe('Item description'),
  quantity: z.number().describe('Quantity delivered (must be > 0)'),
  unitPrice: z.number().describe('Price per unit'),
  vatRateId: z.string().describe('UUID of the VAT rate'),
  unitOfMeasure: z.string().optional().describe('Unit of measure (e.g., piece, kg, hour)'),
  productId: z.string().optional().describe('UUID of related product'),
  // e-Transport line fields (required for schematron validation)
  tariffCode: z.string().optional().describe('8-digit HS/CN tariff code (e.g., "84131100"). Required for e-Transport (BR-206)'),
  purposeCode: z.number().optional().describe('Purpose code per schematron BR-070. For TTN (opType 30): 101 (commercial), 704, 705, 9901 (other)'),
  unitOfMeasureCode: z.string().optional().describe('UN/ECE Rec 20 unit of measure code (e.g., "H87"=piece, "KGM"=kg, "SET"=set, "MTR"=meter). Required for e-Transport'),
  netWeight: z.string().optional().describe('Net weight in kg as decimal string (e.g., "120.00"). Required for e-Transport (BR-207)'),
  grossWeight: z.string().optional().describe('Gross weight in kg as decimal string (e.g., "140.00")'),
  valueWithoutVat: z.string().optional().describe('Line value without VAT as decimal string (e.g., "15000.00"). Required for e-Transport (BR-208)'),
});

export const tools = [
  {
    name: 'delivery_notes_list',
    description:
      'List delivery notes for the selected company with optional filtering by status, date range, client, and search term. Delivery notes document physical delivery of goods or completion of services.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Items per page (default: 20, max: 100)'),
      search: z.string().optional().describe('Search term for delivery note number or client name'),
      status: z
        .enum(['draft', 'issued', 'converted', 'cancelled'])
        .optional()
        .describe('Filter by status'),
      from: z.string().optional().describe('Start date filter (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date filter (YYYY-MM-DD)'),
      clientId: z.string().optional().describe('Filter by client UUID'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/delivery-notes', {
        companyId,
        query: {
          page: params.page as number | undefined,
          limit: params.limit as number | undefined,
          search: params.search as string | undefined,
          status: params.status as string | undefined,
          from: params.from as string | undefined,
          to: params.to as string | undefined,
          clientId: params.clientId as string | undefined,
        },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_get',
    description:
      'Get complete details for a specific delivery note including all line items, client information, deputy details, and calculated totals.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the delivery note to retrieve'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}`, { companyId });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_create',
    description:
      'Create a new delivery note in draft status. Delivery notes document physical delivery of goods or services and can later be converted to invoices. Include deputy information for proof of delivery. A default delivery_note series is auto-assigned if neither seriesId nor documentSeriesId is provided.',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      clientId: z.string().describe('UUID of the client'),
      seriesId: z.string().optional().describe('UUID of the delivery note series (uses default series if not provided)'),
      documentSeriesId: z.string().optional().describe('UUID of the document series to use (alternative to seriesId; uses default delivery_note series if neither is provided)'),
      issueDate: z.string().describe('Date of issue (YYYY-MM-DD)'),
      dueDate: z.string().describe('Due date for invoicing (YYYY-MM-DD)'),
      currency: z.string().describe('Currency code (e.g., RON, EUR, USD)'),
      exchangeRate: z.number().optional().describe('Exchange rate to base currency (default: 1.0 for RON)'),
      deliveryLocation: z.string().optional().describe('Full address where goods were delivered'),
      projectReference: z.string().optional().describe('Related project or order reference'),
      issuerName: z.string().optional().describe('Name of person issuing the delivery note'),
      issuerId: z.string().optional().describe('UUID of the issuer user'),
      salesAgent: z.string().optional().describe('Sales agent name'),
      deputyName: z.string().optional().describe('Name of person who received the delivery'),
      deputyIdentityCard: z.string().optional().describe('ID card number of the deputy'),
      deputyAuto: z.string().optional().describe('Vehicle registration number used for delivery'),
      notes: z.string().optional().describe('Public notes about the delivery'),
      mentions: z.string().optional().describe('Additional mentions or instructions'),
      internalNote: z.string().optional().describe('Internal note (not visible to client)'),
      // e-Transport header fields (required for ANAF e-Transport submission)
      etransportOperationType: z.number().optional().describe('Operation type code: 10 (intra-community acquisition), 12 (intra-community delivery), 20 (transaction in national territory between two different entities with goods moving domestically), 30 (domestic transport document TTN), 40 (import), 50 (export), 60 (goods not released for circulation)'),
      etransportPostIncident: z.boolean().optional().describe('Post-incident declaration (after the transport was completed)'),
      etransportVehicleNumber: z.string().optional().describe('Vehicle registration number (e.g., "BC01ABC"). Schematron BR-031: 3-20 uppercase alphanumeric chars'),
      etransportTrailer1: z.string().optional().describe('First trailer registration number'),
      etransportTrailer2: z.string().optional().describe('Second trailer registration number'),
      etransportTransporterCountry: z.string().optional().describe('Transporter country code (ISO 3166-1 alpha-2, e.g., "RO"). For TTN (opType 30) must be "RO" per BR-005'),
      etransportTransporterCode: z.string().optional().describe('Transporter CUI/CIF (numeric only, e.g., "31385365"). Must match ANAF format per BR-002'),
      etransportTransporterName: z.string().optional().describe('Transporter legal name (e.g., "UNIVERSAL EQUIPMENT PROJECTS SRL")'),
      etransportTransportDate: z.string().optional().describe('Transport start date (YYYY-MM-DD)'),
      // Route start (loading point)
      etransportStartCounty: z.number().optional().describe('Start county code (1-52 per ANAF nomenclature, e.g., 4=Bacau, 40=Bucuresti). Required for e-Transport (BR-210)'),
      etransportStartLocality: z.string().optional().describe('Start locality name (2-100 chars per BR-214)'),
      etransportStartStreet: z.string().optional().describe('Start street name (2-100 chars per BR-215)'),
      etransportStartNumber: z.string().optional().describe('Start street number'),
      etransportStartOtherInfo: z.string().optional().describe('Start additional address info'),
      etransportStartPostalCode: z.string().optional().describe('Start postal code'),
      // Route end (delivery point)
      etransportEndCounty: z.number().optional().describe('End county code (1-52). Required for e-Transport (BR-211)'),
      etransportEndLocality: z.string().optional().describe('End locality name (2-100 chars)'),
      etransportEndStreet: z.string().optional().describe('End street name (2-100 chars)'),
      etransportEndNumber: z.string().optional().describe('End street number'),
      etransportEndOtherInfo: z.string().optional().describe('End additional address info'),
      etransportEndPostalCode: z.string().optional().describe('End postal code'),
      lines: z.array(deliveryLineItemSchema).describe('Array of line items (minimum 1 required)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { companyId: _cid, ...body } = params;
      const res = await apiRequest('/api/v1/delivery-notes', {
        method: 'POST',
        companyId,
        body: await preparePayload(body as Record<string, unknown>, companyId),
      });
      return formatDeliveryNoteResponse(res);
    },
  },

  {
    name: 'delivery_notes_update',
    description:
      'Update an existing delivery note. Delivery notes in draft or issued status can be updated. Replaces all line items with the provided array.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the delivery note to update'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      clientId: z.string().describe('UUID of the client'),
      seriesId: z.string().optional().describe('UUID of the delivery note series'),
      documentSeriesId: z.string().optional().describe('UUID of the document series to use (alternative to seriesId)'),
      issueDate: z.string().describe('Date of issue (YYYY-MM-DD)'),
      dueDate: z.string().describe('Due date for invoicing (YYYY-MM-DD)'),
      currency: z.string().describe('Currency code (e.g., RON, EUR, USD)'),
      exchangeRate: z.number().optional().describe('Exchange rate to base currency'),
      deliveryLocation: z.string().optional().describe('Full address where goods were delivered'),
      projectReference: z.string().optional().describe('Related project or order reference'),
      issuerName: z.string().optional().describe('Name of person issuing the delivery note'),
      issuerId: z.string().optional().describe('UUID of the issuer user'),
      salesAgent: z.string().optional().describe('Sales agent name'),
      deputyName: z.string().optional().describe('Name of person who received the delivery'),
      deputyIdentityCard: z.string().optional().describe('ID card number of the deputy'),
      deputyAuto: z.string().optional().describe('Vehicle registration number'),
      notes: z.string().optional().describe('Public notes about the delivery'),
      mentions: z.string().optional().describe('Additional mentions or instructions'),
      internalNote: z.string().optional().describe('Internal note (not visible to client)'),
      // e-Transport header fields
      etransportOperationType: z.number().optional().describe('Operation type code: 10, 12, 20, 30 (TTN), 40, 50, 60'),
      etransportPostIncident: z.boolean().optional().describe('Post-incident declaration'),
      etransportVehicleNumber: z.string().optional().describe('Vehicle registration number (3-20 uppercase alphanumeric)'),
      etransportTrailer1: z.string().optional().describe('First trailer registration number'),
      etransportTrailer2: z.string().optional().describe('Second trailer registration number'),
      etransportTransporterCountry: z.string().optional().describe('Transporter country code (e.g., "RO")'),
      etransportTransporterCode: z.string().optional().describe('Transporter CUI/CIF (numeric only)'),
      etransportTransporterName: z.string().optional().describe('Transporter legal name'),
      etransportTransportDate: z.string().optional().describe('Transport start date (YYYY-MM-DD)'),
      etransportStartCounty: z.number().optional().describe('Start county code (1-52)'),
      etransportStartLocality: z.string().optional().describe('Start locality name'),
      etransportStartStreet: z.string().optional().describe('Start street name'),
      etransportStartNumber: z.string().optional().describe('Start street number'),
      etransportStartOtherInfo: z.string().optional().describe('Start additional address info'),
      etransportStartPostalCode: z.string().optional().describe('Start postal code'),
      etransportEndCounty: z.number().optional().describe('End county code (1-52)'),
      etransportEndLocality: z.string().optional().describe('End locality name'),
      etransportEndStreet: z.string().optional().describe('End street name'),
      etransportEndNumber: z.string().optional().describe('End street number'),
      etransportEndOtherInfo: z.string().optional().describe('End additional address info'),
      etransportEndPostalCode: z.string().optional().describe('End postal code'),
      lines: z.array(deliveryLineItemSchema).describe('Array of line items (replaces all existing lines)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const { uuid, companyId: _cid, ...body } = params;
      const res = await apiRequest(`/api/v1/delivery-notes/${uuid}`, {
        method: 'PUT',
        companyId,
        body: await preparePayload(body as Record<string, unknown>, companyId),
      });
      return formatDeliveryNoteResponse(res);
    },
  },

  {
    name: 'delivery_notes_delete',
    description:
      'Permanently delete a delivery note. Only draft delivery notes can be deleted. Use cancel for issued delivery notes to preserve audit trail.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the delivery note to delete'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}`, {
        method: 'DELETE',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_issue',
    description:
      'Mark a delivery note as issued when the physical delivery of goods or completion of services occurs. Transitions status from draft to issued. Once issued, the delivery note becomes read-only.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the delivery note to mark as issued'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}/issue`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_cancel',
    description:
      'Cancel a delivery note when delivery will not occur. Can be cancelled from draft or issued status. Preserves historical record unlike deletion. Optionally provide a cancellation reason.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the delivery note to cancel'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      cancellationReason: z.string().optional().describe('Reason for cancellation'),
      cancellationNotes: z.string().optional().describe('Internal notes about the cancellation'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const body: Record<string, unknown> = {};
      if (params.cancellationReason) body.cancellationReason = params.cancellationReason;
      if (params.cancellationNotes) body.cancellationNotes = params.cancellationNotes;

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}/cancel`, {
        method: 'POST',
        companyId,
        body: Object.keys(body).length > 0 ? body : undefined,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_pdf',
    description:
      'Download the PDF for a delivery note. Returns base64-encoded PDF binary data. The delivery note must be in issued or converted status. Optionally hide VAT or prices for simplified delivery documents.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the delivery note'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      hideVat: z.boolean().optional().describe('Hide VAT amounts from the PDF (default: false)'),
      hidePrices: z.boolean().optional().describe('Hide all prices from the PDF (default: false)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}/pdf`, {
        companyId,
        binary: true,
        query: {
          hideVat: params.hideVat as boolean | undefined,
          hidePrices: params.hidePrices as boolean | undefined,
        },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_convert',
    description:
      'Convert a delivery note into a final invoice. Creates a new invoice with all delivery note data, marks the delivery note as converted, and establishes a link between the two documents. Returns both the new invoice and updated delivery note.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the delivery note to convert to an invoice'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      invoiceSeriesId: z
        .string()
        .optional()
        .describe('UUID of the invoice series to use (if different from delivery note series)'),
      issueDate: z
        .string()
        .optional()
        .describe('Override issue date for the new invoice (default: today, YYYY-MM-DD)'),
      dueDate: z
        .string()
        .optional()
        .describe('Override due date for the new invoice (default: delivery note due date, YYYY-MM-DD)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const body: Record<string, unknown> = {};
      if (params.invoiceSeriesId) body.invoiceSeriesId = params.invoiceSeriesId;
      if (params.issueDate) body.issueDate = params.issueDate;
      if (params.dueDate) body.dueDate = params.dueDate;

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}/convert`, {
        method: 'POST',
        companyId,
        body: Object.keys(body).length > 0 ? body : undefined,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_restore',
    description:
      'Restore a cancelled delivery note back to draft status. Only cancelled delivery notes can be restored. This reverses the cancellation and allows the delivery note to be re-issued.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the cancelled delivery note to restore'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}/restore`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_email',
    description:
      'Send a delivery note to a client via email with the PDF attached. Supports custom subject, body, CC, and BCC recipients.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the delivery note to send'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
      to: z.string().describe('Recipient email address'),
      subject: z.string().optional().describe('Email subject (auto-generated if omitted)'),
      body: z.string().optional().describe('Email body text (auto-generated if omitted)'),
      cc: z.array(z.string()).optional().describe('CC email addresses'),
      bcc: z.array(z.string()).optional().describe('BCC email addresses'),
      templateId: z.string().optional().describe('UUID of email template to use (category: delivery_note)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const body: Record<string, unknown> = { to: params.to };
      if (params.subject) body.subject = params.subject;
      if (params.body) body.body = params.body;
      if (params.cc) body.cc = params.cc;
      if (params.bcc) body.bcc = params.bcc;
      if (params.templateId) body.templateId = params.templateId;

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}/email`, {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_email_defaults',
    description:
      'Get pre-filled email content for a delivery note including default recipient, subject, and body text with template variables already substituted.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the delivery note'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}/email-defaults`, {
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_email_history',
    description:
      'Get the email sending history for a delivery note, including all sent emails with their status, timestamps, and recipient information.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the delivery note'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}/emails`, {
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_storno',
    description:
      'Create a storno (return) delivery note with negated quantities from an existing issued delivery note. The storno delivery note is created as a draft and can be issued separately.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the issued delivery note to create storno for'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}/storno`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_from_proforma',
    description:
      'Create a new delivery note from an existing proforma invoice. Copies client, lines, dates, currency, and notes from the proforma. The delivery note is created in draft status.',
    inputSchema: z.object({
      proformaId: z.string().describe('UUID of the proforma invoice to create delivery note from'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/delivery-notes/from-proforma', {
        method: 'POST',
        companyId,
        body: { proformaId: params.proformaId },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_bulk_convert',
    description:
      'Convert multiple issued delivery notes into a single invoice. All delivery notes must be issued, have the same client, and use the same currency. Creates one invoice combining all lines and marks all delivery notes as invoiced.',
    inputSchema: z.object({
      ids: z.array(z.string()).describe('Array of delivery note UUIDs to convert into a single invoice'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/delivery-notes/bulk-convert', {
        method: 'POST',
        companyId,
        body: { ids: params.ids },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_validate_etransport',
    description:
      'Validate a delivery note against Romania\'s e-Transport schema before submitting. Checks entity validation, XSD schema, and Schematron rules. Returns validation result with errors and warnings. Use this before submit_etransport to catch issues early.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the delivery note to validate'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}/validate-etransport`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'delivery_notes_submit_etransport',
    description:
      'Submit an issued delivery note to Romania\'s ANAF e-Transport system for domestic transport declaration (TTN). The delivery note must be in issued status with e-Transport fields filled (vehicle number, route, transport data, line tariff codes and weights). Submission is asynchronous — the status will update from uploaded to ok (with UIT) or nok (with error).',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the issued delivery note to submit to e-Transport'),
      companyId: z.string().optional().describe('Company UUID (overrides configured default)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = (params.companyId as string) || config.companyId;
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/delivery-notes/${params.uuid}/submit-etransport`, {
        method: 'POST',
        companyId,
      });
      return formatResponse(res);
    },
  },
];
