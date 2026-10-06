import { z } from 'zod';
import { apiRequest } from '../client.js';
import { formatResponse, notAuthenticated } from '../utils/errors.js';
import { getConfig } from '../config.js';

/**
 * Calendar subscription: a personal iCalendar link with the expiries (vehicle documents,
 * contracts, certificates) and the fiscal deadlines of the companies the user can see, for
 * Apple Calendar, Google Calendar or Outlook. One per user and organization.
 */
const feedShape =
  'Returns { enabled, url (https iCalendar link), webcalUrl (opens the Subscribe sheet on iPhone / macOS), googleCalendarUrl, outlookUrl, includeExpiries, includeFiscal, canSeeExpiries, canSeeFiscal, createdAt, lastFetchedAt }, or { enabled: false, canSeeExpiries, canSeeFiscal } when off. The link is the credential (anyone holding it can read the deadlines): show it only to the user.';

export const tools = [
  {
    name: 'calendar_feed_get',
    description: `The user's calendar subscription in the current organization. ${feedShape}`,
    inputSchema: z.object({}),
    handler: async (): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest('/api/v1/calendar-feed'));
    },
  },
  {
    name: 'calendar_feed_enable',
    description: `Turn on the calendar subscription (idempotent: an existing one keeps its link). Events are all-day with alarms at 09:00: expiries at their remindDaysBefore threshold and the day before, fiscal deadlines 3 days and 1 day before; filed declarations and renewed items drop out at the next refresh. regenerate=true issues a new link and every older link stops working. ${feedShape}`,
    inputSchema: z.object({
      regenerate: z.boolean().optional().describe('Issue a new link; the old one stops working'),
      includeExpiries: z.boolean().optional().describe('Include expiries: vehicle documents, contracts, certificates (default true)'),
      includeFiscal: z.boolean().optional().describe('Include fiscal deadlines (default true)'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const body: Record<string, unknown> = {};
      for (const key of ['regenerate', 'includeExpiries', 'includeFiscal']) {
        if (params[key] !== undefined) body[key] = params[key];
      }
      return formatResponse(await apiRequest('/api/v1/calendar-feed', { method: 'POST', body }));
    },
  },
  {
    name: 'calendar_feed_update',
    description: `Change what the calendar subscription contains. Fails with NOT_ENABLED when it is off. ${feedShape}`,
    inputSchema: z.object({
      includeExpiries: z.boolean().optional().describe('Include expiries: vehicle documents, contracts, certificates'),
      includeFiscal: z.boolean().optional().describe('Include fiscal deadlines'),
    }),
    handler: async (params: Record<string, unknown>): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      const body: Record<string, unknown> = {};
      if (params.includeExpiries !== undefined) body.includeExpiries = params.includeExpiries;
      if (params.includeFiscal !== undefined) body.includeFiscal = params.includeFiscal;
      return formatResponse(await apiRequest('/api/v1/calendar-feed', { method: 'PATCH', body }));
    },
  },
  {
    name: 'calendar_feed_disable',
    description: 'Turn off the calendar subscription: every link stops working and subscribed calendars stop updating. Returns { enabled: false }.',
    inputSchema: z.object({}),
    handler: async (): Promise<string> => {
      if (!getConfig().token) return notAuthenticated();
      return formatResponse(await apiRequest('/api/v1/calendar-feed', { method: 'DELETE' }));
    },
  },
];
