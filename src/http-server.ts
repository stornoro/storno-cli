/**
 * Streamable HTTP transport for the Storno MCP server.
 *
 * Implements the MCP Streamable HTTP spec using raw node:http (no new deps).
 * Each session gets its own StreamableHTTPServerTransport + McpServer pair.
 *
 * Supports two modes:
 * - Self-hosted: global token from STORNO_TOKEN, no per-session auth needed
 * - SaaS: each client sends its own Bearer token, stored per-session
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createMcpServer } from './server.js';
import { getConfig } from './config.js';

interface Session {
  transport: StreamableHTTPServerTransport;
  token?: string;
}

const sessions = new Map<string, Session>();

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id, Authorization');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
}

function jsonError(res: ServerResponse, status: number, code: number, message: string, headers?: Record<string, string>): void {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers });
  res.end(JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null }));
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/** Extract Bearer token from Authorization header. */
function extractBearerToken(req: IncomingMessage): string | undefined {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return undefined;
}

/** Set req.auth so the MCP SDK passes it as extra.authInfo to tool callbacks. */
function setReqAuth(req: IncomingMessage, token: string): void {
  (req as unknown as { auth: { token: string; clientId: string; scopes: string[] } }).auth = {
    token,
    clientId: 'mcp',
    scopes: [],
  };
}

/** Build the public base URL for this MCP server (used in OAuth metadata). */
function getPublicBaseUrl(req: IncomingMessage): string {
  // Trust X-Forwarded headers from nginx/Cloudflare
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers['host'] || 'localhost';
  return `${proto}://${host}`;
}

/** Build WWW-Authenticate header value for 401 responses. */
function wwwAuthenticateHeader(req: IncomingMessage): string {
  const baseUrl = getPublicBaseUrl(req);
  return `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`;
}

async function handlePost(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const config = getConfig();
  let body: unknown;
  try {
    body = await readBody(req);
  } catch {
    jsonError(res, 400, -32700, 'Parse error');
    return;
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  const bearerToken = extractBearerToken(req);

  if (sessionId && sessions.has(sessionId)) {
    // Existing session — set req.auth from stored token and forward
    const session = sessions.get(sessionId)!;
    if (session.token) {
      setReqAuth(req, session.token);
    }
    await session.transport.handleRequest(req, res, body);
    return;
  }

  if (!sessionId && isInitializeRequest(body)) {
    // Require auth if no global token is configured (SaaS mode)
    if (!config.token && !bearerToken) {
      jsonError(res, 401, -32001, 'Authentication required', {
        'WWW-Authenticate': wwwAuthenticateHeader(req),
      });
      return;
    }

    // New session
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        sessions.set(sid, { transport, token: bearerToken });
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) sessions.delete(sid);
    };

    if (bearerToken) {
      setReqAuth(req, bearerToken);
    }

    const server = createMcpServer();
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
    return;
  }

  // Invalid — no session or not an init request
  jsonError(res, 400, -32000, 'Bad Request: No valid session ID provided');
}

async function handleGet(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    jsonError(res, 400, -32000, 'Invalid or missing session ID');
    return;
  }
  const session = sessions.get(sessionId)!;
  if (session.token) {
    setReqAuth(req, session.token);
  }
  await session.transport.handleRequest(req, res);
}

async function handleDelete(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    jsonError(res, 400, -32000, 'Invalid or missing session ID');
    return;
  }
  const session = sessions.get(sessionId)!;
  await session.transport.handleRequest(req, res);
}

/** RFC 9728 — Protected Resource Metadata. */
function handleProtectedResourceMetadata(req: IncomingMessage, res: ServerResponse): void {
  const config = getConfig();
  if (!config.oauthBaseUrl) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const baseUrl = getPublicBaseUrl(req);
  const metadata = {
    resource: baseUrl,
    authorization_servers: [baseUrl],
    bearer_methods_supported: ['header'],
    scopes_supported: [],
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(metadata));
}

/** RFC 8414 — Authorization Server Metadata. */
function handleAuthorizationServerMetadata(req: IncomingMessage, res: ServerResponse): void {
  const config = getConfig();
  if (!config.oauthBaseUrl || !config.oauthClientId) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const baseUrl = getPublicBaseUrl(req);
  const metadata = {
    issuer: baseUrl,
    authorization_endpoint: `${config.oauthBaseUrl}/oauth/authorize`,
    token_endpoint: `${config.baseUrl}/api/v1/oauth2/token`,
    revocation_endpoint: `${config.baseUrl}/api/v1/oauth2/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [
      'invoice.view', 'invoice.create', 'invoice.issue', 'invoice.send',
      'client.view', 'client.create',
      'product.view', 'product.create',
      'payment.view', 'payment.create',
      'webhook.view', 'webhook.manage',
      'series.view', 'settings.view', 'report.view', 'company.view',
    ],
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(metadata));
}

export function startHttpServer(port: number, host: string): void {
  const server = createServer(async (req, res) => {
    setCorsHeaders(res);

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // OAuth2 well-known metadata endpoints (SaaS mode)
    if (url.pathname === '/.well-known/oauth-protected-resource' || url.pathname === '/.well-known/oauth-authorization-server') {
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.method === 'GET') {
        if (url.pathname === '/.well-known/oauth-protected-resource') {
          handleProtectedResourceMetadata(req, res);
        } else {
          handleAuthorizationServerMetadata(req, res);
        }
        return;
      }
      res.writeHead(405);
      res.end('Method Not Allowed');
      return;
    }

    // Only handle /mcp for MCP protocol
    if (url.pathname !== '/mcp') {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    try {
      switch (req.method) {
        case 'OPTIONS':
          res.writeHead(204);
          res.end();
          break;
        case 'POST':
          await handlePost(req, res);
          break;
        case 'GET':
          await handleGet(req, res);
          break;
        case 'DELETE':
          await handleDelete(req, res);
          break;
        default:
          res.writeHead(405);
          res.end('Method Not Allowed');
      }
    } catch (err) {
      console.error('Error handling request:', err);
      if (!res.headersSent) {
        jsonError(res, 500, -32603, 'Internal server error');
      }
    }
  });

  server.listen(port, host, () => {
    console.error(`Storno MCP HTTP server listening on http://${host}:${port}/mcp`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.error('Shutting down HTTP server...');
    for (const [sessionId, session] of sessions) {
      try {
        await session.transport.close();
        sessions.delete(sessionId);
      } catch (err) {
        console.error(`Error closing session ${sessionId}:`, err);
      }
    }
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
