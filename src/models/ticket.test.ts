import { describe, it, expect } from 'vitest';
import { TicketSchema } from './ticket.js';

// "Raw" valid row, as it would actually arrive from a CSV (everything is a string).
// Every test starts from this and overrides a single field, so the test isolates
// exactly the behavior it wants to verify.
const validRow = {
  ticket_id: '1',
  customer_name: 'John Doe',
  customer_email: 'john@example.com',
  product: 'API Service',
  category: 'Bug Report',
  issue_description: 'Something broke',
  resolution_notes: 'Fixed it',
  priority: 'High',
  status: 'Resolved',
  channel: 'Email',
  region: 'Europe',
  customer_age: '30',
  customer_gender: 'Male',
  subscription_type: 'Premium',
  customer_tenure_months: '12',
  previous_tickets: '2',
  customer_satisfaction_score: '4.5',
  first_response_time_hours: '1.2',
  resolution_time_hours: '3.4',
  ticket_created_date: '2026-01-01',
  ticket_resolved_date: '2026-01-02',
  escalated: 'No',
  sla_breached: 'No',
  operating_system: 'Linux',
  browser: 'Chrome',
  payment_method: 'Credit Card',
  language: 'English',
  preferred_contact_time: 'Morning',
  issue_complexity_score: '3.2',
  customer_segment: 'Corporate',
};

describe('TicketSchema', () => {
  it('accepts a fully valid row', () => {
    const result = TicketSchema.safeParse(validRow);
    expect(result.success).toBe(true);
  });

  describe('boolean coercion (escalated / sla_breached)', () => {
    it('accepts "Yes" as true', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.escalated = 'Yes';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(true);
      expect(result.data?.escalated).toBe(true);
    });

    it('accepts "No" as false', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.escalated = 'No';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(true);
      expect(result.data?.escalated).toBe(false);
    });

    it('rejects a value that is neither Yes/No nor true/false', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.escalated = 'RandomValue';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(false);
    });
  });

  describe('nullable browser', () => {
    it('converts "N/A" to null', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.browser = 'N/A';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(true);
      expect(result.data?.browser).toBe(null);
    });

    it('converts an empty string to null', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.browser = '';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(true);
      expect(result.data?.browser).toBe(null);
    });

    it('accepts a valid browser among the listed ones', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.browser = 'Firefox';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(true);
      expect(result.data?.browser).toBe('Firefox');
    });
  });

  describe('invalid enums', () => {
    it('rejects a priority value not present in the enum', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.priority = 'More then urgent';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(false);
    });
  });

  describe('numeric coercion', () => {
    it('converts customer_age from string to number', () => {
      const validRowCopy = structuredClone(validRow);
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(true);
      expect(result.data?.customer_age).toBe(30);
    });
  });

  describe('required fields', () => {
    it('rejects a row with no customer_email', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.customer_email = '';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(false);
    });
  });

  describe('date validation', () => {
    it('rejects a malformed ticket_created_date', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.ticket_created_date = '2026-13-40';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(false);
    });

    it('accepts a missing ticket_resolved_date as null', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.ticket_resolved_date = '';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(true);
      expect(result.data?.ticket_resolved_date).toBe(null);
    });
  });

  describe('nullable/default fields when a column is missing', () => {
    it('leaves an optional field like category as null', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.category = '';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(true);
      expect(result.data?.category).toBe(null);
    });

    it('defaults status to "Open"', () => {
      const validRowCopy = structuredClone(validRow);
      validRowCopy.status = '';
      const result = TicketSchema.safeParse(validRowCopy);
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('Open');
    });
  });
});
