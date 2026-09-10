import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { pool } from '../../src/config/db.js';

describe('POST /api/rest/tickets/bulk-import', () => {
  it('reply 400 if no file is uploaded', async () => {
    const response = await request(app).post('/api/rest/tickets/bulk-import')
      .expect('Content-Type', /json/)
      .expect(400);
    expect(response.body.message).toBe('No file uploaded');
  });

  it('reply 400 if more then one file is sent', async () => {
    const response = await request(app).post('/api/rest/tickets/bulk-import')
      .attach('file', 'datasets/customer-support-tickets-dataset-200K-records/customer_support_tickets_200k.csv')
      .attach('file', 'datasets/customer-support-tickets-dataset-200K-records/customer_support_tickets_200k.csv')
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body.message).toBe('Too many files')
  });

  it('reply 415 if file is not CSV', async () => {
    const response = await request(app).post('/api/rest/tickets/bulk-import')
      .attach('file', 'datasets/customer-support-tickets-dataset-200K-records/non-csv-test-file.md')
      .expect('Content-Type', /json/)
      .expect(415);

    expect(response.body.message).toBe('File must be a CSV');
  });

  it('reply 413 if file is too large', async () => {
    const response = await request(app).post('/api/rest/tickets/bulk-import')
      .attach('file', 'datasets/customer-support-tickets-dataset-200K-records/big-file.csv')
      .expect('Content-Type', /json/)
      .expect(413);

    expect(response.body.message).toBe('File too large')
  });

  it('reply 201 if file is succesfully imported', async () => {
    const response = await request(app).post('/api/rest/tickets/bulk-import')
      .attach('file', 'test/fixtures/valid-tickets.csv')
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toEqual({
      total_rows: 2,
      imported_count: 2,
      failed_count: 0,
      errors: [],
      errors_truncated: false,
    });
  });

  it('reply 201 if file have some invalid rows', async () => {
    const response = await request(app).post('/api/rest/tickets/bulk-import')
      .attach('file', 'test/fixtures/mixed-valid-invalid.csv')
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      total_rows: 3,
      imported_count: 2,
      failed_count: 1
    });
  });

  it('reply 201 if file have duplicated rows', async () => {
    const response = await request(app).post('/api/rest/tickets/bulk-import')
      .attach('file', 'test/fixtures/duplicate-ticket.csv')
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toMatchObject({
      total_rows: 1,
      imported_count: 1,
      failed_count: 0,
      errors: []
    });

    const duplicateResponse = await request(app).post('/api/rest/tickets/bulk-import')
      .attach('file', 'test/fixtures/duplicate-ticket.csv')
      .expect('Content-Type', /json/)
      .expect(201);

    expect(duplicateResponse.body).toMatchObject({
      total_rows: 1,
      imported_count: 1,
      failed_count: 0,
      errors: []
    });

    const sql = `SELECT COUNT(*) FROM tickets WHERE ticket_id=900021`;
    const rowsNumber = await pool.query(sql);
    expect(Number(rowsNumber.rows[0].count)).toBe(1);
  });

  it('reply 201 and applies defaults when only the required fields are present', async () => {
    const response = await request(app).post('/api/rest/tickets/bulk-import')
      .attach('file', 'test/fixtures/minimal-ticket.csv')
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body).toEqual({
      total_rows: 1,
      imported_count: 1,
      failed_count: 0,
      errors: [],
      errors_truncated: false,
    });

    const sql = `SELECT status, escalated, sla_breached, category, priority, ticket_resolved_date FROM tickets WHERE ticket_id=900099`;
    const { rows } = await pool.query(sql);
    expect(rows[0]).toMatchObject({
      status: 'Open',
      escalated: false,
      sla_breached: false,
      category: null,
      priority: null,
      ticket_resolved_date: null,
    });
  });

  it('reply 400 if file have wrong headers', async () => {
    const response = await request(app).post('/api/rest/tickets/bulk-import')
      .attach('file', 'test/fixtures/wrong-headers.csv')
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body.message).toMatch(/wrong CSV headers/);
  });

  it('reply 400 if the CSV is malformed', async () => {
    const response = await request(app).post('/api/rest/tickets/bulk-import')
      .attach('file', 'test/fixtures/malformed.csv')
      .expect('Content-Type', /json/)
      .expect(400);

    // csv-parse raises CSV_QUOTE_NOT_CLOSED only at EOF, so this also proves
    // the real error survives pipeline's teardown instead of being replaced
    // by a generic AbortError.
    expect(response.body.message).toMatch(/[Qq]uote/);
    expect(response.body.requestId).toEqual(expect.any(String));
  });
});
