import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'notifications_list',
    description:
      'Retrieve a paginated list of notifications for the authenticated user. Notification types include: invoice_received, invoice_paid, sync_completed, sync_failed, token_expiring, token_expired, payment_overdue, invitation_received.',
    inputSchema: z.object({
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
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { page, limit } = params as { page?: number; limit?: number };

      const res = await apiRequest('/api/v1/notifications', {
        query: { page, limit },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'notifications_unread_count',
    description:
      'Get the count of unread notifications for the authenticated user. This lightweight endpoint is suitable for polling to update notification badges.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/notifications/unread-count');
      return formatResponse(res);
    },
  },

  {
    name: 'notifications_read_all',
    description:
      'Mark all notifications as read for the authenticated user in a single operation. Resets the unread count to zero. This operation is idempotent.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/notifications/read-all', {
        method: 'POST',
      });
      return formatResponse(res);
    },
  },

  {
    name: 'notifications_mark_read',
    description:
      'Mark a specific notification as read. This operation is idempotent — marking an already-read notification has no error. Decrements the unread count by one.',
    inputSchema: z.object({
      id: z.string().describe('Notification UUID to mark as read'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { id } = params as { id: string };

      const res = await apiRequest(`/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
      });
      return formatResponse(res);
    },
  },

  {
    name: 'notification_preferences_get',
    description:
      'Get the authenticated user\'s notification preferences for all event types. Returns per-event settings for email, in-app, push, and WhatsApp channels.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/notification-preferences');
      return formatResponse(res);
    },
  },

  {
    name: 'notification_preferences_update',
    description:
      'Update notification preferences for specific event types. Each preference controls email, in-app, push, and WhatsApp delivery channels. Event types include: invoice.validated, invoice.rejected, invoice.due_soon, invoice.due_today, invoice.overdue, sync.completed, sync.error, efactura.new_documents, token.expiring_soon, token.refresh_failed, export_ready.',
    inputSchema: z.object({
      preferences: z
        .array(
          z.object({
            eventType: z.string().describe('Event type (e.g., "invoice.validated")'),
            emailEnabled: z.boolean().optional().describe('Enable email notifications'),
            inAppEnabled: z.boolean().optional().describe('Enable in-app notifications'),
            pushEnabled: z.boolean().optional().describe('Enable push notifications'),
            whatsappEnabled: z.boolean().optional().describe('Enable WhatsApp notifications'),
          })
        )
        .describe('Array of notification preference updates'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { preferences } = params as {
        preferences: Array<Record<string, unknown>>;
      };

      const res = await apiRequest('/api/v1/notification-preferences', {
        method: 'PUT',
        body: { preferences },
      });
      return formatResponse(res);
    },
  },
];
