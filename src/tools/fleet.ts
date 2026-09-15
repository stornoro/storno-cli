import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

const companyIdSchema = z.string().optional().describe('Company UUID (overrides STORNO_COMPANY_ID env var)');

const EXPIRY_KINDS = ['rca', 'itp', 'rovinieta', 'casco', 'tahograf', 'extinctor', 'trusa_medicala', 'licenta_transport', 'copie_conforma', 'leasing', 'certificat_digital', 'contract', 'autorizatie', 'other'] as const;
const OWNERSHIPS = ['own', 'leasing', 'rented'] as const;
const FUELS = ['benzina', 'motorina', 'gpl', 'hibrid', 'electric', 'altul'] as const;

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const expiryFields = {
  label: z.string().max(160).optional().describe('Display label (default: the kind\'s name, e.g. "RCA")'),
  number: z.string().max(100).optional().describe('Policy / certificate / contract number'),
  provider: z.string().max(120).optional().describe('Insurer, ITP station, leasing company, certificate provider …'),
  validFrom: dateSchema.optional().describe('Valid from, YYYY-MM-DD'),
  remindDaysBefore: z.number().int().min(0).max(365).optional().describe('First reminder this many days before (default 30); then 7, 1 and 0 days'),
  notes: z.string().optional(),
};

/**
 * Fleet (parc auto): the company's vehicles and their expiry items (RCA, ITP, rovinietă, CASCO,
 * tahograf, extinctor, trusă medicală, licență de transport, copie conformă, leasing end), plus
 * company-level expiries (certificat digital, contracts, autorizații). Renewing an item creates
 * the next one and closes the old one; members are notified before each expiry (`expiry.due`).
 */
export const tools = [
  {
    name: 'vehicles_list',
    description:
      'Vehicles of the company (parc auto) with, per vehicle, `nextExpiry` (the soonest open expiry item: kind, label, expiresAt, daysLeft, status ok | due | expired) and `counts` {expired, due, ok}. Filter with `active` and `search` (plate, make, model, driver, VIN).',
    inputSchema: z.object({
      active: z.boolean().optional().describe('Only active (true) or only inactive (false) vehicles'),
      search: z.string().optional(),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const query: Record<string, string | number | boolean | undefined> = { search: params.search as string | undefined };
      if (params.active !== undefined) query.active = params.active ? 1 : 0;
      return formatResponse(await apiRequest('/api/v1/vehicles', { query, companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'vehicles_get',
    description: 'One vehicle with its open expiry items, `counts` and `nextExpiry`.',
    inputSchema: z.object({ uuid: z.string().describe('Vehicle UUID'), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/vehicles/${params.uuid}`, { companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'vehicles_create',
    description: 'Add a vehicle to the company. The plate is normalised to upper case. Add its documents afterwards with `expiries_create` (vehicleId).',
    inputSchema: z.object({
      plate: z.string().max(20).describe('Registration plate, e.g. "B 123 ABC"'),
      vin: z.string().max(32).optional(),
      make: z.string().max(60).optional(),
      model: z.string().max(60).optional(),
      year: z.number().int().min(1950).optional().describe('Year of manufacture'),
      fuel: z.enum(FUELS).optional(),
      ownership: z.enum(OWNERSHIPS).optional().describe('own (default), leasing or rented'),
      driverName: z.string().max(120).optional(),
      notes: z.string().optional(),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const { companyId, ...body } = params;
      return formatResponse(await apiRequest('/api/v1/vehicles', { method: 'POST', body, companyId: companyId as string | undefined }));
    },
  },
  {
    name: 'vehicles_update',
    description: 'Update a vehicle (any field of vehicles_create, plus `active`). Send null to clear an optional field.',
    inputSchema: z.object({
      uuid: z.string().describe('Vehicle UUID'),
      plate: z.string().max(20).optional(),
      vin: z.string().max(32).nullable().optional(),
      make: z.string().max(60).nullable().optional(),
      model: z.string().max(60).nullable().optional(),
      year: z.number().int().nullable().optional(),
      fuel: z.enum(FUELS).nullable().optional(),
      ownership: z.enum(OWNERSHIPS).optional(),
      driverName: z.string().max(120).nullable().optional(),
      notes: z.string().nullable().optional(),
      active: z.boolean().optional().describe('false archives the vehicle (sold, returned); its expiries stop appearing in the lists filtered by active vehicles'),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const { uuid, companyId, ...body } = params;
      return formatResponse(await apiRequest(`/api/v1/vehicles/${uuid}`, { method: 'PATCH', body, companyId: companyId as string | undefined }));
    },
  },
  {
    name: 'vehicles_delete',
    description: 'Delete a vehicle and all its expiry items (history included). Prefer vehicles_update with active=false for a vehicle that left the fleet.',
    inputSchema: z.object({ uuid: z.string().describe('Vehicle UUID'), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/vehicles/${params.uuid}`, { method: 'DELETE', companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'expiries_list',
    description:
      'Expiry items of the company, soonest first (expired ones come first): vehicle documents and company-level items. Each item carries `daysLeft`, `status` (ok | due — within remindDaysBefore — | expired | renewed), `vehicle {id, plate, displayName}` (null for company-level items) and `renewedFromId`. Filters: `kind`, `vehicleId`, `companyLevel` (items without a vehicle), `includeClosed` (renewed items, for the history).',
    inputSchema: z.object({
      kind: z.enum(EXPIRY_KINDS).optional(),
      vehicleId: z.string().optional(),
      companyLevel: z.boolean().optional(),
      includeClosed: z.boolean().optional(),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const query: Record<string, string | number | undefined> = { kind: params.kind as string | undefined, vehicleId: params.vehicleId as string | undefined };
      if (params.companyLevel) query.companyLevel = 1;
      if (params.includeClosed) query.includeClosed = 1;
      return formatResponse(await apiRequest('/api/v1/expiries', { query, companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'expiries_upcoming',
    description:
      'What expires in the next `days` days (default 60, max 730), already expired items included, as flat rows {id, kind, label, number, provider, validFrom, expiresAt, daysLeft, status, remindDaysBefore, vehicleId, vehicle, notes} with `counts` {total, expired, due, ok}. The dashboard card uses the same list.',
    inputSchema: z.object({ days: z.number().int().min(1).max(730).optional(), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest('/api/v1/expiries/upcoming', { query: { days: params.days as number | undefined }, companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'expiries_create',
    description:
      'Record something with an expiry date. Kinds: rca, itp, rovinieta, casco, tahograf (calibration), extinctor, trusa_medicala, licenta_transport, copie_conforma, leasing (contract end) — usually with a `vehicleId` — and certificat_digital, contract, autorizatie, other for the company. Members get the `expiry.due` notification `remindDaysBefore` days before (default 30), then 7 and 1 days before and on the day.',
    inputSchema: z.object({
      kind: z.enum(EXPIRY_KINDS),
      expiresAt: dateSchema.describe('Expiry date, YYYY-MM-DD'),
      vehicleId: z.string().optional().describe('The vehicle the document belongs to; omit for a company-level item'),
      ...expiryFields,
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const { companyId, ...body } = params;
      return formatResponse(await apiRequest('/api/v1/expiries', { method: 'POST', body, companyId: companyId as string | undefined }));
    },
  },
  {
    name: 'expiries_get',
    description: 'One expiry item with `history`: the items it renewed, newest first.',
    inputSchema: z.object({ uuid: z.string().describe('Expiry item UUID'), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/expiries/${params.uuid}`, { companyId: params.companyId as string | undefined }));
    },
  },
  {
    name: 'expiries_update',
    description: 'Update an expiry item. Changing `expiresAt` restarts the reminders. `vehicleId: null` detaches it from the vehicle; `closed: true` closes it by hand (without creating the next one).',
    inputSchema: z.object({
      uuid: z.string().describe('Expiry item UUID'),
      kind: z.enum(EXPIRY_KINDS).optional(),
      expiresAt: dateSchema.optional(),
      vehicleId: z.string().nullable().optional(),
      closed: z.boolean().optional(),
      ...expiryFields,
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const { uuid, companyId, ...body } = params;
      return formatResponse(await apiRequest(`/api/v1/expiries/${uuid}`, { method: 'PATCH', body, companyId: companyId as string | undefined }));
    },
  },
  {
    name: 'expiries_renew',
    description:
      'Renew an expiry item: creates the next one (same kind, label, vehicle, provider and reminder setting) and closes the old one, kept as history (`renewedFrom`). Without `expiresAt` the usual validity of the kind is added to the old expiry (RCA / rovinietă / CASCO / certificate 12 months, ITP / tahograf 24, trusă medicală 36), counted from today when it had already expired. Returns `item` (the new one) and `previous`.',
    inputSchema: z.object({
      uuid: z.string().describe('Expiry item UUID to renew'),
      expiresAt: dateSchema.optional().describe('New expiry date, YYYY-MM-DD'),
      validFrom: dateSchema.optional().describe('Default: the old expiry date (or today when already expired)'),
      number: z.string().max(100).optional().describe('New policy / document number'),
      provider: z.string().max(120).optional().describe('Default: the old provider'),
      notes: z.string().optional(),
      companyId: companyIdSchema,
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const { uuid, companyId, ...body } = params;
      return formatResponse(await apiRequest(`/api/v1/expiries/${uuid}/renew`, { method: 'POST', body, companyId: companyId as string | undefined }));
    },
  },
  {
    name: 'expiries_delete',
    description: 'Delete an expiry item. To keep the history, renew it or close it (expiries_update closed=true) instead.',
    inputSchema: z.object({ uuid: z.string().describe('Expiry item UUID'), companyId: companyIdSchema }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest(`/api/v1/expiries/${params.uuid}`, { method: 'DELETE', companyId: params.companyId as string | undefined }));
    },
  },
];
