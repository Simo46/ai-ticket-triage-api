import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';

describe('request id', () => {
  it('sends a UUID-shaped X-Request-Id header on every response', async () => {
    const response = await request(app).get('/');

    expect(response.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('generates a different id for each request', async () => {
    const first = await request(app).get('/');
    const second = await request(app).get('/');

    expect(first.headers['x-request-id']).not.toBe(second.headers['x-request-id']);
  });

  it('includes the same id in an error response body as in the header', async () => {
    const response = await request(app).post('/api/rest/tickets/bulk-import');

    expect(response.body.requestId).toBe(response.headers['x-request-id']);
  });
});
