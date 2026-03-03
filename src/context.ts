/**
 * Per-session authentication context using AsyncLocalStorage.
 *
 * In SaaS mode each MCP session carries its own OAuth2 token.
 * Tool handlers and apiRequest() read the token from this context
 * instead of the global config, requiring zero changes to individual tools.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export interface SessionContext {
  token: string;
}

export const sessionContext = new AsyncLocalStorage<SessionContext>();
