import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig, updateConfig } from '../config.js';

export const tools = [
  {
    name: 'auth_login',
    description:
      'Authenticate with the Storno.ro API using email and password. Returns JWT access and refresh tokens, and stores them in the session config for all subsequent requests. Must be called before any other tool if STORNO_TOKEN is not set.',
    inputSchema: z.object({
      email: z.string().email().describe('User email address'),
      password: z.string().describe('User password'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const { email, password } = params as { email: string; password: string };

      const result = await apiRequest<{ token: string; refresh_token: string }>('/api/auth', {
        method: 'POST',
        noAuth: true,
        body: { email, password },
      });

      if (!result.ok) {
        return formatResponse(result);
      }

      const { token, refresh_token } = result.data;
      updateConfig({ token, refreshToken: refresh_token });

      return JSON.stringify(
        {
          success: true,
          message: 'Logged in successfully. Token stored in session.',
          tokenPreview: token.substring(0, 20) + '...',
        },
        null,
        2
      );
    },
  },

  {
    name: 'auth_register',
    description:
      'Create a new Storno.ro user account. A default organization is automatically created. Returns JWT tokens on success.',
    inputSchema: z.object({
      email: z.string().email().describe('Email address for the new account (must be unique)'),
      password: z.string().min(8).describe('Password (minimum 8 characters)'),
      firstName: z.string().optional().describe("User's first name"),
      lastName: z.string().optional().describe("User's last name"),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const { email, password, firstName, lastName } = params as {
        email: string;
        password: string;
        firstName?: string;
        lastName?: string;
      };

      const body: Record<string, unknown> = { email, password };
      if (firstName !== undefined) body.firstName = firstName;
      if (lastName !== undefined) body.lastName = lastName;

      const result = await apiRequest('/api/auth/register', {
        method: 'POST',
        noAuth: true,
        body,
      });

      return formatResponse(result);
    },
  },

  {
    name: 'auth_refresh',
    description:
      'Refresh an expired JWT access token using the refresh token. Both tokens are rotated. The new tokens are stored in the session config. Use when the current token has expired.',
    inputSchema: z.object({
      refreshToken: z
        .string()
        .optional()
        .describe(
          'Refresh token to use. If omitted, uses the token stored in session config (STORNO_REFRESH_TOKEN).'
        ),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const { refreshToken: paramToken } = params as { refreshToken?: string };
      const config = getConfig();
      const refreshToken = paramToken || config.refreshToken;

      if (!refreshToken) {
        return 'Error: No refresh token available. Please login first using auth_login.';
      }

      const result = await apiRequest<{ token: string; refresh_token: string }>(
        '/api/auth/token/refresh',
        {
          method: 'POST',
          noAuth: true,
          body: { refresh_token: refreshToken },
        }
      );

      if (!result.ok) {
        return formatResponse(result);
      }

      const { token, refresh_token } = result.data;
      updateConfig({ token, refreshToken: refresh_token });

      return JSON.stringify(
        {
          success: true,
          message: 'Token refreshed successfully. New tokens stored in session.',
          tokenPreview: token.substring(0, 20) + '...',
        },
        null,
        2
      );
    },
  },

  {
    name: 'auth_me',
    description:
      'Get the current authenticated user profile including organization memberships and subscription plan. Returns flat JSON with user, organization, memberships, and subscription.',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const result = await apiRequest('/api/v1/me');
      return formatResponse(result);
    },
  },

  {
    name: 'auth_update_profile',
    description:
      "Update the authenticated user's profile. Can update name, phone, timezone, preferences, or change password (requires currentPassword when changing password).",
    inputSchema: z.object({
      firstName: z.string().optional().describe("User's first name"),
      lastName: z.string().optional().describe("User's last name"),
      phone: z
        .string()
        .optional()
        .describe('Phone number (E.164 format recommended, e.g., +40721234567)'),
      timezone: z
        .string()
        .optional()
        .describe('Timezone in IANA format (e.g., Europe/Bucharest)'),
      preferences: z
        .record(z.unknown())
        .optional()
        .describe(
          'User preferences object (language, theme, notifications, etc.)'
        ),
      password: z
        .string()
        .optional()
        .describe('New password (requires currentPassword to also be provided)'),
      currentPassword: z
        .string()
        .optional()
        .describe('Current password (required when changing password)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();

      const body: Record<string, unknown> = {};
      const fields = [
        'firstName',
        'lastName',
        'phone',
        'timezone',
        'preferences',
        'password',
        'currentPassword',
      ];
      for (const field of fields) {
        if (params[field] !== undefined) body[field] = params[field];
      }

      const result = await apiRequest('/api/v1/me', {
        method: 'PATCH',
        body,
      });

      return formatResponse(result);
    },
  },

  {
    name: 'auth_forgot_password',
    description:
      "Request a password reset email. Always returns success to prevent user enumeration — the email is only sent if the account exists. The reset link is valid for 1 hour.",
    inputSchema: z.object({
      email: z.string().email().describe('Email address associated with the account'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const { email } = params as { email: string };

      const result = await apiRequest('/api/auth/forgot-password', {
        method: 'POST',
        noAuth: true,
        body: { email },
      });

      return formatResponse(result);
    },
  },

  {
    name: 'auth_reset_password',
    description:
      'Reset a user password using the token received via email from auth_forgot_password. The token is single-use and expires after 1 hour. All existing sessions are revoked on success.',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Password reset token received via email link (from URL query parameter)'),
      password: z.string().min(8).describe('New password (minimum 8 characters)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const { token, password } = params as { token: string; password: string };

      const result = await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        noAuth: true,
        body: { token, password },
      });

      return formatResponse(result);
    },
  },
];
