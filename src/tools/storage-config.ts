import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

export const tools = [
  {
    name: 'storage_config_get',
    description:
      'Get the organization\'s external storage configuration. Returns the current provider, bucket, region, and connection status. External storage allows storing PDFs and XMLs in your own S3-compatible bucket.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const result = await apiRequest('/api/v1/storage-config');
      return formatResponse(result);
    },
  },

  {
    name: 'storage_config_update',
    description:
      'Create or update external storage configuration. Supports S3-compatible providers (AWS S3, Cloudflare R2, MinIO, DigitalOcean Spaces, etc.). Credentials are encrypted at rest.',
    inputSchema: z.object({
      provider: z
        .string()
        .describe('Storage provider (e.g., "s3", "r2", "minio", "spaces")'),
      bucket: z.string().describe('Bucket name'),
      region: z.string().optional().describe('AWS region (e.g., "eu-central-1")'),
      prefix: z
        .string()
        .optional()
        .describe('Key prefix/folder path within the bucket'),
      endpoint: z
        .string()
        .optional()
        .describe('Custom endpoint URL (for non-AWS S3-compatible providers)'),
      accessKeyId: z.string().optional().describe('Access key ID'),
      secretAccessKey: z.string().optional().describe('Secret access key'),
      accountId: z
        .string()
        .optional()
        .describe('Account ID (e.g., for Cloudflare R2)'),
      forcePathStyle: z
        .boolean()
        .optional()
        .describe('Use path-style URLs instead of virtual-hosted (for MinIO)'),
      isActive: z
        .boolean()
        .optional()
        .describe('Enable or disable external storage'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) body[key] = value;
      }

      const result = await apiRequest('/api/v1/storage-config', {
        method: 'PUT',
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'storage_config_delete',
    description:
      'Delete the external storage configuration. Files already stored externally will no longer be accessible. This does NOT delete files from the external bucket.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const result = await apiRequest('/api/v1/storage-config', {
        method: 'DELETE',
      });
      return formatResponse(result);
    },
  },

  {
    name: 'storage_config_test',
    description:
      'Test the external storage connection. Attempts to write and read a test file to verify credentials and permissions. Uses existing config credentials if not provided.',
    inputSchema: z.object({
      provider: z.string().optional().describe('Storage provider to test'),
      bucket: z.string().optional().describe('Bucket name'),
      region: z.string().optional().describe('AWS region'),
      endpoint: z.string().optional().describe('Custom endpoint URL'),
      accessKeyId: z.string().optional().describe('Access key ID'),
      secretAccessKey: z.string().optional().describe('Secret access key'),
      accountId: z.string().optional().describe('Account ID'),
      forcePathStyle: z.boolean().optional().describe('Use path-style URLs'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const body: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) body[key] = value;
      }

      const result = await apiRequest('/api/v1/storage-config/test', {
        method: 'POST',
        body,
      });
      return formatResponse(result);
    },
  },

  {
    name: 'storage_config_providers',
    description:
      'List available external storage providers with their configuration requirements and documentation links.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const result = await apiRequest('/api/v1/storage-config/providers');
      return formatResponse(result);
    },
  },
];
