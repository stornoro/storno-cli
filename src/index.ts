#!/usr/bin/env node

/**
 * Storno MCP Server
 *
 * A Model Context Protocol server that exposes the Storno.ro e-invoicing API
 * as AI-callable tools. Works with Claude Code, Cursor, Windsurf, and any
 * MCP-compatible AI assistant.
 *
 * Transport modes:
 *   - stdio (default) — for local MCP clients (Claude Code, Cursor, etc.)
 *   - Streamable HTTP  — set STORNO_HTTP_PORT to enable remote access
 *
 * Configuration (environment variables):
 *   STORNO_BASE_URL      — API base URL (default: https://api.storno.ro)
 *   STORNO_TOKEN         — JWT access token
 *   STORNO_REFRESH_TOKEN — JWT refresh token (for auto-renewal)
 *   STORNO_COMPANY_ID    — Default company UUID
 *   STORNO_EMAIL         — Email for auto-login (optional)
 *   STORNO_PASSWORD      — Password for auto-login (optional)
 *   STORNO_HTTP_PORT     — If set, starts Streamable HTTP transport on this port
 *   STORNO_HTTP_HOST     — HTTP bind address (default: 127.0.0.1)
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { getConfig } from './config.js';
import { createMcpServer, autoLogin } from './server.js';
import { startHttpServer } from './http-server.js';

async function main() {
  await autoLogin();

  const config = getConfig();

  if (config.httpPort) {
    // Streamable HTTP transport — sessions are created on demand inside startHttpServer
    startHttpServer(config.httpPort, config.httpHost);
  } else {
    // Stdio transport (default)
    const server = createMcpServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
