import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'members_list',
    description:
      'List all members of the organization with their roles, active status, and allowed company access. Only organization admins and owners can list members.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/members');
      return formatResponse(res);
    },
  },

  {
    name: 'members_update',
    description:
      'Update a member\'s role, active status, allowed company access, and custom permissions. Cannot change role to OWNER or modify the organization owner. Roles: ADMIN, ACCOUNTANT, EMPLOYEE. Pass permissions as an array of permission strings to set custom permissions, or null to reset to role defaults.',
    inputSchema: z.object({
      uuid: z.string().describe('Member UUID to update'),
      role: z
        .enum(['ADMIN', 'ACCOUNTANT', 'EMPLOYEE'])
        .optional()
        .describe('New role for the member: ADMIN, ACCOUNTANT, or EMPLOYEE'),
      isActive: z
        .boolean()
        .optional()
        .describe('Whether the member is active. Deactivated members cannot log in.'),
      allowedCompanies: z
        .array(z.string())
        .optional()
        .describe('Array of company UUIDs the member is allowed to access'),
      permissions: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('Custom permissions array (e.g. ["company.view","invoice.create"]). Pass null to reset to role defaults.'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid, ...body } = params as {
        uuid: string;
        role?: 'ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE';
        isActive?: boolean;
        allowedCompanies?: string[];
        permissions?: string[] | null;
      };

      const res = await apiRequest(`/api/v1/members/${uuid}`, {
        method: 'PATCH',
        body: body as Record<string, unknown>,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'members_delete',
    description:
      'Deactivate (soft-delete) a member from the organization. Preserves historical data but prevents login. Cannot deactivate yourself, the organization owner, or super admins.',
    inputSchema: z.object({
      uuid: z.string().describe('Member UUID to deactivate'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { uuid } = params as { uuid: string };

      const res = await apiRequest(`/api/v1/members/${uuid}`, {
        method: 'DELETE',
      });
      return formatResponse(res);
    },
  },

  {
    name: 'members_permissions_reference',
    description:
      'Get the permissions reference: all available permissions grouped by category, and role default permissions for each role (owner, admin, accountant, employee). Useful for understanding which permissions exist before setting custom permissions on a member.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/members/permissions-reference');
      return formatResponse(res);
    },
  },
];
