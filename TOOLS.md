# Storno CLI - Complete Tool Reference

This document lists all MCP tools exposed by the Storno CLI server.
Each tool can be called by any MCP-compatible AI assistant (Claude Code, Cursor, Windsurf, etc.).

---

## Table of Contents

- [Authentication](#authentication)
- [Companies](#companies)
- [Invoices](#invoices)
- [Clients](#clients)
- [Products](#products)
- [Payments](#payments)
- [Invoice Defaults](#invoice-defaults)
- [VAT Rates](#vat-rates)
- [Bank Accounts](#bank-accounts)
- [Document Series](#document-series)
- [Proforma Invoices](#proforma-invoices)
- [Recurring Invoices](#recurring-invoices)
- [Delivery Notes](#delivery-notes)
- [Receipts](#receipts)
- [Suppliers](#suppliers)
- [Exchange Rates](#exchange-rates)
- [Email Templates](#email-templates)
- [E-Invoicing (Multi-Country)](#e-invoicing-multi-country)
- [ANAF Integration](#anaf-integration)
- [e-Factura Messages](#e-factura-messages)
- [Dashboard](#dashboard)
- [Members](#members)
- [Invitations](#invitations)
- [Notifications](#notifications)
- [Webhooks](#webhooks)
- [API Keys](#api-keys)
- [Reports](#reports)
- [Exports](#exports)
- [Admin](#admin)
- [Licensing](#licensing)
- [PDF Template Config](#pdf-template-config)
- [Company Registry](#company-registry)
- [System](#system)
- [Accounting Export](#accounting-export)
- [Backup](#backup)
- [Borderou (Bank Reconciliation)](#borderou-bank-reconciliation)
- [Storage Config](#storage-config)
- [Import](#import)
- [CPV Codes](#cpv-codes)
- [NC Codes](#nc-codes)

**Total tools: 229**

---

## Authentication

### `auth_login`

Authenticate with the Storno.ro API using email and password. Returns JWT access and refresh tokens, and stores them in the session config for all subsequent requests. Must be called before any other tool if STORNO_TOKEN is not set.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `email` | string | Yes | User email address |
| `password` | string | Yes | User password |

### `auth_register`

Create a new Storno.ro user account. A default organization is automatically created. Returns JWT tokens on success.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `email` | string | Yes | Email address for the new account (must be unique) |
| `password` | string | Yes | Password (minimum 8 characters) |
| `firstName` | string | No | User's first name |
| `lastName` | string | No | User's last name |

### `auth_refresh`

Refresh an expired JWT access token using the refresh token. Both tokens are rotated. The new tokens are stored in the session config. Use when the current token has expired.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `refreshToken` | string | No | Refresh token to use. If omitted, uses the token stored in session config (STORNO_REFRESH_TOKEN). |

### `auth_me`

Get the current authenticated user profile including organization memberships and subscription plan. Returns flat JSON with user, organization, memberships, and subscription.

*No parameters required.*

### `auth_update_profile`

Update the authenticated user's profile. Can update name, phone, timezone, preferences, or change password (requires currentPassword when changing password).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `firstName` | string | No | User's first name |
| `lastName` | string | No | User's last name |
| `phone` | string | No | Phone number (E.164 format recommended, e.g., +40721234567) |
| `timezone` | string | No | Timezone in IANA format (e.g., Europe/Bucharest) |
| `preferences` | string | No | User preferences object (language, theme, notifications, etc.) |
| `password` | string | No | New password (requires currentPassword to also be provided) |
| `currentPassword` | string | No | Current password (required when changing password) |

### `auth_forgot_password`

Request a password reset email. Always returns success to prevent user enumeration — the email is only sent if the account exists. The reset link is valid for 1 hour.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `email` | string | Yes | Email address associated with the account |

### `auth_reset_password`

Reset a user password using the token received via email from auth_forgot_password. The token is single-use and expires after 1 hour. All existing sessions are revoked on success.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `token` | string | Yes | Password reset token received via email link (from URL query parameter) |
| `password` | string | Yes | New password (minimum 8 characters) |

---

## Companies

### `companies_list`

List all companies belonging to the authenticated user's organization. Returns company details including CIF, addresses, bank info, sync settings, and ANAF token status. Use this to find company UUIDs for the companies_select tool.

*No parameters required.*

### `companies_get`

Get detailed information for a specific company by UUID. Returns all configuration settings, bank info, sync settings, and ANAF token validity status.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Company UUID |

### `companies_create`

Create a new company by providing its CIF (Romanian tax identification number). The system automatically validates the CIF with ANAF and retrieves official registration data (name, address, VAT status). The CIF can be provided with or without the RO prefix.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `cif` | string | Yes | Romanian tax identification number / CIF (e.g., "12345678" or "RO12345678") |

### `companies_update`

Update configuration settings for a company. Note: core ANAF data (CIF, registration number, VAT status, official address) cannot be modified as they are synced from official ANAF sources. Only editable fields like contact info, bank details, and sync settings can be changed.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Company UUID |
| `name` | string | No | Company display name |
| `bankName` | string | No | Bank name |
| `bankAccount` | string | No | IBAN account number |
| `bankBic` | string | No | BIC/SWIFT code |
| `defaultCurrency` | string | No | Default currency code (e.g., "RON", "EUR") |
| `phone` | string | No | Contact phone number |
| `email` | string | No | Contact email address |
| `syncDaysBack` | number | No | Number of days to sync back from ANAF (1-365) |
| `efacturaDelayHours` | number | No | Hours to delay e-Factura sync (0-72) |
| `archiveEnabled` | boolean | No | Enable automatic archiving |
| `archiveRetentionYears` | number | No | Years to retain archived data (1-50) |
| `enabledModules` | string[] \| null | No | Array of enabled module keys for sidebar visibility (null = all enabled). Valid keys: `delivery_notes`, `receipts`, `proforma_invoices`, `recurring_invoices`, `reports`, `efactura`, `spv_messages` |

### `companies_delete`

Permanently delete a company and all associated data (invoices, clients, products, ANAF tokens). This triggers an asynchronous cascade deletion. Only Owner or Admin roles can delete companies. This action cannot be undone.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Company UUID to delete |

### `companies_upload_logo`

Upload a logo image for a company. Accepts PNG, JPG, or SVG files up to 2MB. The logo appears on PDF documents.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Company UUID |
| `filePath` | string | Yes | Absolute path to the logo image file (PNG, JPG, or SVG) |

### `companies_delete_logo`

Remove the logo from a company.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Company UUID |

### `companies_set_active`

Set the organization-level active company by UUID. Calls `PUT /api/v1/companies/{uuid}/set-active` on the server and returns the updated list of all companies with the new active company reflected. Requires COMPANY_EDIT permission. Use `companies_list` first to find available company UUIDs.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | Yes | Company UUID to mark as the active company for the organization. |

### `companies_select`

Select the active company for the current session. This sets the X-Company header used by all subsequent invoice, client, product, and other company-scoped requests. Call companies_list first to find available company UUIDs.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | Yes | Company UUID to set as the active company for this session. All subsequent API calls will use this company context. |

---

## Invoices

### `invoices_list`

List invoices for the active company with pagination, filtering, and sorting. Supports filtering by status (draft/issued/sent_to_provider/validated/rejected/cancelled), direction (incoming/outgoing), date range, client, and search term. Returns paginated results with totals.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page, max 100 (default: 20) |
| `search` | string | No | Search term for invoice number or client name |
| `status` | enum(draft, issued, sent_to_provider, validated, rejected, cancelled) | No | Filter by invoice status |
| `direction` | enum(incoming, outgoing) | No | Filter by direction: incoming or outgoing invoices |
| `from` | string | No | Start date filter in ISO 8601 format (YYYY-MM-DD) |
| `to` | string | No | End date filter in ISO 8601 format (YYYY-MM-DD) |
| `clientId` | string | No | Filter by client UUID |
| `sort` | enum(issueDate, number, total, dueDate) | No | Field to sort by (default: issueDate) |
| `order` | enum(asc, desc) | No | Sort order: asc or desc (default: desc) |

### `invoices_get`

Get complete details for a specific invoice by UUID, including all line items, payment history, events timeline, attachments, client and supplier info, XML/PDF generation status, and ANAF submission details.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_create`

Create a new draft invoice. Requires a clientId and at least one line item. The invoice starts in "draft" status and can be edited until issued. Use invoices_issue to finalize and generate XML/PDF.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `clientId` | string | Yes | Client UUID (from clients_list) |
| `issueDate` | string | Yes | Invoice issue date in ISO 8601 format (YYYY-MM-DD) |
| `dueDate` | string | No | Payment due date in ISO 8601 format (YYYY-MM-DD) |
| `seriesId` | string | No | Invoice series UUID (from document_series_list). Uses default if not provided. |
| `currency` | string | No | ISO 4217 currency code (default: RON) |
| `exchangeRate` | number | No | Exchange rate relative to RON (default: 1.0) |
| `invoiceTypeCode` | string | No | UBL invoice type code: 380=commercial (default), 381=credit note, 384=corrected, 389=self-billed |
| `notes` | string | No | Public notes visible to the client |
| `paymentTerms` | string | No | Payment terms description (e.g., "Net 30") |
| `deliveryLocation` | string | No | Delivery address |
| `projectReference` | string | No | Project reference number |
| `orderNumber` | string | No | Purchase order number |
| `contractNumber` | string | No | Contract reference number |
| `issuerName` | string | No | Name of person issuing the invoice |
| `issuerId` | string | No | Issuer ID number |
| `mentions` | string | No | Additional legal mentions on the invoice |
| `internalNote` | string | No | Internal note (not visible to the client) |
| `salesAgent` | string | No | Sales agent name |
| `deputyName` | string | No | Deputy/representative name |
| `deputyIdentityCard` | string | No | Deputy ID card number |
| `deputyAuto` | string | No | Deputy vehicle registration number |
| `collect` | boolean | No | Create an immediate full payment record (default: false) |
| `penaltyEnabled` | boolean | No | Enable late payment penalty (default: false) |
| `penaltyPercentPerDay` | number | No | Daily penalty percentage (e.g., 0.05 for 0.05% per day) |
| `penaltyGraceDays` | number | No | Grace period in days before penalty starts applying |
| `lines` | array | Yes | Invoice line items (at least one required) |

### `invoices_update`

Update an existing draft invoice. Only invoices with status "draft" can be updated. When updating the lines array, the entire array is replaced — include all lines you want to keep. Once issued, use invoices_cancel instead.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID to update |
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `clientId` | string | No | Client UUID |
| `seriesId` | string | No | Invoice series UUID |
| `issueDate` | string | No | Invoice issue date (YYYY-MM-DD) |
| `dueDate` | string | No | Payment due date (YYYY-MM-DD) |
| `currency` | string | No | ISO 4217 currency code |
| `exchangeRate` | number | No | Exchange rate relative to RON |
| `invoiceTypeCode` | string | No | UBL invoice type code |
| `notes` | string | No | Public notes visible to the client |
| `paymentTerms` | string | No | Payment terms description |
| `deliveryLocation` | string | No | Delivery address |
| `projectReference` | string | No | Project reference number |
| `orderNumber` | string | No | Purchase order number |
| `contractNumber` | string | No | Contract reference number |
| `issuerName` | string | No | Name of person issuing the invoice |
| `issuerId` | string | No | Issuer ID number |
| `mentions` | string | No | Additional legal mentions |
| `internalNote` | string | No | Internal note (not visible to client) |
| `salesAgent` | string | No | Sales agent name |
| `deputyName` | string | No | Deputy/representative name |
| `deputyIdentityCard` | string | No | Deputy ID card number |
| `deputyAuto` | string | No | Deputy vehicle registration |
| `penaltyEnabled` | boolean | No | Enable late payment penalty |
| `penaltyPercentPerDay` | number | No | Daily penalty percentage |
| `penaltyGraceDays` | number | No | Grace period before penalty applies |
| `lines` | array | No | Invoice line items. WARNING: replaces all existing lines — include every line you want to keep. |

### `invoices_delete`

Permanently delete a draft invoice. Only invoices with status "draft" can be deleted. This action is irreversible. For issued invoices, use invoices_cancel instead.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID to delete |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_issue`

Issue a draft invoice. Validates the data, assigns a series number, generates UBL 2.1 XML, generates PDF (Pro plan), and changes status from "draft" to "issued". Once issued, the invoice cannot be edited. Use invoices_submit to send to ANAF e-Factura.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID to issue |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_submit`

Submit an issued invoice to the ANAF e-Factura system. The invoice must be in "issued" status. Changes status to "sent_to_provider". ANAF validates the invoice asynchronously — poll invoices_get or use invoices_events to check validation result.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID to submit to ANAF |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_validate`

Validate an invoice before issuing or submitting. Returns a list of errors and warnings. Use mode "quick" for fast validation (basic rules) or "full" for comprehensive UBL Schematron and CIUS-RO compliance checks.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID to validate |
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `mode` | enum(quick, full) | No | Validation mode: "quick" for fast basic rules (default), "full" for UBL Schematron + CIUS-RO compliance (slower) |

### `invoices_cancel`

Cancel an issued invoice. Requires a cancellation reason (minimum 10 characters). Changes status to "cancelled". Cancelled invoices remain in the system for record-keeping. Use invoices_restore to undo an accidental cancellation.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID to cancel |
| `reason` | string | Yes | Reason for cancellation (minimum 10 characters) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_restore`

Restore a cancelled invoice back to "draft" status. Only for accidental cancellations. Cannot restore if the invoice was submitted to ANAF, has credit notes, or has recorded payments. The invoice can then be edited and reissued.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID to restore from cancelled status |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_pdf`

Download the PDF representation of an invoice. Returns base64-encoded binary data with content type. Requires Pro plan. PDF is generated automatically on issue or on-demand when first requested.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_xml`

Download the UBL 2.1 XML file for an issued invoice. Returns the XML text content. The XML is the format required for ANAF e-Factura submission and conforms to CIUS-RO and EN 16931 standards.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_email`

Send an invoice via email with optional PDF and XML attachments. Use invoices_email_defaults first to get pre-filled subject and body. Emails are sent asynchronously via queue. PDF attachment requires Pro plan.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID to email |
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `to` | string | Yes | Recipient email address |
| `cc` | string | No | CC email address (comma-separated for multiple) |
| `bcc` | string | No | BCC email address (comma-separated for multiple) |
| `subject` | string | No | Email subject (uses default template if not provided) |
| `body` | string | No | Email body text (uses default template if not provided) |
| `attachPdf` | boolean | No | Attach PDF invoice (default: true, requires Pro plan) |
| `attachXml` | boolean | No | Attach UBL XML file (default: false) |
| `language` | enum(ro, en) | No | Email template language: ro (default) or en |

### `invoices_email_defaults`

Get pre-filled email content for an invoice based on the company email template. Returns suggested "to", "cc", "subject", and "body" with template variables already substituted. Use this to populate the email form before calling invoices_email.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `language` | enum(ro, en) | No | Email language: ro (default) or en |

### `invoices_email_history`

Get the complete history of emails sent for an invoice, including delivery status, open/click tracking, bounce information, and who sent each email. Useful for audit trails and verifying client received the invoice.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_events`

Get the complete timeline of events for an invoice: status changes, ANAF submissions, validations, emails sent, payments received, and user actions. Useful for audit trails, debugging, and understanding invoice lifecycle history.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_attachments`

Download a file attachment from an invoice. Returns base64-encoded binary data with the MIME type. Get attachment UUIDs from invoices_get (the "attachments" array). Supports PDF, images, Word, Excel, ZIP, and other file types.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID |
| `attachmentId` | string | Yes | Attachment UUID (from invoices_get attachments array) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_verify_signature`

Verify the ANAF digital signature on a validated invoice. Checks certificate validity, signature cryptographic integrity, and XML content integrity. Requires Pro plan and the invoice must be in "validated" status (ANAF-signed).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID (must be ANAF-validated) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_export_csv`

Export a filtered list of invoices to CSV format. Accepts the same filters as invoices_list (status, direction, date range, client, etc.). Returns CSV text with UTF-8 BOM for Excel compatibility. Max 10,000 invoices; use invoices_export_zip for large exports with files.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `search` | string | No | Search term for invoice number or client name |
| `status` | enum(draft, issued, sent_to_provider, validated, rejected, cancelled) | No | Filter by invoice status |
| `direction` | enum(incoming, outgoing) | No | Filter by direction |
| `from` | string | No | Start date (YYYY-MM-DD) |
| `to` | string | No | End date (YYYY-MM-DD) |
| `clientId` | string | No | Filter by client UUID |
| `sort` | enum(issueDate, number, total, dueDate) | No | Sort field |
| `order` | enum(asc, desc) | No | Sort order |

### `invoices_export_zip`

Export a set of invoices (by UUID list) to a ZIP archive containing PDFs, XMLs, and a CSV summary. Processed asynchronously — returns an exportId and statusUrl. Poll the statusUrl or wait for webhook. Requires Pro plan. Max 100 invoices per export.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `invoiceIds` | array | Yes | Array of invoice UUIDs to include in the ZIP (max 100) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `includePdf` | boolean | No | Include PDF files in ZIP (default: true, requires Pro plan) |
| `includeXml` | boolean | No | Include UBL XML files in ZIP (default: true) |
| `includeCsv` | boolean | No | Include CSV summary in ZIP (default: true) |
| `folderStructure` | enum(flat, by-client, by-month, by-series) | No | ZIP folder organization: flat (default), by-client, by-month, or by-series |

### `invoices_bulk_delete`

Delete multiple draft invoices in batch. Only draft invoices can be deleted. Returns count of deleted and any errors.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | array | Yes | Array of invoice UUIDs to delete (1-100) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_bulk_cancel`

Cancel multiple invoices in batch with optional reason. Returns count of cancelled and any errors.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | array | Yes | Array of invoice UUIDs to cancel (1-100) |
| `reason` | string | No | Cancellation reason applied to all invoices |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_bulk_storno`

Create storno (refund/credit note) invoices for multiple invoices. Only outgoing, issued/validated invoices are eligible. Returns count of created storno invoices and any errors.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | array | Yes | Array of invoice UUIDs to create storno for (1-100) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_bulk_mark_paid`

Mark multiple invoices as fully paid. Creates payment records for the remaining balance on each invoice.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | array | Yes | Array of invoice UUIDs to mark as paid (1-100) |
| `paymentMethod` | string | No | Payment method (default: bank_transfer) |
| `paidAt` | string | No | Payment date in ISO 8601 format (YYYY-MM-DD). Defaults to today. |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_export_saga_xml`

Export invoices in Saga XML format for accounting software integration (e.g., Saga C). Accepts the same filters as invoices_list.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `search` | string | No | Search term for invoice number or client name |
| `status` | enum(draft, issued, sent_to_provider, validated, rejected, cancelled) | No | Filter by invoice status |
| `direction` | enum(incoming, outgoing) | No | Filter by direction |
| `from` | string | No | Start date (YYYY-MM-DD) |
| `to` | string | No | End date (YYYY-MM-DD) |
| `clientId` | string | No | Filter by client UUID |
| `sort` | enum(issueDate, number, total, dueDate) | No | Sort field |
| `order` | enum(asc, desc) | No | Sort order |

### `invoices_export_receipts_saga_xml`

Export payment receipts (incasari) in Saga XML format. Exports all outgoing invoice payments for accounting integration.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_export_payments_saga_xml`

Export supplier payments (plati) in Saga XML format. Exports all incoming invoice payments for accounting integration.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_export_efactura_zip`

Export e-Factura XML files as ZIP archive. For large batches (>100 invoices), processed asynchronously with notification.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `direction` | enum(outgoing, incoming) | Yes | Invoice direction |
| `dateFrom` | string | No | Start date filter (YYYY-MM-DD) |
| `dateTo` | string | No | End date filter (YYYY-MM-DD) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_share_links_list`

List all share links for an invoice with view counts, expiry info, and status.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_share_links_create`

Create a new shareable link for an invoice. Returns the share URL, token, and expiry date.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID |
| `expiryDays` | number | No | Number of days until link expires (default: 30) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `invoices_share_links_revoke`

Revoke/delete a share link, making it permanently inaccessible.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invoice UUID |
| `linkId` | string | Yes | Share link UUID to revoke |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## Clients

### `clients_list`

List clients for the active company. Results are grouped alphabetically by name and can be filtered by type (company/individual) or searched by name, CUI/CNP, or email.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page, max 200 (default: 50) |
| `search` | string | No | Search term to filter by name, CUI/CNP, or email |
| `type` | enum(company, individual) | No | Filter by client type: "company" or "individual" |

### `clients_get`

Get detailed information about a specific client by UUID, including invoice history, delivery note history, receipt history, and document counts.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Client UUID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `clients_create`

Create a new client manually. Requires at least a name. If a CUI is provided and a client with that CUI already exists, returns the existing client instead of creating a duplicate.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `name` | string | Yes | Client name |
| `type` | enum(company, individual) | No | Client type (default: company) |
| `cui` | string | No | Tax identification number (CUI/CIF) |
| `cnp` | string | No | Personal identification number (for individuals) |
| `vatCode` | string | No | VAT code (e.g., RO12345678) |
| `isVatPayer` | boolean | No | Whether the client is a VAT payer |
| `registrationNumber` | string | No | Trade register number (Nr. Reg. Com.) |
| `address` | string | No | Street address |
| `city` | string | No | City |
| `county` | string | No | County/state |
| `country` | string | No | ISO country code (default: RO) |
| `postalCode` | string | No | Postal code |
| `email` | string | No | Contact email |
| `phone` | string | No | Contact phone |
| `bankName` | string | No | Bank name |
| `bankAccount` | string | No | IBAN or bank account number |
| `defaultPaymentTermDays` | number | No | Default payment term in days |
| `contactPerson` | string | No | Contact person name |
| `notes` | string | No | Internal notes |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `clients_update`

Update an existing client. Only provided fields are updated; omitted fields remain unchanged.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Client UUID to update |
| `name` | string | No | Client name |
| `type` | enum(company, individual) | No | Client type |
| `cui` | string | No | Tax identification number |
| `cnp` | string | No | Personal identification number |
| `vatCode` | string | No | VAT code |
| `isVatPayer` | boolean | No | Whether the client is a VAT payer |
| `registrationNumber` | string | No | Trade register number |
| `address` | string | No | Street address |
| `city` | string | No | City |
| `county` | string | No | County/state |
| `country` | string | No | ISO country code |
| `postalCode` | string | No | Postal code |
| `email` | string | No | Contact email |
| `phone` | string | No | Contact phone |
| `bankName` | string | No | Bank name |
| `bankAccount` | string | No | IBAN or bank account number |
| `defaultPaymentTermDays` | number | No | Default payment term in days |
| `contactPerson` | string | No | Contact person name |
| `notes` | string | No | Internal notes |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `clients_delete`

Soft-delete a client. The client is marked as deleted but remains in the database for historical records.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Client UUID to delete |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `clients_bulk_delete`

Delete multiple clients in batch. Returns count of deleted and any errors.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | array | Yes | Array of client UUIDs to delete (1-100) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `clients_anaf_lookup`

Lookup company details by CUI in ANAF without creating a client. Returns pre-filled form data (name, address, VAT info, etc.) that can be used with clients_create.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `cui` | string | Yes | CUI/CIF to look up (with or without RO prefix) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `clients_from_registry`

Create a client from the ONRC registry with ANAF validation. Looks up the CUI in ANAF and auto-fills all available details. If a client with the same CUI already exists, returns the existing one.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `cui` | string | Yes | CUI/CIF of the company to add (with or without RO prefix) |
| `name` | string | No | Fallback name if ANAF lookup fails |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `clients_export_csv`

Export all clients as a CSV file. Returns binary CSV data with UTF-8 BOM for Excel compatibility.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `clients_export_saga_xml`

Export clients in Saga XML format for accounting software integration (e.g., Saga C).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## Products

### `products_list`

List products for the active company. Products are sync-only and are automatically extracted from invoice line items during ANAF synchronization — they cannot be manually created or edited. Results can be filtered by active status and searched by name, code, or description.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page, max 200 (default: 50) |
| `search` | string | No | Search term to filter by product name, code, or description |
| `isActive` | boolean | No | Filter by active status (true = active only, false = inactive only) |

### `products_get`

Get detailed information about a specific product by UUID, including usage statistics (total usage count, total revenue generated, average quantity, first and last usage dates).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Product UUID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## Payments

### `payments_list`

List all payments recorded for a specific invoice, ordered by payment date (most recent first). Returns payment amount, date, method, reference number, and notes. The sum of payments determines the invoice amountPaid and balance.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `invoiceId` | string | Yes | Invoice UUID to list payments for |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `payments_create`

Record a payment received for an invoice. Updates the invoice amountPaid and balance, and automatically changes invoice status to "partially_paid" or "paid" as appropriate. Supports partial payments with full details (method, reference, notes).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `invoiceId` | string | Yes | Invoice UUID to record payment for |
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `amount` | number | Yes | Payment amount (must be greater than 0) |
| `paymentDate` | string | Yes | Date payment was received in ISO 8601 format (YYYY-MM-DD) |
| `paymentMethod` | enum(bank_transfer, cash, card, other) | No | Payment method: bank_transfer (default), cash, card, or other |
| `currency` | string | No | Currency code (ISO 4217). Defaults to invoice currency. Include if payment is in a different currency. |
| `reference` | string | No | Payment reference number (e.g., bank transfer reference, receipt number) |
| `notes` | string | No | Additional notes about this payment |

### `payments_delete`

Permanently delete a recorded payment from an invoice. Updates the invoice amountPaid and balance, and may change the invoice status back to "unpaid" or "partially_paid". This action is irreversible — use with caution for corrections.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `invoiceId` | string | Yes | Invoice UUID |
| `paymentId` | string | Yes | Payment UUID to delete (from payments_list) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## Invoice Defaults

### `defaults_invoice`

Get all default values and dropdown options needed for invoice creation. Returns VAT rates, currencies with symbols, payment terms (in days), units of measure, payment methods, and current BNR exchange rates for EUR/USD/GBP/CHF relative to RON. Always fetch this before creating invoices — never hardcode these values.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## VAT Rates

### `vat_rates_list`

List all VAT rates configured for the active company, sorted by display position. Returns rate percentage, display label, e-Factura category code, and which rate is the default. Common Romanian rates: 19% (standard), 9% (reduced), 5% (super-reduced), 0% (exempt).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `vat_rates_create`

Create a new VAT rate for the active company. If isDefault is true, any existing default rate is demoted. If this is the first VAT rate, it automatically becomes the default. Common e-Factura category codes: S=standard, AA=reduced, E=exempt, O=outside scope, Z=zero rated, AE=reverse charge.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `rate` | number | Yes | VAT percentage (e.g., 19 for 19%, 0 for exempt) |
| `label` | string | Yes | Display label shown in dropdowns (e.g., "TVA 19%", "Scutit") |
| `categoryCode` | string | No | e-Factura category code (default: "S"). Options: S, AA, E, O, Z, AE |
| `isDefault` | boolean | No | Set this as the default VAT rate for new invoice lines (default: false) |
| `position` | number | No | Display order position in dropdowns (lower = first). Auto-assigned if not provided. |

### `vat_rates_update`

Update an existing VAT rate. Note: changing the rate percentage does not retroactively affect existing invoices — those preserve the original rate. Only updates display label, category code, default status, or position. At least one field must be provided.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | VAT rate UUID to update |
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `rate` | number | No | VAT percentage |
| `label` | string | No | Display label |
| `categoryCode` | string | No | e-Factura category code (S, AA, E, O, Z, AE) |
| `isDefault` | boolean | No | Set as default rate (demotes any existing default) |
| `position` | number | No | Display order position |

### `vat_rates_delete`

Soft-delete a VAT rate. The rate is marked as deleted but not physically removed, preserving historical invoice integrity. Cannot delete the default rate (set another as default first) or the last remaining rate. Existing invoices are not affected.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | VAT rate UUID to delete |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## Bank Accounts

### `bank_accounts_list`

List all bank accounts configured for the active company. Returns IBAN, bank name, currency, and which account is the default per currency. Bank accounts appear on invoices as payment instructions.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `bank_accounts_create`

Add a new bank account to the active company. IBAN must be in valid format and unique within the company. If isDefault is true, any existing default account for that currency is demoted. The first account for a currency automatically becomes the default.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `iban` | string | Yes | International Bank Account Number in valid IBAN format (e.g., "RO49AAAA1B31007593840000") |
| `bankName` | string | No | Name of the bank (e.g., "BCR", "Banca Transilvania", "ING Bank") |
| `currency` | string | No | Currency code ISO 4217 (default: "RON"). Use "EUR" for Euro accounts. |
| `isDefault` | boolean | No | Set as default account for this currency (default: false) |

### `bank_accounts_update`

Update an existing bank account. Can update IBAN, bank name, currency, or default status. If setting isDefault to true, any existing default for that currency is demoted. At least one field must be provided.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Bank account UUID to update |
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `iban` | string | No | New IBAN (must be valid and unique within company) |
| `bankName` | nullable string | No | Bank name (pass null to clear) |
| `currency` | string | No | Currency code ISO 4217 |
| `isDefault` | boolean | No | Set as default account for this currency |

### `bank_accounts_delete`

Permanently delete a bank account. Cannot delete the last bank account for a company or the default account (set another as default first). Existing invoices that referenced this account retain the IBAN in their stored data.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Bank account UUID to delete |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## Document Series

### `document_series_list`

List all document series for the active company, optionally filtered by type. Document series define the numbering prefixes for invoices (e.g., "FAC"), proformas ("PRO"), credit notes, and delivery notes. Each series tracks the current and next available number.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `type` | enum(invoice, proforma, credit_note, delivery_note) | No | Filter by document type: invoice, proforma, credit_note, or delivery_note |

### `document_series_create`

Create a new document series. The prefix must be unique per company and document type. Common patterns: "FAC" for invoices, "FAC2026" for annual series, "PRO" for proformas. Use currentNumber to set the starting number (default: 0, so first document gets number 1).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `prefix` | string | Yes | Series prefix (must be unique per company+type). Examples: "FAC", "FAC2026", "PRO", "AVZ" |
| `type` | enum(invoice, proforma, credit_note, delivery_note) | Yes | Document type this series is for |
| `currentNumber` | number | No | Starting number — the last used number (default: 0, meaning next document gets 1) |
| `active` | boolean | No | Whether the series is active and available for new documents (default: true) |

### `document_series_update`

Update an existing document series. Only "currentNumber" and "active" can be changed — prefix and type are immutable after creation. Use active=false to deactivate a series (e.g., at end of fiscal year). Changing currentNumber affects the next document number, use with extreme caution to avoid duplicates.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Document series UUID to update |
| `companyId` | string | No | Company UUID override (uses active company if not set) |
| `currentNumber` | number | No | Update the last used number (CAUTION: setting lower than max existing number may create duplicates) |
| `active` | boolean | No | Set series active or inactive (inactive = not available for new documents) |

### `document_series_delete`

Permanently delete a document series. Cannot delete a series that has been used for any documents. Consider marking as inactive (active=false) instead, to preserve referential integrity and the audit trail. Only delete if the series was created by mistake and never used.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Document series UUID to delete |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `document_series_set_default`

Set a document series as the default for its type. The default series is auto-selected when creating new documents of that type. Only one series can be default per type.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Document series UUID to set as default |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## Proforma Invoices

### `proforma_invoices_list`

List proforma invoices for the selected company with optional filtering by status, date range, client, and search term. Returns paginated results.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `search` | string | No | Search term for invoice number or client name |
| `status` | enum(draft, sent, accepted, rejected, converted, cancelled) | No | Filter by status |
| `from` | string | No | Start date filter (YYYY-MM-DD) |
| `to` | string | No | End date filter (YYYY-MM-DD) |
| `clientId` | string | No | Filter by client UUID |
| `sort` | string | No | Sort field |
| `order` | enum(asc, desc) | No | Sort order |

### `proforma_invoices_get`

Get complete details for a specific proforma invoice including all line items, client information, and calculated totals.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the proforma invoice to retrieve |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `proforma_invoices_create`

Create a new proforma invoice in draft status with line items. Supports multiple currencies, discounts, and optional references.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `clientId` | string | Yes | UUID of the client |
| `seriesId` | string | Yes | UUID of the invoice series configured for proforma invoices |
| `issueDate` | string | Yes | Date of issue (YYYY-MM-DD) |
| `dueDate` | string | Yes | Payment due date (YYYY-MM-DD) |
| `validUntil` | string | Yes | Valid until date (YYYY-MM-DD) |
| `currency` | string | Yes | Currency code (e.g., RON, EUR, USD) |
| `exchangeRate` | number | No | Exchange rate to base currency (default: 1.0 for RON) |
| `invoiceTypeCode` | string | No | Invoice type code (default: "380" - Commercial Invoice) |
| `notes` | string | No | Public notes visible to client |
| `paymentTerms` | string | No | Payment terms description (e.g., "Net 30") |
| `deliveryLocation` | string | No | Delivery address or location |
| `projectReference` | string | No | Related project reference |
| `orderNumber` | string | No | Client purchase order number |
| `contractNumber` | string | No | Related contract number |
| `issuerName` | string | No | Name of person issuing the proforma |
| `issuerId` | string | No | UUID of the issuer user |
| `mentions` | string | No | Additional mentions or notes |
| `internalNote` | string | No | Internal note (not visible to client) |
| `salesAgent` | string | No | Sales agent name |
| `lines` | array | Yes | Array of line items (minimum 1 required) |

### `proforma_invoices_update`

Update an existing proforma invoice. Only invoices in draft status can be updated. Replaces all line items with the provided array.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the proforma invoice to update |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `clientId` | string | Yes | UUID of the client |
| `seriesId` | string | Yes | UUID of the invoice series |
| `issueDate` | string | Yes | Date of issue (YYYY-MM-DD) |
| `dueDate` | string | Yes | Payment due date (YYYY-MM-DD) |
| `validUntil` | string | Yes | Valid until date (YYYY-MM-DD) |
| `currency` | string | Yes | Currency code (e.g., RON, EUR, USD) |
| `exchangeRate` | number | No | Exchange rate to base currency |
| `invoiceTypeCode` | string | No | Invoice type code |
| `notes` | string | No | Public notes visible to client |
| `paymentTerms` | string | No | Payment terms description |
| `deliveryLocation` | string | No | Delivery address or location |
| `projectReference` | string | No | Related project reference |
| `orderNumber` | string | No | Client purchase order number |
| `contractNumber` | string | No | Related contract number |
| `issuerName` | string | No | Name of person issuing the proforma |
| `issuerId` | string | No | UUID of the issuer user |
| `mentions` | string | No | Additional mentions or notes |
| `internalNote` | string | No | Internal note (not visible to client) |
| `salesAgent` | string | No | Sales agent name |
| `lines` | array | Yes | Array of line items (replaces all existing lines) |

### `proforma_invoices_delete`

Permanently delete a proforma invoice. Only draft proforma invoices can be deleted. Use cancel for sent/accepted/rejected proformas to preserve audit trail.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the proforma invoice to delete |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `proforma_invoices_send`

Mark a proforma invoice as sent to the client. Transitions status from draft to sent. Once sent, the proforma becomes read-only.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the proforma invoice to mark as sent |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `proforma_invoices_accept`

Mark a proforma invoice as accepted by the client. Transitions status to accepted. Once accepted, the proforma is ready to be converted to a final invoice.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the proforma invoice to mark as accepted |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `proforma_invoices_reject`

Mark a proforma invoice as rejected by the client. Optionally provide a rejection reason and notes. Once rejected, the proforma cannot be converted to an invoice.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the proforma invoice to mark as rejected |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `rejectionReason` | string | No | Reason for rejection provided by the client |
| `rejectionNotes` | string | No | Internal notes about the rejection |

### `proforma_invoices_cancel`

Cancel a proforma invoice. Can be cancelled from any status except converted or already cancelled. Preserves historical record unlike deletion.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the proforma invoice to cancel |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `cancellationReason` | string | No | Reason for cancellation |
| `cancellationNotes` | string | No | Internal notes about the cancellation |

### `proforma_invoices_convert`

Convert a proforma invoice into a final invoice. Creates a new invoice with all proforma data, marks proforma as converted, and links the two documents. Returns both the new invoice and updated proforma.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the proforma invoice to convert |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `invoiceSeriesId` | string | No | UUID of invoice series to use (if different from proforma series) |
| `issueDate` | string | No | Override issue date for the new invoice (default: today, YYYY-MM-DD) |
| `dueDate` | string | No | Override due date for the new invoice (default: proforma due date, YYYY-MM-DD) |

### `proforma_invoices_pdf`

Download the PDF of a proforma invoice. Returns base64-encoded binary data. Requires Pro plan.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the proforma invoice |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `proforma_invoices_bulk_delete`

Delete multiple proforma invoices in batch. Only draft proformas can be deleted. Returns count of deleted and any errors.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | array | Yes | Array of proforma invoice UUIDs to delete (1-100) |
| `companyId` | string | No | Company UUID (overrides configured default) |

---

## Recurring Invoices

### `recurring_invoices_list`

List recurring invoice templates for the selected company. Supports filtering by active status and frequency.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `search` | string | No | Search term to filter by reference or notes |
| `isActive` | boolean | No | Filter by active status (true/false) |
| `frequency` | enum(weekly, biweekly, monthly, bimonthly, quarterly, semiannual, annual) | No | Filter by generation frequency |

### `recurring_invoices_get`

Get detailed information about a specific recurring invoice template including all line items used as a template for generated invoices.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the recurring invoice template |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `recurring_invoices_create`

Create a new recurring invoice template. The system will automatically generate invoices based on the specified frequency and schedule. Supports fixed, exchange_rate, and markup pricing rules on line items.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `clientId` | string | Yes | UUID of the client |
| `seriesId` | string | Yes | UUID of the document series |
| `reference` | string | No | Human-readable reference for this recurring invoice |
| `documentType` | enum(invoice, credit_note) | Yes | Document type to generate |
| `currency` | string | Yes | ISO 4217 currency code (e.g., RON, EUR) |
| `invoiceTypeCode` | string | Yes | e-Factura invoice type code (e.g., "380") |
| `frequency` | enum(weekly, biweekly, monthly, bimonthly, quarterly, semiannual, annual) | Yes | How often to generate invoices |
| `frequencyDay` | number | Yes | Day of month for generation (1-31) |
| `frequencyMonth` | number | No | Month for annual generation (1-12, required if frequency is annual) |
| `nextIssuanceDate` | string | Yes | ISO 8601 date for the first invoice generation (YYYY-MM-DD) |
| `stopDate` | string | No | ISO 8601 date to stop generation (YYYY-MM-DD) |
| `dueDateType` | enum(fixed, relative) | Yes | How due date is calculated |
| `dueDateDays` | number | No | Days after issue date for due date (required if dueDateType is relative) |
| `dueDateFixedDay` | number | No | Fixed day of month for due date (1-31, required if dueDateType is fixed) |
| `notes` | string | No | Internal notes |
| `paymentTerms` | string | No | Payment terms text |
| `autoEmailEnabled` | boolean | No | Auto-send email on invoice generation (default: false) |
| `autoEmailTime` | string | No | Time to send email (HH:mm, default: "09:00") |
| `autoEmailDayOffset` | number | No | Days offset for email sending (default: 0) |
| `penaltyEnabled` | boolean | No | Enable late payment penalties (default: false) |
| `penaltyPercentPerDay` | number | No | Daily penalty percentage |
| `penaltyGraceDays` | number | No | Grace period in days before penalties apply |
| `lines` | array | Yes | Array of line items (minimum 1 required) |

### `recurring_invoices_update`

Update an existing recurring invoice template. All fields are optional but at least one must be provided. When updating lines, the entire lines array replaces existing lines.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the recurring invoice template to update |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `clientId` | string | No | UUID of the client |
| `seriesId` | string | No | UUID of the document series |
| `reference` | string | No | Human-readable reference |
| `documentType` | enum(invoice, credit_note) | No | Document type to generate |
| `currency` | string | No | ISO 4217 currency code |
| `invoiceTypeCode` | string | No | e-Factura invoice type code |
| `frequency` | enum(weekly, biweekly, monthly, bimonthly, quarterly, semiannual, annual) | No | How often to generate invoices |
| `frequencyDay` | number | No | Day of month for generation (1-31) |
| `frequencyMonth` | number | No | Month for annual generation (1-12) |
| `nextIssuanceDate` | string | No | ISO 8601 date for next invoice generation (YYYY-MM-DD) |
| `stopDate` | nullable string | No | ISO 8601 date to stop generation (null to remove) |
| `dueDateType` | enum(fixed, relative) | No | How due date is calculated |
| `dueDateDays` | number | No | Days after issue date for due date |
| `dueDateFixedDay` | number | No | Fixed day of month for due date (1-31) |
| `notes` | nullable string | No | Internal notes |
| `paymentTerms` | nullable string | No | Payment terms text |
| `autoEmailEnabled` | boolean | No | Auto-send email on invoice generation |
| `autoEmailTime` | string | No | Time to send email (HH:mm) |
| `autoEmailDayOffset` | number | No | Days offset for email sending |
| `penaltyEnabled` | boolean | No | Enable late payment penalties |
| `penaltyPercentPerDay` | number | No | Daily penalty percentage |
| `penaltyGraceDays` | number | No | Grace period in days before penalties apply |
| `lines` | array | No | Array of line items (replaces all existing lines) |

### `recurring_invoices_delete`

Permanently delete a recurring invoice template. Previously generated invoices from this template are not affected. Use toggle to temporarily pause instead.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the recurring invoice template to delete |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `recurring_invoices_toggle`

Toggle the active status of a recurring invoice template to pause or resume automatic invoice generation. If active, it will be paused; if paused, it will be resumed.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the recurring invoice template to toggle |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `recurring_invoices_issue_now`

Manually trigger immediate invoice generation from a recurring invoice template, bypassing the scheduled generation. Useful for testing configurations or creating one-off invoices. Does not update the nextIssuanceDate.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the recurring invoice template to issue now |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `recurring_invoices_bulk_delete`

Delete multiple recurring invoice templates in a single request. Returns the count of deleted items and any errors for items that could not be deleted.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | array | Yes | Array of recurring invoice UUIDs to delete (1-100) |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `recurring_invoices_bulk_toggle_active`

Toggle the active/paused status of multiple recurring invoices at once. Set active=true to resume or active=false to pause invoice generation.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | array | Yes | Array of recurring invoice UUIDs (1-100) |
| `active` | boolean | Yes | Set to true to activate, false to pause |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `recurring_invoices_bulk_issue_now`

Immediately generate invoices from multiple recurring invoice templates. Useful for triggering generation outside the normal schedule. Does not update the nextIssuanceDate.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | array | Yes | Array of recurring invoice UUIDs (1-100) |
| `companyId` | string | No | Company UUID (overrides configured default) |

---

## Delivery Notes

### `delivery_notes_list`

List delivery notes for the selected company with optional filtering by status, date range, client, and search term. Delivery notes document physical delivery of goods or completion of services.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `search` | string | No | Search term for delivery note number or client name |
| `status` | enum(draft, issued, converted, cancelled) | No | Filter by status |
| `from` | string | No | Start date filter (YYYY-MM-DD) |
| `to` | string | No | End date filter (YYYY-MM-DD) |
| `clientId` | string | No | Filter by client UUID |

### `delivery_notes_get`

Get complete details for a specific delivery note including all line items, client information, deputy details, and calculated totals.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the delivery note to retrieve |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `delivery_notes_create`

Create a new delivery note in draft status. Delivery notes document physical delivery of goods or services and can later be converted to invoices. Include deputy information for proof of delivery. A default delivery_note series is auto-assigned if neither seriesId nor documentSeriesId is provided.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `clientId` | string | Yes | UUID of the client |
| `seriesId` | string | No | UUID of the delivery note series (uses default series if not provided) |
| `documentSeriesId` | string | No | UUID of the document series to use (alternative to seriesId; uses default delivery_note series if neither is provided) |
| `issueDate` | string | Yes | Date of issue (YYYY-MM-DD) |
| `dueDate` | string | Yes | Due date for invoicing (YYYY-MM-DD) |
| `currency` | string | Yes | Currency code (e.g., RON, EUR, USD) |
| `exchangeRate` | number | No | Exchange rate to base currency (default: 1.0 for RON) |
| `deliveryLocation` | string | No | Full address where goods were delivered |
| `projectReference` | string | No | Related project or order reference |
| `issuerName` | string | No | Name of person issuing the delivery note |
| `issuerId` | string | No | UUID of the issuer user |
| `salesAgent` | string | No | Sales agent name |
| `deputyName` | string | No | Name of person who received the delivery |
| `deputyIdentityCard` | string | No | ID card number of the deputy |
| `deputyAuto` | string | No | Vehicle registration number used for delivery |
| `notes` | string | No | Public notes about the delivery |
| `mentions` | string | No | Additional mentions or instructions |
| `internalNote` | string | No | Internal note (not visible to client) |
| `lines` | array | Yes | Array of line items (minimum 1 required) |

### `delivery_notes_update`

Update an existing delivery note. Delivery notes in draft or issued status can be updated. Replaces all line items with the provided array.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the delivery note to update |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `clientId` | string | Yes | UUID of the client |
| `seriesId` | string | No | UUID of the delivery note series |
| `documentSeriesId` | string | No | UUID of the document series to use (alternative to seriesId) |
| `issueDate` | string | Yes | Date of issue (YYYY-MM-DD) |
| `dueDate` | string | Yes | Due date for invoicing (YYYY-MM-DD) |
| `currency` | string | Yes | Currency code (e.g., RON, EUR, USD) |
| `exchangeRate` | number | No | Exchange rate to base currency |
| `deliveryLocation` | string | No | Full address where goods were delivered |
| `projectReference` | string | No | Related project or order reference |
| `issuerName` | string | No | Name of person issuing the delivery note |
| `issuerId` | string | No | UUID of the issuer user |
| `salesAgent` | string | No | Sales agent name |
| `deputyName` | string | No | Name of person who received the delivery |
| `deputyIdentityCard` | string | No | ID card number of the deputy |
| `deputyAuto` | string | No | Vehicle registration number |
| `notes` | string | No | Public notes about the delivery |
| `mentions` | string | No | Additional mentions or instructions |
| `internalNote` | string | No | Internal note (not visible to client) |
| `lines` | array | Yes | Array of line items (replaces all existing lines) |

### `delivery_notes_delete`

Permanently delete a delivery note. Only draft delivery notes can be deleted. Use cancel for issued delivery notes to preserve audit trail.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the delivery note to delete |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `delivery_notes_issue`

Mark a delivery note as issued when the physical delivery of goods or completion of services occurs. Transitions status from draft to issued. Once issued, the delivery note becomes read-only.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the delivery note to mark as issued |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `delivery_notes_cancel`

Cancel a delivery note when delivery will not occur. Can be cancelled from draft or issued status. Preserves historical record unlike deletion. Optionally provide a cancellation reason.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the delivery note to cancel |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `cancellationReason` | string | No | Reason for cancellation |
| `cancellationNotes` | string | No | Internal notes about the cancellation |

### `delivery_notes_convert`

Convert a delivery note into a final invoice. Creates a new invoice with all delivery note data, marks the delivery note as converted, and establishes a link between the two documents. Returns both the new invoice and updated delivery note.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the delivery note to convert to an invoice |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `invoiceSeriesId` | string | No | UUID of the invoice series to use (if different from delivery note series) |
| `issueDate` | string | No | Override issue date for the new invoice (default: today, YYYY-MM-DD) |
| `dueDate` | string | No | Override due date for the new invoice (default: delivery note due date, YYYY-MM-DD) |

### `delivery_notes_restore`

Restore a cancelled delivery note back to draft status. Only cancelled delivery notes can be restored. This reverses the cancellation and allows the delivery note to be re-issued.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the cancelled delivery note to restore |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `delivery_notes_email`

Send a delivery note to a client via email with the PDF attached. Supports custom subject, body, CC, and BCC recipients.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the delivery note to send |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `to` | string | Yes | Recipient email address |
| `subject` | string | No | Email subject (auto-generated if omitted) |
| `body` | string | No | Email body text (auto-generated if omitted) |
| `cc` | array | No | CC email addresses |
| `bcc` | array | No | BCC email addresses |

### `delivery_notes_email_defaults`

Get pre-filled email content for a delivery note including default recipient, subject, and body text with template variables already substituted.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the delivery note |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `delivery_notes_email_history`

Get the email sending history for a delivery note, including all sent emails with their status, timestamps, and recipient information.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the delivery note |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `delivery_notes_storno`

Create a storno (return) delivery note with negated quantities from an existing issued delivery note. The storno delivery note is created as a draft and can be issued separately.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the issued delivery note to create storno for |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `delivery_notes_from_proforma`

Create a new delivery note from an existing proforma invoice. Copies client, lines, dates, currency, and notes from the proforma. The delivery note is created in draft status.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `proformaId` | string | Yes | UUID of the proforma invoice to create delivery note from |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `delivery_notes_bulk_convert`

Convert multiple issued delivery notes into a single invoice. All delivery notes must be issued, have the same client, and use the same currency. Creates one invoice combining all lines and marks all delivery notes as invoiced.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | array | Yes | Array of delivery note UUIDs to convert into a single invoice |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `delivery_notes_submit_etransport`

Submit an issued delivery note to Romania's ANAF e-Transport system for domestic transport declaration (TTN). The delivery note must be in issued status with e-Transport fields filled (vehicle number, route, transport data, line tariff codes and weights). Submission is asynchronous — the status will update from uploaded to ok (with UIT) or nok (with error).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the issued delivery note to submit to e-Transport |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `delivery_notes_pdf`

Generate and download the PDF for a delivery note. Returns the PDF as base64-encoded binary data. Supports optional VAT and price hiding for simplified delivery documents.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the delivery note |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `hideVat` | boolean | No | Hide VAT information on the PDF |
| `hidePrices` | boolean | No | Hide prices on the PDF |

### `delivery_notes_validate_etransport`

Validate a delivery note against the e-Transport XML schema and Schematron rules without submitting to ANAF. Returns validation result with any errors or warnings found. Useful for pre-checking before actual submission.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the delivery note to validate |
| `companyId` | string | No | Company UUID (overrides configured default) |

---

## Receipts

### `receipts_list`

List receipts (bonuri fiscale) for the selected company with optional filtering by status, date range, client, and search term. Receipts document point-of-sale transactions and can be converted to invoices.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `search` | string | No | Search term for receipt number or customer name |
| `status` | enum(draft, issued, invoiced, cancelled) | No | Filter by status |
| `from` | string | No | Start date filter (YYYY-MM-DD) |
| `to` | string | No | End date filter (YYYY-MM-DD) |
| `clientId` | string | No | Filter by client UUID |

### `receipts_get`

Get complete details for a specific receipt (bon fiscal) including all line items, payment breakdown, fiscal data, and calculated totals.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the receipt to retrieve |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `receipts_create`

Create a new receipt (bon fiscal) in draft status. Receipts document point-of-sale transactions with payment method details and optional fiscal register information. Can later be issued and converted to invoices. A default receipt series is auto-assigned if neither seriesId nor documentSeriesId is provided.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `clientId` | string | No | UUID of the client (optional for receipts) |
| `seriesId` | string | No | UUID of the receipt series (uses default series if not provided) |
| `documentSeriesId` | string | No | UUID of the document series to use (alternative to seriesId; uses default receipt series if neither is provided) |
| `issueDate` | string | Yes | Date of issue (YYYY-MM-DD) |
| `currency` | string | Yes | Currency code (e.g., RON, EUR, USD) |
| `exchangeRate` | number | No | Exchange rate to base currency (default: 1.0 for RON) |
| `paymentMethod` | enum(cash, card, meal_ticket, mixed) | No | Payment method used for the transaction |
| `cashPayment` | number | No | Amount paid in cash (for mixed payments) |
| `cardPayment` | number | No | Amount paid by card (for mixed payments) |
| `otherPayment` | number | No | Amount paid by other method, e.g. meal ticket (for mixed payments) |
| `cashRegisterName` | string | No | Name or identifier of the cash register / fiscal printer |
| `fiscalNumber` | string | No | Fiscal receipt number assigned by the cash register |
| `customerName` | string | No | Customer name (when no clientId is provided) |
| `customerCif` | string | No | Customer tax ID / CIF (when no clientId is provided) |
| `projectReference` | string | No | Related project or order reference |
| `issuerName` | string | No | Name of person issuing the receipt |
| `issuerId` | string | No | UUID of the issuer user |
| `salesAgent` | string | No | Sales agent name |
| `notes` | string | No | Public notes on the receipt |
| `mentions` | string | No | Additional mentions or instructions |
| `internalNote` | string | No | Internal note (not visible to customer) |
| `lines` | array | Yes | Array of line items (minimum 1 required) |

### `receipts_update`

Update an existing receipt. Receipts in draft or issued status can be updated. Replaces all line items with the provided array.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the receipt to update |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `clientId` | string | No | UUID of the client (optional for receipts) |
| `seriesId` | string | No | UUID of the receipt series |
| `documentSeriesId` | string | No | UUID of the document series to use (alternative to seriesId) |
| `issueDate` | string | Yes | Date of issue (YYYY-MM-DD) |
| `currency` | string | Yes | Currency code (e.g., RON, EUR, USD) |
| `exchangeRate` | number | No | Exchange rate to base currency |
| `paymentMethod` | enum(cash, card, meal_ticket, mixed) | No | Payment method used for the transaction |
| `cashPayment` | number | No | Amount paid in cash (for mixed payments) |
| `cardPayment` | number | No | Amount paid by card (for mixed payments) |
| `otherPayment` | number | No | Amount paid by other method, e.g. meal ticket (for mixed payments) |
| `cashRegisterName` | string | No | Name or identifier of the cash register / fiscal printer |
| `fiscalNumber` | string | No | Fiscal receipt number assigned by the cash register |
| `customerName` | string | No | Customer name (when no clientId is provided) |
| `customerCif` | string | No | Customer tax ID / CIF (when no clientId is provided) |
| `projectReference` | string | No | Related project or order reference |
| `issuerName` | string | No | Name of person issuing the receipt |
| `issuerId` | string | No | UUID of the issuer user |
| `salesAgent` | string | No | Sales agent name |
| `notes` | string | No | Public notes on the receipt |
| `mentions` | string | No | Additional mentions or instructions |
| `internalNote` | string | No | Internal note (not visible to customer) |
| `lines` | array | Yes | Array of line items (replaces all existing lines) |

### `receipts_delete`

Permanently delete a receipt. Only draft receipts can be deleted. Use cancel for issued receipts to preserve the audit trail.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the receipt to delete |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `receipts_issue`

Mark a receipt as issued at the point of sale. Transitions status from draft to issued. Once issued, the receipt becomes read-only and its fiscal data is locked.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the receipt to mark as issued |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `receipts_cancel`

Cancel a receipt. Can be cancelled from draft or issued status. Preserves the historical record unlike deletion. Optionally provide a cancellation reason.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the receipt to cancel |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `cancellationReason` | string | No | Reason for cancellation |
| `cancellationNotes` | string | No | Internal notes about the cancellation |

### `receipts_convert_to_invoice`

Convert an issued receipt into a final invoice. Creates a new invoice with all receipt data, marks the receipt as invoiced, and establishes a link between the two documents. Returns both the new invoice and updated receipt.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the issued receipt to convert to an invoice |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `invoiceSeriesId` | string | No | UUID of the invoice series to use (if different from receipt series) |
| `issueDate` | string | No | Override issue date for the new invoice (default: today, YYYY-MM-DD) |
| `dueDate` | string | No | Due date for the new invoice (YYYY-MM-DD) |

### `receipts_pdf`

Download the PDF for a receipt (bon fiscal). Returns base64-encoded PDF binary data. The receipt must be in issued or invoiced status.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the receipt |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `receipts_restore`

Restore a cancelled receipt back to draft status. Only cancelled receipts can be restored. This reverses the cancellation and allows the receipt to be re-issued.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the cancelled receipt to restore |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `receipts_email`

Send a receipt (bon fiscal) to a customer via email with the PDF attached. Supports custom subject, body, CC, and BCC recipients.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the receipt to send |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `to` | string | Yes | Recipient email address |
| `subject` | string | No | Email subject (auto-generated if omitted) |
| `body` | string | No | Email body text (auto-generated if omitted) |
| `cc` | array | No | CC email addresses |
| `bcc` | array | No | BCC email addresses |

### `receipts_email_defaults`

Get pre-filled email content for a receipt including default recipient, subject, and body text with template variables already substituted.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the receipt |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `receipts_email_history`

Get the email sending history for a receipt, including all sent emails with their status, timestamps, and recipient information.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the receipt |
| `companyId` | string | No | Company UUID (overrides configured default) |

---

## Suppliers

### `suppliers_list`

List suppliers for the selected company grouped alphabetically. Suppliers are automatically created from incoming invoices via ANAF e-Factura synchronization. Supports search by name, CUI, or email.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 50, max: 200) |
| `search` | string | No | Search term to filter by name, CUI, or email |

### `suppliers_create`

Create a new supplier manually. Requires name, county, city, address, and registration number. If a supplier with the same CIF already exists, returns the existing supplier instead.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `name` | string | Yes | Supplier name |
| `cif` | string | No | Tax identification number (CIF) |
| `vatCode` | string | No | VAT code (e.g., RO12345678) |
| `isVatPayer` | boolean | No | Whether supplier is a VAT payer (default: false) |
| `registrationNumber` | string | Yes | Trade registry number (e.g., J40/123/2020) |
| `address` | string | Yes | Street address |
| `city` | string | Yes | City |
| `county` | string | Yes | County |
| `country` | string | No | Country code ISO 3166-1 alpha-2 (default: RO) |
| `postalCode` | string | No | Postal code |
| `email` | string | No | Email address |
| `phone` | string | No | Phone number |
| `bankName` | string | No | Bank name |
| `bankAccount` | string | No | Bank account (IBAN) |
| `notes` | string | No | Internal notes |

### `suppliers_get`

Get detailed information about a specific supplier including invoice history summary and the last 10 recent incoming invoices. Core data (name, CUI) comes from ANAF and is read-only.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the supplier to retrieve |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `suppliers_update`

Update editable fields of a supplier record. Core data (name, CUI) from ANAF cannot be modified. Only contact information, address details, banking details, and internal notes can be updated.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the supplier to update |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `email` | nullable string | No | Email address |
| `phone` | nullable string | No | Phone number |
| `address` | nullable string | No | Street address |
| `city` | nullable string | No | City |
| `county` | nullable string | No | County |
| `country` | string | No | Country code (ISO 3166-1 alpha-2, e.g., "RO") |
| `postalCode` | nullable string | No | Postal code |
| `bankName` | nullable string | No | Bank name |
| `bankAccount` | nullable string | No | Bank account (IBAN) |
| `notes` | nullable string | No | Internal notes about this supplier |

### `suppliers_delete`

Soft-delete a supplier record. The supplier is marked as deleted but not permanently removed. Existing incoming invoices from this supplier remain intact. If new invoices arrive from this supplier via ANAF sync, the supplier record will be restored automatically.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the supplier to delete |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `suppliers_export_csv`

Export all suppliers for the active company as a CSV file. Returns base64-encoded UTF-8 CSV with BOM.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |

### `suppliers_export_saga_xml`

Export all suppliers in SAGA accounting XML format. Returns base64-encoded XML file compatible with SAGA import.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |

### `suppliers_bulk_delete`

Soft-delete multiple suppliers in a single request. Returns the count of deleted items and any errors.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `ids` | array | Yes | Array of supplier UUIDs to delete (1-100) |
| `companyId` | string | No | Company UUID (overrides configured default) |

---

## Exchange Rates

### `exchange_rates_list`

Get current BNR (Banca Nationala a Romaniei) exchange rates. Rates are updated daily around 13:00 EET. Returns rates for all supported currencies expressed as: 1 foreign currency = X RON. On weekends and holidays, the last available rates are returned.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `date` | string | No | Specific date for rates (YYYY-MM-DD, defaults to latest available rates) |

### `exchange_rates_convert`

Convert an amount between two currencies using current BNR exchange rates. For non-RON to non-RON conversions, cross-rates through RON are calculated. Result is rounded to 2 decimal places.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `from` | string | Yes | Source currency code (ISO 4217, e.g., EUR, USD, RON) |
| `to` | string | Yes | Target currency code (ISO 4217, e.g., RON, EUR, USD) |
| `amount` | number | Yes | Amount to convert |
| `date` | string | No | Specific date for exchange rate (YYYY-MM-DD, defaults to latest rates) |

---

## Email Templates

### `email_templates_list`

List all email templates configured for the selected company. Templates support dynamic variables like {{invoice_number}}, {{client_name}}, {{total}}, {{currency}}, {{due_date}}, {{issue_date}}, {{company_name}}. If no templates exist, a default template is automatically created.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |

### `email_templates_create`

Create a new email template for invoice communications. Templates support dynamic variables ({{invoice_number}}, {{client_name}}, {{total}}, {{currency}}, {{due_date}}, {{issue_date}}, {{company_name}}) that are replaced with actual data when emails are sent.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `name` | string | Yes | Template name for internal reference |
| `subject` | string | Yes | Email subject line (supports variables like {{invoice_number}}) |
| `body` | string | Yes | Email body content (supports variables and HTML formatting) |
| `isDefault` | boolean | No | Set as default template (default: false). Only one template can be default |

### `email_templates_update`

Update an existing email template. All fields are optional but at least one must be provided. Setting isDefault to true will unset the current default template.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the email template to update |
| `companyId` | string | No | Company UUID (overrides configured default) |
| `name` | string | No | Template name for internal reference |
| `subject` | string | No | Email subject line (supports variables) |
| `body` | string | No | Email body content (supports variables and HTML formatting) |
| `isDefault` | boolean | No | Set as default template. Only one template can be default at a time |

### `email_templates_delete`

Permanently delete an email template. Cannot delete the last remaining template or the default template (set another as default first). Emails already sent using this template are not affected.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the email template to delete |
| `companyId` | string | No | Company UUID (overrides configured default) |

---

## E-Invoicing (Multi-Country)

Unified e-invoicing tools supporting 5 EU countries: Romania (ANAF e-Factura), Germany (XRechnung), Italy (SDI), Poland (KSeF), and France (Factur-X). For ANAF-specific token management and sync, see [ANAF Integration](#anaf-integration).

### `einvoice_providers`

List all available e-invoicing providers. Returns provider identifiers, labels, and country codes.

*No parameters required.*

**Returns:** Array of providers with `value`, `label`, and `country` fields.

### `einvoice_submit`

Submit an invoice to an e-invoicing provider. Supports all EU providers: anaf (Romania e-Factura), xrechnung (Germany), sdi (Italy), ksef (Poland), facturx (France). For ANAF, uses the existing e-Factura submission flow. For other providers, generates country-specific XML and optionally submits via API if credentials are configured.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the invoice to submit |
| `provider` | enum(anaf, xrechnung, sdi, ksef, facturx) | Yes | E-invoicing provider |
| `companyId` | string | No | Company UUID (overrides configured default) |

**Provider details:**

| Provider | Country | Format | API |
|----------|---------|--------|-----|
| `anaf` | Romania | UBL 2.1 (CIUS-RO) | ANAF SPV (via existing e-Factura flow) |
| `xrechnung` | Germany | UBL 2.1 (XRechnung 3.0) | ZRE (optional, needs credentials) |
| `sdi` | Italy | FatturaPA XML | SDI (optional, needs cert or intermediary) |
| `ksef` | Poland | FA(2) XML | KSeF REST API (optional, needs auth token) |
| `facturx` | France | CII XML (Factur-X) | Chorus Pro (optional, B2G only) |

### `einvoice_submissions`

List all e-invoice submissions for a specific invoice. Shows submission history across all providers with status, external IDs, error messages, and metadata. Note: ANAF submissions are tracked separately via the existing e-Factura flow.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the invoice |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `einvoice_config_list`

List all e-invoice provider configurations for a company. Shows which providers are enabled and their settings.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |

**Provider-specific config fields:**

| Provider | Config Fields |
|----------|--------------|
| `anaf` | Managed via ANAF tokens (see `anaf_tokens`) |
| `xrechnung` | `clientId`, `clientSecret` (for ZRE API) |
| `sdi` | `certPath`, `certPassword` (direct) or `apiEndpoint`, `apiKey` (intermediary) |
| `ksef` | `authToken`, `nip` |
| `facturx` | `clientId`, `clientSecret`, `siret` (for Chorus Pro) |

### `einvoice_config_save`

Create or update an e-invoice provider configuration for a company. Use this to enable a provider and set API credentials.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `provider` | enum(anaf, xrechnung, sdi, ksef, facturx) | Yes | E-invoicing provider to configure |
| `enabled` | boolean | No | Whether this provider is active (default: true) |
| `config` | object | No | Provider-specific configuration as JSON object |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `einvoice_config_delete`

Delete an e-invoice provider configuration for a company. Removes the provider settings and disables submissions. Existing submissions are not affected.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `provider` | enum(anaf, xrechnung, sdi, ksef, facturx) | Yes | E-invoicing provider to remove |
| `companyId` | string | No | Company UUID (overrides configured default) |

### `einvoice_config_test`

Test e-invoice provider connection with given credentials before saving. Validates that the credentials can authenticate with the provider's API. ANAF uses a separate OAuth flow and cannot be tested here.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `provider` | enum(xrechnung, sdi, ksef, facturx) | Yes | E-invoicing provider to test |
| `config` | object | Yes | Provider-specific credentials to test |
| `companyId` | string | No | Company UUID (overrides configured default) |

**Config fields per provider:**

| Provider | Required Config |
|----------|----------------|
| `xrechnung` | `{clientId, clientSecret}` |
| `sdi` | `{apiEndpoint, apiKey}` (intermediary) or `{certPassword}` (direct) |
| `ksef` | `{authToken, nip}` |
| `facturx` | `{clientId, clientSecret}` |

**Returns:** `{success: boolean, error: string|null}`

---

## ANAF Integration

### `anaf_status`

Check the current ANAF integration status for the authenticated user. Returns token count, overall validity, and per-token details including CIF, expiry, and validity for each saved ANAF token.

*No parameters required.*

### `anaf_tokens`

List all ANAF OAuth tokens associated with the authenticated user. Each token enables e-Factura synchronization for a specific company CIF. Returns token ID, CIF, expiry, and validity status.

*No parameters required.*

### `anaf_create_token_link`

Create a device-based authentication token link for completing the ANAF OAuth flow. Returns a unique URL that can be opened in a browser to complete ANAF authentication. Maximum 5 active links per user. Link expires after a short period.

*No parameters required.*

### `anaf_delete_token`

Delete an ANAF OAuth token. This revokes e-Factura synchronization access for the CIF associated with this token. The token ID is an integer obtained from anaf_tokens.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | number | Yes | The ANAF token ID to delete (integer ID from anaf_tokens) |

### `anaf_validate_cif`

Validate that an ANAF token has proper access to e-Factura for a specific CIF. Checks organization ownership, ANAF registry, and e-Factura access permissions. Returns validation result with any error messages.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | number | Yes | The ANAF token ID to validate (integer ID from anaf_tokens) |

### `anaf_sync_trigger`

Manually trigger e-Factura synchronization for all companies with valid ANAF tokens. Validates token availability and subscription plan rate limits, then dispatches an async sync job to fetch new invoices from ANAF SPV.

*No parameters required.*

### `anaf_sync_status`

Get the current e-Factura synchronization status and configuration. Returns whether sync is enabled, the last successful sync timestamp, token validity, and the sync frequency interval.

*No parameters required.*

### `anaf_sync_log`

Retrieve the recent e-Factura sync activity log showing the last 50 synced invoices. Each entry shows the invoice ID, company CIF, sync timestamp, and status (success, failed, or skipped).

*No parameters required.*

---

## e-Factura Messages

### `efactura_messages_list`

List e-Factura messages from the ANAF SPV platform with pagination and filtering. Messages include responses to uploaded invoices, notifications (accepted/rejected), errors, warnings, and informational messages. Useful for troubleshooting invoice upload issues.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20, max: 100) |
| `messageType` | enum(response, notification, error, warning, info) | No | Filter by message type |
| `status` | enum(ok, error, warning, pending) | No | Filter by message status |

### `efactura_messages_get`

Get full details of a specific e-Factura message including both parsed details and raw ANAF response data. Includes related invoice information when available. Useful for diagnosing specific invoice upload errors.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | UUID of the e-Factura message to retrieve |

---

## Dashboard

### `dashboard_stats`

Get comprehensive dashboard statistics for the selected company. Returns invoice counts (total, draft, issued, paid, overdue), revenue amounts (total revenue, VAT, paid, unpaid), monthly breakdown, top clients, top products, recent activity, and payment summary. Supports predefined periods (month, quarter, year) or custom date ranges.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides configured default) |
| `period` | enum(month, quarter, year) | No | Predefined time period for statistics |
| `from` | string | No | Custom start date (YYYY-MM-DD), used instead of period |
| `to` | string | No | Custom end date (YYYY-MM-DD), used instead of period |

---

## Members

### `members_list`

List all members of the organization with their roles, active status, and allowed company access. Only organization admins and owners can list members.

*No parameters required.*

### `members_update`

Update a member's role, active status, allowed company access, and custom permissions. Cannot change role to OWNER or modify the organization owner. Roles: ADMIN, ACCOUNTANT, EMPLOYEE. Pass permissions as an array of permission strings to set custom permissions, or null to reset to role defaults.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Member UUID to update |
| `role` | enum(ADMIN, ACCOUNTANT, EMPLOYEE) | No | New role for the member: ADMIN, ACCOUNTANT, or EMPLOYEE |
| `isActive` | boolean | No | Whether the member is active. Deactivated members cannot log in. |
| `allowedCompanies` | array | No | Array of company UUIDs the member is allowed to access |
| `permissions` | array\|null | No | Custom permissions array (e.g. `["company.view","invoice.create"]`). Pass `null` to reset to role defaults. |

### `members_delete`

Deactivate (soft-delete) a member from the organization. Preserves historical data but prevents login. Cannot deactivate yourself, the organization owner, or super admins.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Member UUID to deactivate |

### `members_permissions_reference`

Get the permissions reference: all available permissions grouped by category, and role default permissions for each role (owner, admin, accountant, employee). Useful for understanding which permissions exist before setting custom permissions on a member.

*No parameters required.*

---

## Invitations

### `invitations_list`

List all pending invitations for the organization. Only returns invitations that have not yet been accepted. Only organization admins and owners can view invitations.

*No parameters required.*

### `invitations_create`

Invite a new user to join the organization by email. An invitation email is sent automatically. Invitations expire after 7 days. Roles: ADMIN, ACCOUNTANT, EMPLOYEE (cannot invite as OWNER).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `email` | string | Yes | Email address of the user to invite |
| `role` | enum(ADMIN, ACCOUNTANT, EMPLOYEE) | Yes | Role to assign to the invited user: ADMIN, ACCOUNTANT, or EMPLOYEE |

### `invitations_delete`

Cancel a pending invitation. The invitation token is immediately invalidated and cannot be used. Cannot cancel invitations that have already been accepted.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invitation UUID to cancel |

### `invitations_resend`

Resend the invitation email for a pending invitation. Does not extend the expiration date. If the invitation has expired, cancel it and create a new one instead.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Invitation UUID to resend |

---

## Notifications

### `notifications_list`

Retrieve a paginated list of notifications for the authenticated user. Notification types include: invoice_received, invoice_paid, sync_completed, sync_failed, token_expiring, token_expired, payment_overdue, invitation_received.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `page` | number | No | Page number for pagination (default: 1) |
| `limit` | number | No | Number of items per page (default: 20, max: 100) |

### `notifications_unread_count`

Get the count of unread notifications for the authenticated user. This lightweight endpoint is suitable for polling to update notification badges.

*No parameters required.*

### `notifications_read_all`

Mark all notifications as read for the authenticated user in a single operation. Resets the unread count to zero. This operation is idempotent.

*No parameters required.*

### `notifications_mark_read`

Mark a specific notification as read. This operation is idempotent — marking an already-read notification has no error. Decrements the unread count by one.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Notification UUID to mark as read |

### `notification_preferences_get`

Get the authenticated user's notification preferences for all event types. Returns per-event settings for email, in-app, push, and WhatsApp channels.

*No parameters required.*

### `notification_preferences_update`

Update notification preferences for specific event types. Event types include: invoice.validated, invoice.rejected, invoice.due_soon, invoice.due_today, invoice.overdue, sync.completed, sync.error, efactura.new_documents, token.expiring_soon, token.refresh_failed, export_ready.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `preferences` | array | Yes | Array of preference objects with eventType, emailEnabled, inAppEnabled, pushEnabled, whatsappEnabled |

---

## Webhooks

### `webhooks_list`

List all webhook endpoints configured for the current company. Secrets are masked in the listing. Requires X-Company header (companyId param or STORNO_COMPANY_ID env var).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `webhooks_get`

Retrieve the full configuration of a single webhook endpoint. The secret is always masked in this response — use webhooks_regenerate_secret to obtain a new full secret.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Webhook endpoint UUID |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `webhooks_create`

Register a new webhook endpoint for the current company. The response includes the full signing secret — store it securely immediately as it will be masked in all subsequent responses. URL must use HTTPS. Use ["*"] for events to subscribe to all event types.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | string | Yes | HTTPS destination URL that will receive POST requests from Storno |
| `events` | array | Yes | Array of event type names to subscribe to (e.g. ["invoice.created", "invoice.validated"]). Use ["*"] to subscribe to all events. |
| `description` | string | No | Human-readable label for this webhook endpoint |
| `isActive` | boolean | No | Whether the webhook is active on creation (default: true) |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `webhooks_update`

Partially update an existing webhook endpoint. Only provided fields are changed. Providing events replaces the entire subscription list — send the complete desired set each time. URL must use HTTPS.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Webhook endpoint UUID to update |
| `url` | string | No | New HTTPS destination URL |
| `events` | array | No | Replacement list of event type names (replaces entire list, not additive). Use ["*"] for all events. |
| `description` | string | No | Updated human-readable label for this webhook endpoint |
| `isActive` | boolean | No | Enable (true) or pause (false) deliveries for this webhook |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `webhooks_delete`

Permanently delete a webhook endpoint and all its delivery history. This is a hard delete with no recovery. To pause deliveries temporarily, use webhooks_update with isActive: false instead.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Webhook endpoint UUID to permanently delete |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `webhooks_events`

List all available webhook event types that can be subscribed to, including their descriptions and categories (invoices, payments, clients, sync, proforma). Use this to discover valid event names for webhook configuration.

*No parameters required.*

### `webhooks_deliveries`

Retrieve a paginated list of delivery attempts for a webhook endpoint. Can filter by status (success/failed), event type, and date range. Use webhooks_delivery_detail to inspect full request/response payloads.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Webhook endpoint UUID |
| `page` | number | No | Page number for pagination (default: 1) |
| `limit` | number | No | Number of items per page (default: 20, max: 100) |
| `status` | enum(success, failed) | No | Filter by delivery status: success or failed |
| `eventType` | string | No | Filter by event type name (e.g. invoice.validated) |
| `from` | string | No | Start date filter in ISO 8601 format (YYYY-MM-DD) |
| `to` | string | No | End date filter in ISO 8601 format (YYYY-MM-DD) |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `webhooks_delivery_detail`

Retrieve the complete details of a single webhook delivery attempt, including the full request payload, request headers (with signature), and the full response received. Use this to debug failed deliveries.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Webhook endpoint UUID |
| `deliveryUuid` | string | Yes | Delivery attempt UUID |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `webhooks_regenerate_secret`

Issue a new HMAC-SHA256 signing secret for a webhook endpoint, immediately invalidating the previous one. The new secret is returned in full only in this response — store it securely. Update your endpoint verification logic before calling this in production.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Webhook endpoint UUID to regenerate the secret for |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `webhooks_test`

Send a synchronous test delivery to a webhook endpoint and return the outcome immediately. Uses a synthetic webhook.test event payload. The webhook must be active. The delivery is recorded in delivery history.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `uuid` | string | Yes | Webhook endpoint UUID to send the test delivery to |
| `eventType` | string | No | Override the test event type name (default: webhook.test) |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

---

## API Keys

### `api_keys_list`

List all API tokens for the authenticated user within the current organization. Returns both active and revoked tokens sorted by creation date, newest first. The raw token value is never included — only the tokenPrefix for identification.

*No parameters required.*

### `api_keys_scopes`

List all permission scopes available to the current user, grouped by category. Only scopes the user already holds are returned — useful for inspecting what permissions a token can be granted.

*No parameters required.*

---

## Reports

### `reports_vat`

Generate a detailed VAT (TVA) report for a specific month. Returns a summary of sales, purchases, VAT collected, VAT deductible, and net VAT due, along with per-invoice details. Requires X-Company header (companyId param or STORNO_COMPANY_ID env var).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `year` | number | Yes | Report year (e.g. 2026) |
| `month` | number | Yes | Report month (1–12) |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `reports_sales_analysis`

Generate a sales analysis report for a date range. Returns KPI summary (annual total, invoiced, collected, outstanding), monthly revenue trends, recent invoices, top clients, and top products. Requires X-Company header (companyId param or STORNO_COMPANY_ID env var).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dateFrom` | string | Yes | Start date in YYYY-MM-DD format (e.g. 2026-01-01) |
| `dateTo` | string | Yes | End date in YYYY-MM-DD format (e.g. 2026-02-26) |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `balance_analysis`

Get balance analysis (Analiza Balante) for a year. Returns financial indicators (revenue, expenses, profit, turnover, salaries, etc.), monthly evolution, profitability ratios, top expenses by account, and year-over-year comparison. Data comes from uploaded trial balance PDFs. Requires X-Company header.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `year` | number | Yes | Analysis year (e.g. 2025) |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `balance_list`

List uploaded trial balances (Balante de verificare) for a year. Shows upload status (pending/processing/completed/failed), month, account count, and source software for each uploaded balance.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `year` | number | Yes | Year to list balances for (e.g. 2025) |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `balance_rows`

Get the parsed account rows for a trial balance. Returns all account codes, names, and 10 numeric columns (initial/previous/current/total/final debit & credit). Useful for verifying PDF parsing results.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Trial balance UUID |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `balance_reprocess`

Reprocess a trial balance PDF. Re-parses the PDF file and updates the account rows. Useful after parser improvements.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Trial balance UUID to reprocess |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

### `balance_delete`

Delete an uploaded trial balance by ID. This soft-deletes the balance and its parsed account rows.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Trial balance UUID to delete |
| `companyId` | string | No | Company UUID (overrides STORNO_COMPANY_ID env var) |

---

## Exports

### `exports_download`

Download a generated export file (ZIP archive). Export files are single-use and auto-deleted after download. The filename is typically provided by the endpoint that generated the export (e.g. POST /api/v1/invoices/export). Common formats: invoices-export-YYYY-MM.zip, vat-report-YYYY-MM.zip, clients-export-YYYY-MM-DD.zip.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filename` | string | Yes | Export filename to download (e.g. "invoices-export-2026-02.zip"). Obtained from the export generation endpoint response. |

---

## Admin

### `admin_organizations`

List all organizations on the platform with pagination and filtering. SUPER_ADMIN only. Returns organization details including owner info, subscription plan, member/company/invoice counts, and ANAF token status.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `page` | number | No | Page number for pagination (default: 1) |
| `limit` | number | No | Items per page (default: 50, max: 200) |
| `search` | string | No | Search by organization name or owner name/email |
| `status` | enum(active, trial, suspended) | No | Filter by organization status: active, trial, or suspended |
| `plan` | string | No | Filter by subscription plan type |

### `admin_stats`

Get platform-wide statistics including user counts, organization metrics, company sync status, invoice totals, and system info. SUPER_ADMIN only. Results are typically cached for 5 minutes.

*No parameters required.*

### `admin_users`

List all users on the platform with pagination and filtering. SUPER_ADMIN only. Returns user account details, verification status, role, last login timestamp, and organization memberships.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `page` | number | No | Page number for pagination (default: 1) |
| `limit` | number | No | Items per page (default: 50, max: 200) |
| `search` | string | No | Search by user name or email address |
| `status` | enum(active, inactive, verified, unverified) | No | Filter by user status: active, inactive, verified, or unverified |
| `role` | string | No | Filter by user system role |

---

## Licensing

### `licensing_create_key`

Generate a new license key for a self-hosted Storno instance. Only the organization owner can create license keys. The full 64-character license key is returned ONLY ONCE — store it immediately. Each self-hosted instance should use its own key.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `instanceName` | string | No | Human-readable name for the self-hosted instance (e.g. "Production", "Staging") |

### `licensing_list_keys`

List all license keys issued for the current organization. Keys are returned with masked values (first and last 8 characters shown). Includes active and revoked keys with lastValidatedAt timestamps to verify self-hosted instances are running. Only the organization owner can list keys.

*No parameters required.*

### `licensing_revoke_key`

Revoke (deactivate) a license key. The associated self-hosted instance will fall back to the Free plan on its next validation cycle (within 24 hours). Revocation is a soft delete — the key record is kept with active: false. Revoked keys cannot be reactivated; generate a new key instead. Only the organization owner can revoke keys.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | UUID of the license key to revoke |

### `licensing_validate`

Validate a self-hosted license key and retrieve the current plan, features, and subscription details. This endpoint does NOT require authentication — the license key itself is the credential. Returns plan features, organization name, billing period end, and trial info if applicable. Used by self-hosted instances every 24 hours.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `licenseKey` | string | Yes | 64-character hex license key issued for the self-hosted instance |
| `instanceName` | string | No | Human-readable name for this self-hosted instance (stored for identification) |
| `instanceUrl` | string | No | Public URL of the self-hosted instance (stored for identification in the dashboard) |

---

## Company Registry

### `company_registry_search`

Search the Romanian company registry (ONRC) by company name. Returns matching companies with CUI, name, and registration details. Useful for finding a company before creating a client.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `q` | string | Yes | Search query (company name, minimum 2 characters) |
| `limit` | number | No | Maximum results to return (default: 10) |

### `company_registry_cities`

Get a list of cities for a given Romanian county. Optionally filter by city name. Useful for address auto-complete.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `county` | string | Yes | County code or name (e.g., "B" for Bucharest, "CJ" for Cluj) |
| `q` | string | No | Optional search query to filter cities |

---

## System

### `system_health`

Check the Storno API system health status. Returns database, queue, storage, and service diagnostics when authenticated.

*No parameters required.*

### `system_version`

Get the Storno API version information including release date, minimum requirements, and changelog URL.

*No parameters required.*

---

## Accounting Export

### `accounting_export_settings_get`

Get the accounting export configuration for the active company. Returns settings for Saga, Winmentor, and Ciel accounting software integrations.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `accounting_export_settings_update`

Update accounting export configuration. Settings are merged with existing config.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `settings` | object | Yes | Accounting export settings to merge |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `accounting_export_zip`

Export accounting data as a ZIP archive for import into accounting software (Saga, Winmentor, or Ciel). Contains XML files for clients, suppliers, products, invoices, receipts, and payments.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `target` | enum(saga, winmentor, ciel) | Yes | Target accounting software format |
| `dateFrom` | string | No | Start date filter (YYYY-MM-DD) |
| `dateTo` | string | No | End date filter (YYYY-MM-DD) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## Backup

### `backup_create`

Create a new backup job for the active company. Processed asynchronously. Returns a job ID to check status.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `includeFiles` | boolean | No | Include uploaded files (PDFs, XMLs) in backup (default: true) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `backup_status`

Get the status of a backup job. Returns progress percentage, current step, and download URL when complete.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Backup job ID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `backup_download`

Download a completed backup as a ZIP file. Returns base64-encoded binary data.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Backup job ID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `backup_restore`

Upload a backup ZIP file to restore company data. Runs asynchronously.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | string | Yes | Absolute path to the backup ZIP file |
| `purgeExisting` | boolean | No | Delete all existing company data before restoring (default: false) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `backup_restore_status`

Get the status of a restore job.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Restore job ID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `backup_history`

List recent backup jobs for the active company.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | number | No | Number of results (max 50, default: 20) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## Borderou (Bank Reconciliation)

### `borderou_providers`

List available borderou (bank statement) providers and supported file formats.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `borderou_upload`

Upload a bank statement or borderou file (CSV, XLSX, XLS) for transaction import and reconciliation.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | string | Yes | Absolute path to the file (CSV, XLSX, or XLS) |
| `sourceType` | string | Yes | "borderou" or "bank_statement" |
| `provider` | string | Yes | Bank or provider name (from borderou_providers) |
| `currency` | string | No | Currency code (default: RON) |
| `bordereauNumber` | string | No | Borderou reference number |
| `bankAccountId` | string | No | Bank account UUID (for bank_statement type) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `borderou_transactions`

List borderou transactions with pagination.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `limit` | number | No | Items per page (default: 20) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `borderou_transaction_get`

Get detailed information about a specific borderou transaction.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Transaction ID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `borderou_transaction_update`

Update a borderou transaction match. Link to an invoice or proforma for reconciliation.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Transaction ID |
| `clientId` | string | No | Client UUID to match |
| `invoiceId` | string | No | Invoice UUID to match |
| `proformaInvoiceId` | string | No | Proforma invoice UUID to match |
| `amount` | number | No | Override matched amount |
| `documentType` | enum(invoice, proforma) | No | Document type for matching |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `borderou_transaction_available_invoices`

Get invoices or proformas available to match against a transaction.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Transaction ID |
| `search` | string | No | Search by invoice number, client name, or amount |
| `type` | enum(invoice, proforma) | No | Filter by document type |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `borderou_transactions_save`

Save selected borderou transaction matches. Creates payment records for matched transactions.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `transactionIds` | array | Yes | Array of transaction IDs to save |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `borderou_transactions_rematch`

Re-run automatic matching algorithm on selected transactions.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `transactionIds` | array | Yes | Array of transaction IDs to re-match |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## Storage Config

### `storage_config_get`

Get the organization's external storage configuration (S3-compatible bucket for PDFs/XMLs).

*No parameters required.*

### `storage_config_update`

Create or update external storage configuration. Supports S3-compatible providers (AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `provider` | string | Yes | Storage provider (e.g., "s3", "r2", "minio", "spaces") |
| `bucket` | string | Yes | Bucket name |
| `region` | string | No | AWS region (e.g., "eu-central-1") |
| `prefix` | string | No | Key prefix/folder path within the bucket |
| `endpoint` | string | No | Custom endpoint URL (for non-AWS providers) |
| `accessKeyId` | string | No | Access key ID |
| `secretAccessKey` | string | No | Secret access key |
| `accountId` | string | No | Account ID (for Cloudflare R2) |
| `forcePathStyle` | boolean | No | Use path-style URLs (for MinIO) |
| `isActive` | boolean | No | Enable or disable external storage |

### `storage_config_delete`

Delete the external storage configuration.

*No parameters required.*

### `storage_config_test`

Test the external storage connection by writing and reading a test file.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `provider` | string | No | Storage provider to test |
| `bucket` | string | No | Bucket name |
| `region` | string | No | AWS region |
| `endpoint` | string | No | Custom endpoint URL |
| `accessKeyId` | string | No | Access key ID |
| `secretAccessKey` | string | No | Secret access key |
| `accountId` | string | No | Account ID |
| `forcePathStyle` | boolean | No | Use path-style URLs |

### `storage_config_providers`

List available external storage providers with configuration requirements.

*No parameters required.*

---

## Import

### `import_sources`

Get available import sources and import types. Returns supported sources (SmartBill, Saga, Oblio, FGO, Facturis, etc.) and import types (clients, products, invoices).

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `import_preview`

Get a preview of an uploaded import job including detected columns and sample data.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Import job ID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `import_mapping`

Save column mapping for an import job. Maps CSV columns to Storno fields.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Import job ID |
| `columnMapping` | object | Yes | Object mapping CSV column names to Storno field names |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `import_execute`

Execute an import job after mapping is confirmed. Runs asynchronously.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Import job ID |
| `importOptions` | object | No | Optional import options (e.g., skipDuplicates) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `import_get`

Get full status and details of an import job including progress and error details.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Import job ID |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `import_upload`

Upload a file (CSV, XLSX, or XML) to start a new import job. Returns the created job with preview data.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `filePath` | string | Yes | Absolute path to the file (CSV, XLSX, or XML) |
| `importType` | string | Yes | Type: clients, products, invoices_issued, invoices_received, recurring_invoices |
| `source` | string | Yes | Source app: smartbill, saga, oblio, fgo, facturis_online, easybill, ciel, factureaza, facturare_pro, icefact, bolt, facturis, emag, generic |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `import_template`

Download a CSV template for a specific import type. Returns base64-encoded CSV.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `importType` | string | Yes | Type: clients, products, invoices_issued, invoices_received, recurring_invoices |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

### `import_history`

List past import jobs for the active company.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `limit` | number | No | Number of results (max 200, default: 50) |
| `companyId` | string | No | Company UUID override (uses active company if not set) |

---

## CPV Codes

### `cpv_codes_search`

Search CPV (Common Procurement Vocabulary) classification codes. Used in e-Transport declarations and public procurement.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `search` | string | Yes | Search query (CPV code number or description) |
| `limit` | number | No | Maximum results (max 100, default: 30) |

---

## NC Codes

### `nc_codes_search`

Search NC (Combined Nomenclature / NACE) classification codes. Used in e-Transport declarations for goods classification.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `search` | string | Yes | Search query (NC code number or description) |
| `limit` | number | No | Maximum results (max 100, default: 30) |

---

**Total tools: 234**

Generated from storno-cli source on 2026-02-24