# Storno CLI — MCP Server

A **Model Context Protocol (MCP) server** that exposes the entire [Storno.ro](https://storno.ro) e-invoicing API as AI-callable tools. Enables Claude Code, Cursor, Windsurf, and any MCP-compatible AI assistant to manage invoices, clients, companies, ANAF e-Factura, and more.

## Features

- **237 tools** covering all Storno.ro API endpoints
- Full invoice lifecycle: create, issue, submit to ANAF, email, download PDF/XML
- Proforma invoices, recurring invoices, delivery notes, credit notes
- Client & product catalog, payment tracking, VAT rates
- ANAF e-Factura integration (sync, token management, message retrieval)
- Multi-company support with company switching
- Automatic JWT token refresh
- Webhooks, API keys, team member management
- Exchange rates (BNR), reports, exports

## Quick Start

### 1. Install

```bash
npm install -g storno-cli
```

Or use directly with `npx` — no install needed.

### 2. Configure for Claude Code

Add to your project's `.claude/settings.json` or global `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "storno": {
      "command": "npx",
      "args": ["-y", "storno-cli"],
      "env": {
        "STORNO_TOKEN": "your-jwt-token",
        "STORNO_COMPANY_ID": "your-company-uuid"
      }
    }
  }
}
```

### 3. Configure for Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "storno": {
      "command": "npx",
      "args": ["-y", "storno-cli"],
      "env": {
        "STORNO_TOKEN": "your-jwt-token",
        "STORNO_COMPANY_ID": "your-company-uuid"
      }
    }
  }
}
```

### 4. Configure for Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "storno": {
      "command": "npx",
      "args": ["-y", "storno-cli"],
      "env": {
        "STORNO_TOKEN": "your-jwt-token",
        "STORNO_COMPANY_ID": "your-company-uuid"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORNO_BASE_URL` | No | `https://api.storno.ro` | API base URL |
| `STORNO_TOKEN` | No* | — | JWT access token |
| `STORNO_REFRESH_TOKEN` | No | — | JWT refresh token (for auto-renewal) |
| `STORNO_COMPANY_ID` | No* | — | Default company UUID |
| `STORNO_EMAIL` | No | — | Email for auto-login (if no token) |
| `STORNO_PASSWORD` | No | — | Password for auto-login (if no token) |

\* You can authenticate at runtime using the `auth_login` tool instead.

## Authentication

Three ways to authenticate:

### Option A: Pre-configured token (recommended for production)

Set `STORNO_TOKEN` in your MCP server environment config.

### Option B: Auto-login on startup

Set `STORNO_EMAIL` and `STORNO_PASSWORD`. The server will automatically log in when it starts and keep the token refreshed.

### Option C: Interactive login via AI

Ask the AI: *"Log me in to Storno with email user@example.com and password mypassword"*

The AI will call the `auth_login` tool, which stores the token in memory for the session.

## Multi-Company Support

All company-scoped tools require a company context. Three ways to provide it:

1. **Environment variable**: Set `STORNO_COMPANY_ID` in your MCP config
2. **Select command**: Ask the AI to call `companies_select` with a company UUID
3. **Per-request override**: Every company-scoped tool accepts an optional `companyId` parameter

Example AI conversation:
```
You: List my companies
AI: [calls companies_list] You have 2 companies:
  - ABC SRL (uuid: 550e8400...)
  - XYZ SRL (uuid: 661f9500...)

You: Switch to XYZ SRL
AI: [calls companies_select with uuid] Done, now using XYZ SRL

You: Show me recent invoices
AI: [calls invoices_list — automatically uses XYZ SRL context]
```

## Tool Reference

See [TOOLS.md](./TOOLS.md) for the complete reference of all 237 tools with descriptions and parameters.

### Tool Categories

| Category | Tools | Description |
|----------|-------|-------------|
| `auth_*` | 7 | Login, register, refresh tokens, profile management |
| `companies_*` | 8 | Company CRUD + context switching + ANAF settings |
| `invoices_*` | 32 | Full invoice lifecycle (create → issue → submit → email → PDF/XML) |
| `clients_*` | 10 | Client management (synced from e-Factura) |
| `products_*` | 2 | Product catalog |
| `payments_*` | 3 | Payment recording and tracking |
| `proforma_invoices_*` | 12 | Proforma lifecycle (create → send → accept/reject → convert) |
| `recurring_invoices_*` | 10 | Recurring invoice schedules |
| `delivery_notes_*` | 18 | Delivery note lifecycle + status management |
| `receipts_*` | 13 | Fiscal receipts (bonuri fiscale) + conversion to invoices |
| `vat_rates_*` | 4 | VAT rate CRUD |
| `bank_accounts_*` | 4 | Bank account CRUD |
| `document_series_*` | 5 | Invoice number series management |
| `suppliers_*` | 8 | Supplier management |
| `exchange_rates_*` | 2 | BNR exchange rates + currency conversion |
| `email_templates_*` | 4 | Email template CRUD |
| `anaf_*` | 8 | ANAF token management + e-Factura sync + validation |
| `efactura_messages_*` | 2 | e-Factura message retrieval |
| `einvoice_*` | 6 | Multi-country e-invoicing (EU-wide) |
| `dashboard_*` | 1 | Dashboard statistics |
| `defaults_*` | 1 | Invoice defaults (currencies, units, VAT rates) |
| `members_*` | 3 | Organization team members |
| `invitations_*` | 4 | Team invitations |
| `notifications_*` | 6 | Notification management + preferences |
| `webhooks_*` | 10 | Webhook CRUD + testing + delivery logs |
| `api_keys_*` | 5 | API token management |
| `reports_*` | 7 | VAT reports + financial reports |
| `exports_*` | 1 | Export file downloads |
| `import_*` | 8 | CSV/XLSX/XML import for clients, products, invoices |
| `borderou_*` | 8 | Bank reconciliation (borderou) |
| `backup_*` | 6 | Backup creation + restore |
| `admin_*` | 3 | System administration (requires admin role) |
| `licensing_*` | 4 | License key management |
| `pdf_template_*` | 4 | PDF invoice template customization |
| `storage_config_*` | 5 | File storage configuration |
| `accounting_export_*` | 3 | Export to accounting formats |
| `company_registry_*` | 2 | Company registry lookups |
| `cpv_codes_*` | 1 | CPV code lookup |
| `nc_codes_*` | 1 | NC code lookup |
| `system_*` | 2 | System health + version info |

## Common AI Workflows

### Create and send an invoice

```
You: Create an invoice for client Acme SRL, 10 hours web development at 100 RON/hour, due in 30 days

AI: [calls clients_list to find Acme SRL]
    [calls invoices_create with clientId, lines, dates]
    [calls invoices_issue to mark as issued]
    [calls invoices_email to send to client]
    Invoice FAC-2024-042 created, issued, and emailed to contact@acme.ro
```

### Check ANAF sync status

```
You: What's the ANAF sync status for my company?

AI: [calls anaf_status]
    Last sync: 2 hours ago, 156 invoices synced, token valid until March 16
```

### Generate a monthly report

```
You: Show me all invoices from January 2024

AI: [calls invoices_list with from=2024-01-01, to=2024-01-31]
    Found 23 invoices, total: 45,230 RON
    - 18 issued, 3 paid, 2 overdue
```

## Development

```bash
npm run dev      # Watch mode (recompile on changes)
npm run build    # Production build
npm run start    # Start MCP server
```

## Architecture

```
storno-cli/
├── src/
│   ├── index.ts          # MCP server entry point (stdio transport)
│   ├── config.ts         # Environment configuration
│   ├── client.ts         # HTTP client with JWT auth + auto-refresh
│   ├── tools/            # 40 tool domain files (237 tools total)
│   │   ├── auth.ts
│   │   ├── invoices.ts   # Largest: 32 tools for full invoice lifecycle
│   │   ├── companies.ts
│   │   └── ...           # 37 more domain files
│   └── utils/
│       ├── errors.ts     # AI-readable error formatting
│       └── pagination.ts # Pagination helpers
├── dist/                 # Compiled JavaScript output
├── package.json
├── tsconfig.json
├── README.md             # This file
└── TOOLS.md              # Complete tool reference
```

## Requirements

- Node.js >= 20.0.0
- npm

## License

Private — Storno.ro
