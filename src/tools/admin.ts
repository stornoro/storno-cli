import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'admin_organizations',
    description:
      'List all organizations on the platform with pagination and filtering. SUPER_ADMIN only. Returns organization details including owner info, subscription plan, member/company/invoice counts, and ANAF token status.',
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
        .max(200)
        .optional()
        .describe('Items per page (default: 50, max: 200)'),
      search: z
        .string()
        .optional()
        .describe('Search by organization name or owner name/email'),
      status: z
        .enum(['active', 'trial', 'suspended'])
        .optional()
        .describe('Filter by organization status: active, trial, or suspended'),
      plan: z
        .string()
        .optional()
        .describe('Filter by subscription plan type'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { page, limit, search, status, plan } = params as {
        page?: number;
        limit?: number;
        search?: string;
        status?: 'active' | 'trial' | 'suspended';
        plan?: string;
      };

      const res = await apiRequest('/api/v1/admin/organizations', {
        query: { page, limit, search, status, plan },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'admin_stats',
    description:
      'Get platform-wide statistics including user counts, organization metrics, company sync status, invoice totals, and system info. SUPER_ADMIN only. Results are typically cached for 5 minutes.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/admin/stats');
      return formatResponse(res);
    },
  },

  {
    name: 'admin_users',
    description:
      'List all users on the platform with pagination and filtering. SUPER_ADMIN only. Returns user account details, verification status, role, last login timestamp, and organization memberships.',
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
        .max(200)
        .optional()
        .describe('Items per page (default: 50, max: 200)'),
      search: z
        .string()
        .optional()
        .describe('Search by user name or email address'),
      status: z
        .enum(['active', 'inactive', 'verified', 'unverified'])
        .optional()
        .describe('Filter by user status: active, inactive, verified, or unverified'),
      role: z
        .string()
        .optional()
        .describe('Filter by user system role'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const { page, limit, search, status, role } = params as {
        page?: number;
        limit?: number;
        search?: string;
        status?: 'active' | 'inactive' | 'verified' | 'unverified';
        role?: string;
      };

      const res = await apiRequest('/api/v1/admin/users', {
        query: { page, limit, search, status, role },
      });
      return formatResponse(res);
    },
  },
];
