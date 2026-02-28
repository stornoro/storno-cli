#!/usr/bin/env node

/**
 * Storno MCP Server
 *
 * A Model Context Protocol server that exposes the Storno.ro e-invoicing API
 * as AI-callable tools. Works with Claude Code, Cursor, Windsurf, and any
 * MCP-compatible AI assistant.
 *
 * Configuration (environment variables):
 *   STORNO_BASE_URL      — API base URL (default: https://api.storno.ro)
 *   STORNO_TOKEN         — JWT access token
 *   STORNO_REFRESH_TOKEN — JWT refresh token (for auto-renewal)
 *   STORNO_COMPANY_ID    — Default company UUID
 *   STORNO_EMAIL         — Email for auto-login (optional)
 *   STORNO_PASSWORD      — Password for auto-login (optional)
 *
 * Usage:
 *   node dist/index.js              # Start MCP server (stdio transport)
 *
 * MCP Integration:
 *   Add to your claude_desktop_config.json or .claude/settings.json:
 *   {
 *     "mcpServers": {
 *       "storno": {
 *         "command": "node",
 *         "args": ["/path/to/storno-cli/dist/index.js"],
 *         "env": {
 *           "STORNO_BASE_URL": "https://api.storno.ro",
 *           "STORNO_TOKEN": "your-jwt-token",
 *           "STORNO_COMPANY_ID": "your-company-uuid"
 *         }
 *       }
 *     }
 *   }
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { getConfig, updateConfig } from './config.js';
import { apiRequest } from './client.js';

// Import all tool modules
import { tools as authTools } from './tools/auth.js';
import { tools as companiesTools } from './tools/companies.js';
import { tools as invoicesTools } from './tools/invoices.js';
import { tools as clientsTools } from './tools/clients.js';
import { tools as productsTools } from './tools/products.js';
import { tools as paymentsTools } from './tools/payments.js';
import { tools as defaultsTools } from './tools/defaults.js';
import { tools as vatRatesTools } from './tools/vat-rates.js';
import { tools as bankAccountsTools } from './tools/bank-accounts.js';
import { tools as documentSeriesTools } from './tools/document-series.js';
import { tools as proformaInvoicesTools } from './tools/proforma-invoices.js';
import { tools as recurringInvoicesTools } from './tools/recurring-invoices.js';
import { tools as deliveryNotesTools } from './tools/delivery-notes.js';
import { tools as suppliersTools } from './tools/suppliers.js';
import { tools as exchangeRatesTools } from './tools/exchange-rates.js';
import { tools as emailTemplatesTools } from './tools/email-templates.js';
import { tools as anafTools } from './tools/anaf.js';
import { tools as efacturaMessagesTools } from './tools/efactura-messages.js';
import { tools as einvoiceTools } from './tools/einvoice.js';
import { tools as dashboardTools } from './tools/dashboard.js';
import { tools as membersTools } from './tools/members.js';
import { tools as invitationsTools } from './tools/invitations.js';
import { tools as notificationsTools } from './tools/notifications.js';
import { tools as webhooksTools } from './tools/webhooks.js';
import { tools as apiKeysTools } from './tools/api-keys.js';
import { tools as reportsTools } from './tools/reports.js';
import { tools as exportsTools } from './tools/exports.js';
import { tools as adminTools } from './tools/admin.js';
import { tools as licensingTools } from './tools/licensing.js';
import { tools as pdfTemplateConfigTools } from './tools/pdf-template-config.js';
import { tools as receiptsTools } from './tools/receipts.js';
import { tools as companyRegistryTools } from './tools/company-registry.js';
import { tools as systemTools } from './tools/system.js';
import { tools as accountingExportTools } from './tools/accounting-export.js';
import { tools as backupTools } from './tools/backup.js';
import { tools as borderouTools } from './tools/borderou.js';
import { tools as storageConfigTools } from './tools/storage-config.js';
import { tools as importTools } from './tools/import.js';
import { tools as cpvCodesTools } from './tools/cpv-codes.js';
import { tools as ncCodesTools } from './tools/nc-codes.js';

interface ToolDef {
  name: string;
  description: string;
  inputSchema: z.ZodObject<z.ZodRawShape>;
  handler: (params: Record<string, unknown>) => Promise<string>;
}

// Collect all tools
const allTools: ToolDef[] = [
  ...authTools,
  ...companiesTools,
  ...invoicesTools,
  ...clientsTools,
  ...productsTools,
  ...paymentsTools,
  ...defaultsTools,
  ...vatRatesTools,
  ...bankAccountsTools,
  ...documentSeriesTools,
  ...proformaInvoicesTools,
  ...recurringInvoicesTools,
  ...deliveryNotesTools,
  ...suppliersTools,
  ...exchangeRatesTools,
  ...emailTemplatesTools,
  ...anafTools,
  ...efacturaMessagesTools,
  ...einvoiceTools,
  ...dashboardTools,
  ...membersTools,
  ...invitationsTools,
  ...notificationsTools,
  ...webhooksTools,
  ...apiKeysTools,
  ...reportsTools,
  ...exportsTools,
  ...adminTools,
  ...licensingTools,
  ...pdfTemplateConfigTools,
  ...receiptsTools,
  ...companyRegistryTools,
  ...systemTools,
  ...accountingExportTools,
  ...backupTools,
  ...borderouTools,
  ...storageConfigTools,
  ...importTools,
  ...cpvCodesTools,
  ...ncCodesTools,
];

async function main() {
  const server = new McpServer({
    name: 'storno',
    version: '1.0.0',
  });

  // Register all tools with the MCP server
  for (const tool of allTools) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema.shape,
      async (params) => {
        try {
          const result = await tool.handler(params as Record<string, unknown>);
          return {
            content: [{ type: 'text' as const, text: result }],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [{ type: 'text' as const, text: `Unexpected error: ${message}` }],
            isError: true,
          };
        }
      }
    );
  }

  // Auto-login if credentials are provided but no token
  const config = getConfig();
  if (!config.token && config.email && config.password) {
    const res = await apiRequest<{ token: string; refresh_token: string }>('/api/auth', {
      method: 'POST',
      body: { email: config.email, password: config.password },
      noAuth: true,
    });
    if (res.ok) {
      updateConfig({
        token: res.data.token,
        refreshToken: res.data.refresh_token,
      });
    }
  }

  // Start stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
