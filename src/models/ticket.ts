import { z } from 'zod';

// A weekly export from a real ticketing platform is unlikely to fill in
// every column — most fields here are only known once the ticket has been
// triaged or resolved, which is exactly what this app is for. Missing or
// "N/A" values become `null` explicitly, not `undefined`, so every parsed
// row always has the same set of keys (insertBatch relies on that).
const emptyToNull = (val: unknown) => (val === '' || val === undefined || val === 'N/A' ? null : val);
const emptyToUndefined = (val: unknown) => (val === '' || val === undefined ? undefined : val);

const nullableString = z.preprocess(emptyToNull, z.string().nullable());
const nullableNumber = z.preprocess(emptyToNull, z.coerce.number().nullable());
const nullableDate = z.preprocess(emptyToNull, z.iso.date().nullable());
const nullableEnum = (values: [string, ...string[]]) => z.preprocess(emptyToNull, z.enum(values).nullable());

// Same Yes/No/true/false parsing as before, but missing input defaults to
// `false` (not `null`) — a freshly imported ticket hasn't been escalated or
// breached its SLA yet, and the DB column is NOT NULL.
const csvBooleanDefaultFalse = z.preprocess((val) => {
  if (val === '' || val === undefined) return false;
  if (typeof val !== 'string') return val;
  const normalized = val.trim().toLowerCase();
  if (normalized === 'true' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === 'no') return false;
  return val;
}, z.boolean());

export const TicketSchema = z.object({
  ticket_id: z.coerce.number(),
  customer_name: z.string().min(1),
  customer_email: z.email(),
  issue_description: z.string().min(1),
  ticket_created_date: z.iso.date(),

  status: z.preprocess(
    emptyToUndefined,
    z.enum(['Closed', 'In Progress', 'Open', 'Pending Customer', 'Resolved']).default('Open'),
  ),
  escalated: csvBooleanDefaultFalse,
  sla_breached: csvBooleanDefaultFalse,

  product: nullableEnum([
    'API Service',
    'Analytics Dashboard',
    'Billing System',
    'CRM Platform',
    'Cloud Storage',
    'E-commerce Store',
    'Mobile App',
    'Payment Gateway',
    'Subscription Service',
    'Web Portal',
  ]),
  category: nullableEnum([
    'Account Suspension',
    'Bug Report',
    'Data Sync Issue',
    'Feature Request',
    'Login Issue',
    'Payment Problem',
    'Performance Issue',
    'Refund Request',
    'Security Concern',
    'Subscription Cancellation',
  ]),
  resolution_notes: nullableString,
  priority: nullableEnum(['High', 'Low', 'Medium', 'Urgent']),
  channel: nullableEnum(['Chat', 'Email', 'Phone', 'Social Media', 'Web Form']),
  region: nullableEnum(['Africa', 'Asia', 'Australia', 'Europe', 'North America', 'South America']),
  customer_age: nullableNumber,
  customer_gender: nullableEnum(['Female', 'Male', 'Other']),
  subscription_type: nullableEnum(['Basic', 'Enterprise', 'Free', 'Premium']),
  customer_tenure_months: nullableNumber,
  previous_tickets: nullableNumber,
  customer_satisfaction_score: nullableNumber,
  first_response_time_hours: nullableNumber,
  resolution_time_hours: nullableNumber,
  ticket_resolved_date: nullableDate,
  operating_system: nullableEnum(['Android', 'Linux', 'MacOS', 'Windows', 'iOS']),
  browser: nullableEnum(['Chrome', 'Edge', 'Firefox', 'Safari']),
  payment_method: nullableEnum(['Bank Transfer', 'Credit Card', 'Crypto', 'Debit Card', 'PayPal']),
  language: nullableEnum(['Chinese', 'English', 'French', 'German', 'Japanese', 'Spanish']),
  preferred_contact_time: nullableEnum(['Afternoon', 'Evening', 'Morning', 'Night']),
  issue_complexity_score: nullableNumber,
  customer_segment: nullableEnum(['Corporate', 'Individual', 'Small Business']),
});

export type Ticket = z.infer<typeof TicketSchema>;
