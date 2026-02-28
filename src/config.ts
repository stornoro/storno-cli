/**
 * Configuration for the Storno MCP server.
 *
 * Environment variables:
 *   STORNO_BASE_URL      — API base URL (default: https://api.storno.ro)
 *   STORNO_TOKEN         — JWT access token (obtain via auth_login tool)
 *   STORNO_REFRESH_TOKEN — JWT refresh token (for auto-renewal)
 *   STORNO_COMPANY_ID    — Default company UUID (used as X-Company header)
 *   STORNO_EMAIL         — Email for auto-login (optional, used if no token)
 *   STORNO_PASSWORD      — Password for auto-login (optional, used if no token)
 */

export interface Config {
  baseUrl: string;
  token: string | null;
  refreshToken: string | null;
  companyId: string | null;
  email: string | null;
  password: string | null;
}

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = {
      baseUrl: (process.env.STORNO_BASE_URL || 'https://api.storno.ro').replace(/\/$/, ''),
      token: process.env.STORNO_TOKEN || null,
      refreshToken: process.env.STORNO_REFRESH_TOKEN || null,
      companyId: process.env.STORNO_COMPANY_ID || null,
      email: process.env.STORNO_EMAIL || null,
      password: process.env.STORNO_PASSWORD || null,
    };
  }
  return _config;
}

export function updateConfig(updates: Partial<Config>): void {
  const config = getConfig();
  Object.assign(config, updates);
}
