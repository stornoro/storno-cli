import { z } from 'zod';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';
import { sessionContext } from '../context.js';

const TELEMETRY_BASE = 'https://api.storno.ro';

export const tools = [
  {
    name: 'telemetry_send',
    description:
      'Send a batch of telemetry events for the current user and company. Events are processed asynchronously. Maximum 100 events per batch. Telemetry is always sent to api.storno.ro regardless of configured base URL.',
    inputSchema: z.object({
      events: z
        .array(
          z.object({
            event: z.string().describe('Event name (e.g. "invoice.created", "client.deleted")'),
            properties: z
              .record(z.unknown())
              .optional()
              .describe('Optional event properties'),
            timestamp: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp (defaults to now)'),
          }),
        )
        .describe('Array of telemetry events to send'),
      platform: z
        .string()
        .optional()
        .describe('Platform identifier (default: "cli")'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const { events, platform, companyId } = params as {
        events: Array<{ event: string; properties?: Record<string, unknown>; timestamp?: string }>;
        platform?: string;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || config.companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const body = {
        events: events.map((e) => ({
          event: e.event,
          properties: e.properties,
          timestamp: e.timestamp ?? new Date().toISOString(),
        })),
        platform: platform ?? 'cli',
        app_version: '1.0.0',
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Company': effectiveCompanyId,
      };

      const sessionToken = sessionContext.getStore()?.token;
      const token = sessionToken || config.token;
      if (token) {
        const isApiKey = token.startsWith('af_');
        headers['Authorization'] = isApiKey ? token : `Bearer ${token}`;
      }

      try {
        const res = await fetch(`${TELEMETRY_BASE}/api/v1/telemetry`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          return formatResponse({
            ok: false,
            status: res.status,
            error: (data as Record<string, unknown>).error as string || `HTTP ${res.status}`,
          });
        }

        return formatResponse({ ok: true, status: res.status, data });
      } catch (err) {
        return formatResponse({
          ok: false,
          status: 0,
          error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    },
  },
];
