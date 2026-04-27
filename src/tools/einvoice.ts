import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated, noCompanySelected } from '../utils/errors.js';
import { getConfig } from '../config.js';

function getCompanyId(params: Record<string, unknown>): string | undefined {
  return (params.companyId as string) || getConfig().companyId || undefined;
}

export const tools = [
  {
    name: 'einvoice_providers',
    description:
      'List all available e-invoicing providers. Returns provider identifiers, labels, and country codes. Providers include: anaf (Romania), xrechnung (Germany), sdi (Italy), ksef (Poland), facturx (France).',
    inputSchema: z.object({}),
    handler: async (_params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();

      const res = await apiRequest('/api/v1/einvoice/providers');
      return formatResponse(res);
    },
  },

  {
    name: 'einvoice_submit',
    description:
      'Submit an invoice to an e-invoicing provider. Supports all EU providers: anaf (Romania e-Factura), xrechnung (Germany), sdi (Italy), ksef (Poland), facturx (France). For ANAF, uses the existing e-Factura submission flow. For other providers, generates country-specific XML and optionally submits via API if credentials are configured.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the invoice to submit'),
      provider: z
        .enum(['anaf', 'xrechnung', 'sdi', 'ksef', 'facturx'])
        .describe(
          'E-invoicing provider: anaf (Romania), xrechnung (Germany), sdi (Italy), ksef (Poland), facturx (France)'
        ),
      companyId: z.string().optional().describe('Company UUID (uses default if not specified)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/invoices/${params.uuid}/submit-einvoice`, {
        method: 'POST',
        companyId,
        body: { provider: params.provider },
      });
      return formatResponse(res);
    },
  },

  {
    name: 'einvoice_submissions',
    description:
      'List all e-invoice submissions for a specific invoice. Shows submission history across all providers (ANAF, XRechnung, SDI, KSeF, Factur-X) with status, external IDs, error messages, and metadata. Note: ANAF submissions are tracked separately via the existing e-Factura flow and may not appear here.',
    inputSchema: z.object({
      uuid: z.string().describe('UUID of the invoice'),
      companyId: z.string().optional().describe('Company UUID (uses default if not specified)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/invoices/${params.uuid}/einvoice-submissions`, {
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'einvoice_config_list',
    description:
      'List all e-invoice provider configurations for a company. Shows which providers are enabled and their settings (API credentials, routing codes, etc.). Provider-specific config fields: anaf (managed via ANAF tokens), xrechnung (clientId, clientSecret for ZRE), sdi (certPath, certPassword or apiEndpoint, apiKey), ksef (authToken, nip), facturx (clientId, clientSecret, siret for Chorus Pro).',
    inputSchema: z.object({
      companyId: z.string().optional().describe('Company UUID (uses default if not specified)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(`/api/v1/companies/${companyId}/einvoice-config`, {
        companyId,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'einvoice_config_save',
    description:
      'Create or update an e-invoice provider configuration for a company. Use this to enable a provider and set API credentials. Config is provider-specific JSON: xrechnung requires {clientId, clientSecret} for ZRE API; sdi requires {certPath, certPassword} or {apiEndpoint, apiKey} for intermediary; ksef requires {authToken, nip}; facturx requires {clientId, clientSecret, siret} for Chorus Pro. ANAF config is managed separately via ANAF tokens.',
    inputSchema: z.object({
      provider: z
        .enum(['anaf', 'xrechnung', 'sdi', 'ksef', 'facturx'])
        .describe('E-invoicing provider to configure'),
      enabled: z.boolean().optional().describe('Whether this provider is active (default: true)'),
      config: z
        .record(z.unknown())
        .optional()
        .describe('Provider-specific configuration as JSON object'),
      companyId: z.string().optional().describe('Company UUID (uses default if not specified)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const body: Record<string, unknown> = { provider: params.provider };
      if (params.enabled !== undefined) body.enabled = params.enabled;
      if (params.config !== undefined) body.config = params.config;

      const res = await apiRequest(`/api/v1/companies/${companyId}/einvoice-config`, {
        method: 'POST',
        companyId,
        body,
      });
      return formatResponse(res);
    },
  },

  {
    name: 'einvoice_config_delete',
    description:
      'Delete an e-invoice provider configuration for a company. Removes the provider settings and disables submissions for that provider. Existing submissions are not affected.',
    inputSchema: z.object({
      provider: z
        .enum(['anaf', 'xrechnung', 'sdi', 'ksef', 'facturx'])
        .describe('E-invoicing provider to remove'),
      companyId: z.string().optional().describe('Company UUID (uses default if not specified)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(
        `/api/v1/companies/${companyId}/einvoice-config/${params.provider}`,
        {
          method: 'DELETE',
          companyId,
        }
      );
      return formatResponse(res);
    },
  },

  {
    name: 'einvoice_config_test',
    description:
      'Test e-invoice provider connection with given credentials before saving. Validates that the credentials can authenticate with the provider API. Supports: xrechnung (ZRE OAuth2), sdi (intermediary API or cert validation), ksef (session init), facturx (Chorus Pro OAuth2). ANAF uses a separate OAuth flow and cannot be tested here.',
    inputSchema: z.object({
      provider: z
        .enum(['xrechnung', 'sdi', 'ksef', 'facturx'])
        .describe('E-invoicing provider to test connection for'),
      config: z
        .record(z.unknown())
        .describe(
          'Provider-specific credentials to test. xrechnung: {clientId, clientSecret}; sdi: {apiEndpoint, apiKey} or {certPassword}; ksef: {authToken, nip}; facturx: {clientId, clientSecret}'
        ),
      companyId: z.string().optional().describe('Company UUID (uses default if not specified)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      const config = getConfig();
      if (!config.token) return notAuthenticated();
      const companyId = getCompanyId(params);
      if (!companyId) return noCompanySelected();

      const res = await apiRequest(
        `/api/v1/companies/${companyId}/einvoice-config/test`,
        {
          method: 'POST',
          companyId,
          body: { provider: params.provider, config: params.config },
        }
      );
      return formatResponse(res);
    },
  },
];
