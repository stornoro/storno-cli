import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'invitations_list',
    description:
      'List all pending invitations for the organization. Only returns invitations that have not yet been accepted. Only organization admins and owners can view invitations.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/invitations');
      return formatResponse(res);
    },
  },

  {
    name: 'invitations_create',
    description:
      'Invite a new user to join the organization by email. An invitation email is sent automatically. Invitations expire after 7 days. Roles: ADMIN, ACCOUNTANT, EMPLOYEE (cannot invite as OWNER).',
    inputSchema: z.object({
      email: z.string().email().describe('Email address of the user to invite'),
      role: z
        .enum(['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'])
        .describe('Role to assign to the invited user: ADMIN, ACCOUNTANT, or EMPLOYEE'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { email, role } = params as { email: string; role: string };

      const res = await apiRequest('/api/v1/invitations', {
        method: 'POST',
        body: { email, role },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'invitations_delete',
    description:
      'Cancel a pending invitation. The invitation token is immediately invalidated and cannot be used. Cannot cancel invitations that have already been accepted.',
    inputSchema: z.object({
      uuid: z.string().describe('Invitation UUID to cancel'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid } = params as { uuid: string };

      const res = await apiRequest(`/api/v1/invitations/${uuid}`, {
        method: 'DELETE',
      });
      return formatResponse(res);
    },
  },

  {
    name: 'invitations_resend',
    description:
      'Resend the invitation email for a pending invitation. Does not extend the expiration date. If the invitation has expired, cancel it and create a new one instead.',
    inputSchema: z.object({
      uuid: z.string().describe('Invitation UUID to resend'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid } = params as { uuid: string };

      const res = await apiRequest(`/api/v1/invitations/${uuid}/resend`, {
        method: 'POST',
      });
      return formatResponse(res);
    },
  },
];
