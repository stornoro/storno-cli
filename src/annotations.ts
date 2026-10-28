/**
 * MCP tool annotations (title, readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
 * for every Storno tool, so a client can tell a read from a write and a write from a
 * delete before it runs anything. Directory reviews (Claude, ChatGPT) expect every hint to
 * be an explicit boolean, never left out.
 *
 * The hints are derived from the tool name — Storno names are regular: `<resource>_<action>`
 * — with an explicit table for the tools whose behaviour the name does not tell. A tool may
 * also carry its own `annotations`, which win over everything here.
 *
 * Semantics (MCP spec):
 *  - readOnlyHint    the tool does not modify its environment (reading, rendering, validating);
 *  - destructiveHint the tool may perform destructive updates (deleting, cancelling, revoking,
 *                    reverting); meaningful only when readOnlyHint is false;
 *  - idempotentHint  calling it again with the same arguments has no additional effect;
 *  - openWorldHint   the tool interacts with the world outside Storno (ANAF, VIES, BNR, the
 *                    user's mail server, Stripe, the local Storno Agent, a webhook endpoint …).
 */

export interface ToolAnnotations {
  title: string;
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

type Hints = Omit<ToolAnnotations, 'title'>;

const READ: Hints = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const READ_EXTERNAL: Hints = { ...READ, openWorldHint: true };
const WRITE: Hints = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false };
const WRITE_IDEMPOTENT: Hints = { ...WRITE, idempotentHint: true };
const WRITE_EXTERNAL: Hints = { ...WRITE, openWorldHint: true };
const DESTRUCTIVE: Hints = { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false };
const DESTRUCTIVE_EXTERNAL: Hints = { ...DESTRUCTIVE, openWorldHint: true };

/** Tools whose behaviour the name alone does not describe. */
const EXPLICIT: Record<string, Hints> = {
  // Auth / session
  auth_login: WRITE,                      // issues tokens
  auth_refresh: WRITE,
  auth_register: WRITE,
  auth_forgot_password: WRITE_EXTERNAL,   // sends an email
  auth_reset_password: WRITE_IDEMPOTENT,
  auth_me: READ,
  companies_select: WRITE_IDEMPOTENT,     // session-local, but it changes what later calls act on

  // Validation / rendering that stores nothing
  invoices_validate: READ,
  invoices_verify_signature: READ,
  declaration_validate_xml: READ,
  declaration_build: READ,                // public, nothing stored (runs ANAF's validator locally)
  declaration_pdf: READ,
  declaration_form_spec: READ,
  storno_xml_generate: READ,
  document_generate: READ,                // public, nothing stored
  dosare_document: READ,                  // renders from the dosar, stores nothing
  delivery_notes_validate_etransport: READ,
  licensing_validate: READ,
  pdf_template_config_preview: READ,
  exchange_rates_convert: READ_EXTERNAL,  // BNR
  exchange_rates_list: READ_EXTERNAL,
  dosare_c168_prefill: READ,
  dosare_d212_prefill: READ,
  import_preview: READ,
  import_mapping: READ,
  import_template: READ,
  document_series_numbering_decision: READ,
  members_permissions_reference: READ,
  related_get: READ,

  // State transitions that are writes, not deletes
  declarations_validate: WRITE_IDEMPOTENT, // moves the declaration to "validated"
  declarations_prepare: WRITE,
  declarations_recalculate: WRITE_IDEMPOTENT,
  companies_set_active: WRITE_IDEMPOTENT,
  companies_toggle_sync: WRITE,
  recurring_invoices_toggle: WRITE,
  recurring_invoices_bulk_toggle_active: WRITE,
  document_series_set_default: WRITE_IDEMPOTENT,
  notifications_mark_read: WRITE_IDEMPOTENT,
  notifications_read_all: WRITE_IDEMPOTENT,
  spv_documents_mark_read: WRITE_IDEMPOTENT,
  calendar_feed_enable: WRITE_IDEMPOTENT,
  calendar_feed_disable: WRITE_IDEMPOTENT,
  proforma_invoices_accept: WRITE_IDEMPOTENT,
  proforma_invoices_reject: WRITE_IDEMPOTENT,
  proforma_invoices_convert: WRITE,
  receipts_convert_to_invoice: WRITE,
  delivery_notes_convert: WRITE,
  delivery_notes_bulk_convert: WRITE,
  delivery_notes_from_proforma: WRITE,
  receipts_refund: WRITE,                 // creates a refund document
  invoices_restore: WRITE_IDEMPOTENT,
  receipts_restore: WRITE_IDEMPOTENT,
  delivery_notes_restore: WRITE_IDEMPOTENT,
  balance_reprocess: WRITE_IDEMPOTENT,
  borderou_transactions_rematch: WRITE_IDEMPOTENT,
  borderou_transactions_save: WRITE,
  expiries_renew: WRITE,
  dosare_attach: WRITE_IDEMPOTENT,
  dosare_annual_return: WRITE_IDEMPOTENT, // ensures the yearly dosar exists
  dosare_registry_import: WRITE,
  clients_from_registry: WRITE,
  clients_sync_invoices: WRITE_IDEMPOTENT,
  invoices_sync_client: WRITE_IDEMPOTENT,
  invoices_bulk_mark_paid: WRITE_IDEMPOTENT,
  invoices_share_links_create: WRITE,
  licensing_create_key: WRITE,
  oauth2_clients_rotate_secret: WRITE,
  webhooks_regenerate_secret: WRITE,
  admin_version_override_update: WRITE_IDEMPOTENT,
  accounting_export_zip: WRITE,           // produces an export file
  invoices_export_zip: WRITE,
  invoices_export_efactura_zip: WRITE,
  exports_download: READ,
  backup_create: WRITE,
  backup_download: READ,
  import_upload: WRITE,
  import_execute: WRITE,
  borderou_upload: WRITE,
  dosare_files_upload: WRITE,
  declarations_upload: WRITE,
  spv_document_upload: WRITE,             // stores the PDF the agent fetched
  companies_upload_logo: WRITE_IDEMPOTENT,
  telemetry_send: WRITE_EXTERNAL,

  // Destructive beyond "delete"
  backup_restore: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false }, // overwrites data
  import_revert: DESTRUCTIVE,             // removes what an import created
  anaf_delete_token: DESTRUCTIVE,
  companies_delete_logo: DESTRUCTIVE,
  invoices_share_links_revoke: DESTRUCTIVE,
  oauth2_clients_revoke: DESTRUCTIVE,
  licensing_revoke_key: DESTRUCTIVE,
  invoices_cancel: DESTRUCTIVE,
  invoices_bulk_cancel: DESTRUCTIVE,
  receipts_cancel: DESTRUCTIVE,
  delivery_notes_cancel: DESTRUCTIVE,
  proforma_invoices_cancel: DESTRUCTIVE,
  // storno = a reversal document, the original stays: a write, not a delete
  invoices_bulk_storno: WRITE,
  delivery_notes_storno: WRITE,

  // Reaching outside Storno: ANAF, VIES, BNR, mail, the local agent, Stripe, webhooks
  anaf_create_token_link: WRITE_EXTERNAL,
  anaf_sync_trigger: WRITE_EXTERNAL,
  anaf_validate_cif: READ_EXTERNAL,
  anaf_declaration_status: READ_EXTERNAL,
  clients_anaf_lookup: READ_EXTERNAL,
  clients_vies_lookup: READ_EXTERNAL,
  partner_verify: WRITE_EXTERNAL,         // stores the verdict on the partner
  partners_verify_all: WRITE_EXTERNAL,
  invoices_submit: WRITE_EXTERNAL,
  einvoice_submit: WRITE_EXTERNAL,
  delivery_notes_submit_etransport: WRITE_EXTERNAL,
  declarations_submit: WRITE_EXTERNAL,
  declarations_file_via_agent: WRITE_EXTERNAL,
  declarations_sync: WRITE_EXTERNAL,
  declarations_refresh_statuses: WRITE_EXTERNAL,
  declarations_agent_result: WRITE,
  spv_request_prepare: WRITE,
  spv_request_agent_result: WRITE,
  spv_sync_prepare: WRITE,
  spv_sync_agent_result: WRITE,
  agent_status: READ_EXTERNAL,            // the local Storno Agent
  agent_certificates: READ_EXTERNAL,
  agent_sign_pdf: WRITE_EXTERNAL,
  agent_submit_declaration_pdf: WRITE_EXTERNAL,
  einvoice_config_test: WRITE_EXTERNAL,   // contacts the provider
  mailer_config_test: WRITE_EXTERNAL,     // sends a test email
  storage_config_test: WRITE_EXTERNAL,
  webhooks_test: WRITE_EXTERNAL,          // calls the endpoint
  white_label_config_verify_domain: WRITE_EXTERNAL, // DNS check, stores the verdict
  invitations_create: WRITE_EXTERNAL,     // sends an email
  invitations_resend: WRITE_EXTERNAL,
  invoices_email: WRITE_EXTERNAL,
  receipts_email: WRITE_EXTERNAL,
  delivery_notes_email: WRITE_EXTERNAL,
  proforma_invoices_send: WRITE_EXTERNAL,
  client_statement_email: WRITE_EXTERNAL,
  recurring_invoices_issue_now: WRITE,
  recurring_invoices_bulk_issue_now: WRITE,
  invoices_issue: WRITE_IDEMPOTENT,
  payments_receipt_issue: WRITE_IDEMPOTENT, // a payment keeps the receipt it already has
  payments_receipt_pdf: READ,
  receipts_issue: WRITE_IDEMPOTENT,
  delivery_notes_issue: WRITE_IDEMPOTENT,
  dosare_c168_create: WRITE,
  dosare_d212_create: WRITE,
};

const READ_SUFFIXES = [
  'list', 'get', 'search', 'stats', 'status', 'history', 'preview', 'types', 'providers', 'scopes', 'defaults',
  'events', 'deliveries', 'delivery_detail', 'activity', 'log', 'logs', 'rows', 'analysis', 'balance', 'ledger',
  'upcoming', 'calendar', 'templates', 'spec', 'versions', 'forms', 'codes', 'lookup', 'cities', 'available_invoices',
  'actions', 'billing', 'proposals', 'attachments', 'message', 'xml', 'pdf', 'csv', 'zip', 'download', 'unread_count',
  'health', 'version', 'statement', 'statements', 'transactions', 'tokens', 'certificates', 'submissions', 'messages',
  'organizations', 'users', 'audit_logs', 'email_log', 'invoicing_activity', 'feed', 'keys', 'overrides', 'me',
  'judete', 'localitati', 'strazi', 'sync_log', 'sync_status', 'email_history', 'email_defaults', 'restore_status',
  'invoice', 'reference', 'vat', 'vat_oss', 'sales_analysis', 'result', 'mapping', 'template', 'sources',
];
const DESTRUCTIVE_SUFFIXES = ['delete', 'bulk_delete', 'cancel', 'bulk_cancel', 'revoke', 'revert'];
const IDEMPOTENT_WRITE_SUFFIXES = ['update', 'save', 'set_default', 'set_active', 'mark_read', 'read_all', 'restore', 'renew'];

function endsWithAny(name: string, suffixes: string[]): boolean {
  return suffixes.some((s) => name === s || name.endsWith('_' + s));
}

/** Derive the hints from the name; explicit entries win. */
export function hintsFor(name: string): Hints {
  if (EXPLICIT[name]) return EXPLICIT[name];
  if (endsWithAny(name, DESTRUCTIVE_SUFFIXES)) return DESTRUCTIVE;
  if (endsWithAny(name, READ_SUFFIXES)) return name.startsWith('anaf_') ? READ_EXTERNAL : READ;
  if (endsWithAny(name, IDEMPOTENT_WRITE_SUFFIXES)) return WRITE_IDEMPOTENT;
  return WRITE; // create, upload, submit, convert, generate … — a write that may repeat its effect
}

/** "invoices_bulk_delete" → "Invoices: bulk delete" */
export function titleFor(name: string): string {
  const parts = name.split('_');
  const resources = new Set([
    'invoices', 'clients', 'suppliers', 'products', 'receipts', 'payments', 'companies', 'dosare', 'declarations',
    'declaration', 'proforma_invoices', 'delivery_notes', 'recurring_invoices', 'webhooks', 'expiries', 'vehicles',
    'balance', 'borderou', 'spv', 'anaf', 'agent', 'admin', 'auth', 'backup', 'bank_accounts', 'cash_register',
    'calendar_feed', 'einvoice', 'efactura', 'email_templates', 'exchange_rates', 'exports', 'import', 'invitations',
    'licensing', 'mailer_config', 'members', 'notifications', 'notification_preferences', 'oauth2_clients',
    'pdf_template_config', 'product_categories', 'reports', 'storage_config', 'system', 'vat_rates', 'white_label_config',
    'document_series', 'accounting_export', 'api_keys', 'company_registry', 'cpv_codes', 'nc_codes', 'vat_category_codes',
    'client_statement', 'partner', 'partners', 'telemetry', 'integration', 'related', 'storno_xml', 'document', 'dashboard',
    'defaults', 'fiscal', 'spv_documents', 'spv_request', 'spv_requests', 'spv_sync', 'spv_document', 'efactura_messages',
    'einvoice_config', 'invoices_share_links', 'dosare_files', 'dosare_registry', 'declarations_agent', 'borderou_transaction',
    'borderou_transactions', 'cash_register_movements', 'admin_version_override', 'admin_version', 'exchange_rates',
  ]);
  // longest matching resource prefix
  let resource = '';
  for (let i = parts.length - 1; i >= 1; i--) {
    const candidate = parts.slice(0, i).join('_');
    if (resources.has(candidate)) {
      resource = candidate;
      break;
    }
  }
  if (!resource) resource = parts[0];
  const action = name.slice(resource.length + 1) || name;
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${cap(resource.replace(/_/g, ' '))}: ${action.replace(/_/g, ' ')}`;
}

export function annotationsFor(name: string, own?: Partial<ToolAnnotations>): ToolAnnotations {
  return { title: titleFor(name), ...hintsFor(name), ...(own ?? {}) };
}
