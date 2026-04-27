/**
 * Error formatting utilities for AI-readable output.
 */

import type { ApiError, ApiResponse } from '../client.js';

/**
 * Format an API response for the MCP tool result.
 * Returns a JSON string suitable for AI consumption.
 */
export function formatResponse(response: ApiResponse | ApiError): string {
  if (!response.ok) {
    const err = response as ApiError;
    const parts: string[] = [`Error ${err.status}: ${err.error}`];
    if (err.details) {
      parts.push(JSON.stringify(err.details, null, 2));
    }
    return parts.join('\n\n');
  }

  return JSON.stringify(response.data, null, 2);
}

/**
 * Format a "not configured" error for tools that need auth.
 */
export function notAuthenticated(): string {
  return [
    'Error: Not authenticated.',
    '',
    'To authenticate, either:',
    '1. Set STORNO_TOKEN environment variable in MCP server config',
    '2. Call the auth_login tool with email and password',
    '3. Set STORNO_EMAIL and STORNO_PASSWORD env vars for auto-login',
  ].join('\n');
}

/**
 * Format a "no company selected" error.
 */
export function noCompanySelected(): string {
  return [
    'Error: No company selected.',
    '',
    'To select a company, either:',
    '1. Set STORNO_COMPANY_ID environment variable in MCP server config',
    '2. Call the companies_list tool, then use the company UUID in subsequent calls',
    '3. Most tools accept an optional companyId parameter to override',
  ].join('\n');
}
