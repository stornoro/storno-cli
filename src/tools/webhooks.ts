import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'webhooks_list',
    description:
      'List all webhook endpoints configured for the current company. Secrets are masked in the listing. Requires X-Company header (companyId param or STORNO_COMPANY_ID env var).',
    inputSchema: z.object({
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { companyId } = params as { companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest('/api/v1/webhooks', {
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'webhooks_get',
    description:
      'Retrieve the full configuration of a single webhook endpoint. The secret is always masked in this response — use webhooks_regenerate_secret to obtain a new full secret.',
    inputSchema: z.object({
      uuid: z.string().describe('Webhook endpoint UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid, companyId } = params as { uuid: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/webhooks/${uuid}`, {
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'webhooks_create',
    description:
      'Register a new webhook endpoint for the current company. The response includes the full signing secret — store it securely immediately as it will be masked in all subsequent responses. URL must use HTTPS. Use ["*"] for events to subscribe to all event types.',
    inputSchema: z.object({
      url: z
        .string()
        .url()
        .describe('HTTPS destination URL that will receive POST requests from Storno'),
      events: z
        .array(z.string())
        .describe(
          'Array of event type names to subscribe to (e.g. ["invoice.created", "invoice.validated"]). Use ["*"] to subscribe to all events.'
        ),
      description: z
        .string()
        .optional()
        .describe('Human-readable label for this webhook endpoint'),
      isActive: z
        .boolean()
        .optional()
        .describe('Whether the webhook is active on creation (default: true)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { companyId, url, events, description, isActive } = params as {
        companyId?: string;
        url: string;
        events: string[];
        description?: string;
        isActive?: boolean;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const body: Record<string, unknown> = { url, events };
      if (description !== undefined) body.description = description;
      if (isActive !== undefined) body.isActive = isActive;

      const res = await apiRequest('/api/v1/webhooks', {
        method: 'POST',
        body,
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'webhooks_update',
    description:
      'Partially update an existing webhook endpoint. Only provided fields are changed. Providing events replaces the entire subscription list — send the complete desired set each time. URL must use HTTPS.',
    inputSchema: z.object({
      uuid: z.string().describe('Webhook endpoint UUID to update'),
      url: z.string().url().optional().describe('New HTTPS destination URL'),
      events: z
        .array(z.string())
        .optional()
        .describe(
          'Replacement list of event type names (replaces entire list, not additive). Use ["*"] for all events.'
        ),
      description: z
        .string()
        .optional()
        .describe('Updated human-readable label for this webhook endpoint'),
      isActive: z
        .boolean()
        .optional()
        .describe('Enable (true) or pause (false) deliveries for this webhook'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid, companyId, url, events, description, isActive } = params as {
        uuid: string;
        companyId?: string;
        url?: string;
        events?: string[];
        description?: string;
        isActive?: boolean;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const body: Record<string, unknown> = {};
      if (url !== undefined) body.url = url;
      if (events !== undefined) body.events = events;
      if (description !== undefined) body.description = description;
      if (isActive !== undefined) body.isActive = isActive;

      const res = await apiRequest(`/api/v1/webhooks/${uuid}`, {
        method: 'PATCH',
        body,
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'webhooks_delete',
    description:
      'Permanently delete a webhook endpoint and all its delivery history. This is a hard delete with no recovery. To pause deliveries temporarily, use webhooks_update with isActive: false instead.',
    inputSchema: z.object({
      uuid: z.string().describe('Webhook endpoint UUID to permanently delete'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid, companyId } = params as { uuid: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/webhooks/${uuid}`, {
        method: 'DELETE',
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'webhooks_events',
    description:
      'List all available webhook event types that can be subscribed to, including their descriptions and categories (invoices, payments, clients, sync, proforma). Use this to discover valid event names for webhook configuration.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/webhooks/events');
      return formatResponse(res);
    },
  },

  {
    name: 'webhooks_deliveries',
    description:
      'Retrieve a paginated list of delivery attempts for a webhook endpoint. Can filter by status (success/failed), event type, and date range. Use webhooks_delivery_detail to inspect full request/response payloads.',
    inputSchema: z.object({
      uuid: z.string().describe('Webhook endpoint UUID'),
      page: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Page number for pagination (default: 1)'),
      limit: z
        .number()
        .int()
        .positive()
        .max(100)
        .optional()
        .describe('Number of items per page (default: 20, max: 100)'),
      status: z
        .enum(['success', 'failed'])
        .optional()
        .describe('Filter by delivery status: success or failed'),
      eventType: z
        .string()
        .optional()
        .describe('Filter by event type name (e.g. invoice.validated)'),
      from: z.string().optional().describe('Start date filter in ISO 8601 format (YYYY-MM-DD)'),
      to: z.string().optional().describe('End date filter in ISO 8601 format (YYYY-MM-DD)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid, companyId, page, limit, status, eventType, from, to } = params as {
        uuid: string;
        companyId?: string;
        page?: number;
        limit?: number;
        status?: 'success' | 'failed';
        eventType?: string;
        from?: string;
        to?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/webhooks/${uuid}/deliveries`, {
        companyId: effectiveCompanyId,
        query: { page, limit, status, eventType, from, to },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'webhooks_delivery_detail',
    description:
      'Retrieve the complete details of a single webhook delivery attempt, including the full request payload, request headers (with signature), and the full response received. Use this to debug failed deliveries.',
    inputSchema: z.object({
      uuid: z.string().describe('Webhook endpoint UUID'),
      deliveryUuid: z.string().describe('Delivery attempt UUID'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid, deliveryUuid, companyId } = params as {
        uuid: string;
        deliveryUuid: string;
        companyId?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/webhooks/${uuid}/deliveries/${deliveryUuid}`, {
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'webhooks_regenerate_secret',
    description:
      'Issue a new HMAC-SHA256 signing secret for a webhook endpoint, immediately invalidating the previous one. The new secret is returned in full only in this response — store it securely. Update your endpoint verification logic before calling this in production.',
    inputSchema: z.object({
      uuid: z.string().describe('Webhook endpoint UUID to regenerate the secret for'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid, companyId } = params as { uuid: string; companyId?: string };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/webhooks/${uuid}/regenerate-secret`, {
        method: 'POST',
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'webhooks_test',
    description:
      'Send a synchronous test delivery to a webhook endpoint and return the outcome immediately. Uses a synthetic webhook.test event payload. The webhook must be active. The delivery is recorded in delivery history.',
    inputSchema: z.object({
      uuid: z.string().describe('Webhook endpoint UUID to send the test delivery to'),
      eventType: z
        .string()
        .optional()
        .describe('Override the test event type name (default: webhook.test)'),
      companyId: z
        .string()
        .optional()
        .describe('Company UUID (overrides STORNO_COMPANY_ID env var)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid, companyId, eventType } = params as {
        uuid: string;
        companyId?: string;
        eventType?: string;
      };
      const effectiveCompanyId = companyId || getConfig().companyId;
      if (!effectiveCompanyId) return noCompanySelected();

      const body: Record<string, unknown> = {};
      if (eventType !== undefined) body.eventType = eventType;

      const res = await apiRequest(`/api/v1/webhooks/${uuid}/test`, {
        method: 'POST',
        body: Object.keys(body).length > 0 ? body : undefined,
        companyId: effectiveCompanyId,
      });
      return formatResponse(res);
    },
  },
];
