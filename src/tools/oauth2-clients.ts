import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'oauth2_clients_list',
    description:
      'List all registered OAuth2 applications for the current organization. Returns app name, client ID, client type, scopes, status, and creation date.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/oauth2/clients');
      return formatResponse(res);
    },
  },

  {
    name: 'oauth2_clients_get',
    description: 'Get details of a specific OAuth2 application by its UUID.',
    inputSchema: z.object({
      uuid: z.string().describe('OAuth2 app UUID'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest(`/api/v1/oauth2/clients/${params.uuid}`);
      return formatResponse(res);
    },
  },

  {
    name: 'oauth2_clients_create',
    description:
      'Register a new OAuth2 application (third-party integration). Returns the client secret once for confidential clients — store it securely. Cannot be called via API key or OAuth2 token; requires a browser session JWT.',
    inputSchema: z.object({
      name: z.string().describe('Human-readable name for the app'),
      clientType: z
        .enum(['confidential', 'public'])
        .optional()
        .describe('confidential (default, server-side) or public (SPA/mobile)'),
      redirectUris: z.array(z.string()).describe('Allowed OAuth2 callback URLs'),
      scopes: z
        .array(z.string())
        .describe('Permission scopes the app can request (must be subset of your permissions)'),
      description: z.string().optional().describe('Optional description of the app'),
      websiteUrl: z.string().optional().describe('App website URL'),
      logoUrl: z.string().optional().describe('App logo URL'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const body: Record<string, unknown> = {
        name: params.name,
        redirectUris: params.redirectUris,
        scopes: params.scopes,
      };
      if (params.clientType !== undefined) body.clientType = params.clientType;
      if (params.description !== undefined) body.description = params.description;
      if (params.websiteUrl !== undefined) body.websiteUrl = params.websiteUrl;
      if (params.logoUrl !== undefined) body.logoUrl = params.logoUrl;

      const res = await apiRequest('/api/v1/oauth2/clients', { method: 'POST', body });
      return formatResponse(res);
    },
  },

  {
    name: 'oauth2_clients_update',
    description:
      'Update an existing OAuth2 application. Only provided fields are changed. Cannot be called via API key or OAuth2 token.',
    inputSchema: z.object({
      uuid: z.string().describe('OAuth2 app UUID'),
      name: z.string().optional().describe('New name'),
      description: z.string().optional().describe('New description'),
      redirectUris: z.array(z.string()).optional().describe('New redirect URIs'),
      scopes: z.array(z.string()).optional().describe('New scopes'),
      isActive: z.boolean().optional().describe('Enable/disable the app'),
      websiteUrl: z.string().optional().describe('New website URL'),
      logoUrl: z.string().optional().describe('New logo URL'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const body: Record<string, unknown> = {};
      if (params.name !== undefined) body.name = params.name;
      if (params.description !== undefined) body.description = params.description;
      if (params.redirectUris !== undefined) body.redirectUris = params.redirectUris;
      if (params.scopes !== undefined) body.scopes = params.scopes;
      if (params.isActive !== undefined) body.isActive = params.isActive;
      if (params.websiteUrl !== undefined) body.websiteUrl = params.websiteUrl;
      if (params.logoUrl !== undefined) body.logoUrl = params.logoUrl;

      const res = await apiRequest(`/api/v1/oauth2/clients/${params.uuid}`, {
        method: 'PATCH',
        body,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'oauth2_clients_revoke',
    description:
      'Revoke an OAuth2 application and all its associated access and refresh tokens. This action is irreversible. Cannot be called via API key or OAuth2 token.',
    inputSchema: z.object({
      uuid: z.string().describe('OAuth2 app UUID'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest(`/api/v1/oauth2/clients/${params.uuid}`, {
        method: 'DELETE',
      });
      return formatResponse(res);
    },
  },

  {
    name: 'oauth2_clients_rotate_secret',
    description:
      'Rotate the client secret of a confidential OAuth2 application. Returns the new secret once — store it securely. The old secret is immediately invalidated. Cannot be called via API key or OAuth2 token.',
    inputSchema: z.object({
      uuid: z.string().describe('OAuth2 app UUID'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest(`/api/v1/oauth2/clients/${params.uuid}/rotate-secret`, {
        method: 'POST',
      });
      return formatResponse(res);
    },
  },

  {
    name: 'oauth2_clients_scopes',
    description:
      'List all available permission scopes that can be granted to OAuth2 applications, grouped by category. Only returns scopes the authenticated user holds.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const res = await apiRequest('/api/v1/api-tokens/scopes');
      return formatResponse(res);
    },
  },
];
