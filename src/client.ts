/**
 * Authenticated HTTP client for the Storno.ro API.
 *
 * Features:
 * - Automatic JWT token injection (Authorization header)
 * - Automatic X-Company header when companyId is set
 * - Auto-refresh of expired tokens using the refresh token
 * - Structured error responses for AI readability
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { getConfig, updateConfig } from './config.js';

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

export interface ApiError {
  ok: false;
  status: number;
  error: string;
  details?: unknown;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: Record<string, unknown>;
  query?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  /** Override the default company ID for this request */
  companyId?: string;
  /** Skip authentication for this request (e.g., login) */
  noAuth?: boolean;
  /** Expect binary response (e.g., PDF download) */
  binary?: boolean;
  /** Absolute path to a file to upload as multipart/form-data */
  filePath?: string;
  /** Form field name for the uploaded file (default: "file") */
  fileFieldName?: string;
  /** Additional form fields to send alongside the file */
  formFields?: Record<string, string>;
}

async function refreshAccessToken(): Promise<boolean> {
  const config = getConfig();
  if (!config.refreshToken) return false;

  try {
    const res = await fetch(`${config.baseUrl}/api/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: config.refreshToken }),
    });

    if (!res.ok) return false;

    const data = (await res.json()) as { token: string; refresh_token: string };
    updateConfig({
      token: data.token,
      refreshToken: data.refresh_token,
    });
    return true;
  } catch {
    return false;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T> | ApiError> {
  const config = getConfig();
  const { method = 'GET', body, query, headers = {}, companyId, noAuth, binary, filePath, fileFieldName = 'file', formFields } = options;

  // Build URL with query parameters
  const url = new URL(path, config.baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Build headers
  const reqHeaders: Record<string, string> = {
    ...headers,
  };

  if (!noAuth && config.token) {
    // API keys (e.g. "af_...") must be sent without "Bearer " prefix;
    // the backend's ApiKeyAuthenticator skips Bearer-prefixed tokens.
    const isApiKey = config.token.startsWith('af_');
    reqHeaders['Authorization'] = isApiKey ? config.token : `Bearer ${config.token}`;
  }

  const effectiveCompanyId = companyId || config.companyId;
  if (effectiveCompanyId) {
    reqHeaders['X-Company'] = effectiveCompanyId;
  }

  // Build request body — multipart file upload or JSON
  let requestBody: BodyInit | undefined;

  if (filePath) {
    const formData = new FormData();
    const fileBuffer = readFileSync(filePath);
    const fileName = basename(filePath);
    formData.append(fileFieldName, new Blob([fileBuffer]), fileName);
    if (formFields) {
      for (const [key, value] of Object.entries(formFields)) {
        formData.append(key, value);
      }
    }
    requestBody = formData;
    // Do NOT set Content-Type — fetch sets it automatically with the boundary
  } else if (body) {
    reqHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  // Make request
  const fetchOptions: RequestInit = {
    method,
    headers: reqHeaders,
    body: requestBody,
  };

  let res: Response;
  try {
    res = await fetch(url.toString(), fetchOptions);
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Auto-refresh on 401
  if (res.status === 401 && !noAuth && config.refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      reqHeaders['Authorization'] = `Bearer ${getConfig().token}`;
      try {
        res = await fetch(url.toString(), {
          ...fetchOptions,
          headers: reqHeaders,
        });
      } catch (err) {
        return {
          ok: false,
          status: 0,
          error: `Network error after token refresh: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }
  }

  // Parse response
  if (binary) {
    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      return { ok: false, status: res.status, error: text };
    }
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return {
      ok: true,
      status: res.status,
      data: { base64, contentType: res.headers.get('content-type') } as T,
    };
  }

  // Handle empty responses (204 No Content)
  if (res.status === 204) {
    return { ok: true, status: 204, data: null as T };
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      return { ok: false, status: res.status, error: text || `HTTP ${res.status}` };
    }
    return { ok: true, status: res.status, data: text as T };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, status: res.status, error: 'Failed to parse JSON response' };
  }

  if (!res.ok) {
    const errBody = data as Record<string, unknown>;
    return {
      ok: false,
      status: res.status,
      error: (errBody.message as string) || (errBody.error as string) || `HTTP ${res.status}`,
      details: errBody,
    };
  }

  return { ok: true, status: res.status, data: data as T };
}
