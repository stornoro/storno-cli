/**
 * Streamable HTTP transport for the Storno MCP server.
 *
 * Implements the MCP Streamable HTTP spec using raw node:http (no new deps).
 * Each session gets its own StreamableHTTPServerTransport + McpServer pair.
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createMcpServer } from './server.js';

const transports = new Map<string, StreamableHTTPServerTransport>();

function setCorsHeaders(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
}

function jsonError(res: ServerResponse, status: number, code: number, message: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
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

async function handlePost(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readBody(req);
  } catch {
    jsonError(res, 400, -32700, 'Parse error');
    return;
  }

  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    // Existing session — forward request
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, body);
    return;
  }

  if (!sessionId && isInitializeRequest(body)) {
    // New session
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sid) => {
        transports.set(sid, transport);
      },
    });

    transport.onclose = () => {
      const sid = transport.sessionId;
      if (sid) transports.delete(sid);
    };

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
  if (!sessionId || !transports.has(sessionId)) {
    jsonError(res, 400, -32000, 'Invalid or missing session ID');
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
}

async function handleDelete(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports.has(sessionId)) {
    jsonError(res, 400, -32000, 'Invalid or missing session ID');
    return;
  }
  const transport = transports.get(sessionId)!;
  await transport.handleRequest(req, res);
}

export function startHttpServer(port: number, host: string): void {
  const server = createServer(async (req, res) => {
    setCorsHeaders(res);

    // Only handle /mcp
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
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
    for (const [sessionId, transport] of transports) {
      try {
        await transport.close();
        transports.delete(sessionId);
      } catch (err) {
        console.error(`Error closing session ${sessionId}:`, err);
      }
    }
    server.close(() => process.exit(0));
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
