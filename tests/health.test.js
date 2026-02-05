import request from 'supertest';
import express from 'express';
import initializeApp from '../src/app.js';

let app;

beforeAll(async () => {
  app = express();
  initializeApp(app);
});

// ============================================================================
// A. Positive Test Cases - Health Endpoint
// ============================================================================

describe('A. Health Endpoint - Positive Tests', () => {

  test('A.1 - GET /health returns 200', async () => {
    const response = await request(app)
      .get('/health');

    expect(response.status).toBe(200);
  });

  test('A.2 - Health endpoint returns no body', async () => {
    const response = await request(app)
      .get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });

  test('A.3 - Health endpoint responds quickly', async () => {
    const startTime = Date.now();
    const response = await request(app)
      .get('/health');
    const endTime = Date.now();

    expect(response.status).toBe(200);
    expect(endTime - startTime).toBeLessThan(1000);
  });
});

// ============================================================================
// B. Negative Test Cases - HTTP Method Tests
// ============================================================================

describe('B. Health Endpoint - HTTP Method Tests', () => {

  test('B.1 - POST not allowed on health endpoint', async () => {
    const response = await request(app)
      .post('/health');

    expect(response.status).toBe(405);
  });

  test('B.2 - PUT not allowed on health endpoint', async () => {
    const response = await request(app)
      .put('/health');

    expect(response.status).toBe(405);
  });

  test('B.3 - DELETE not allowed on health endpoint', async () => {
    const response = await request(app)
      .delete('/health');

    expect(response.status).toBe(405);
  });

  test('B.4 - PATCH not allowed on health endpoint', async () => {
    const response = await request(app)
      .patch('/health');

    expect(response.status).toBe(405);
  });

  test('B.5 - OPTIONS not allowed on health endpoint', async () => {
    const response = await request(app)
      .options('/health');

    expect(response.status).toBe(405);
  });

  test('B.6 - HEAD not allowed on health endpoint', async () => {
    const response = await request(app)
      .head('/health');

    expect(response.status).toBe(405);
  });
});

// ============================================================================
// B. Negative Test Cases - Authentication Tests
// ============================================================================

describe('B. Health Endpoint - Authentication Tests', () => {

  test('B.7 - Health endpoint rejects auth headers', async () => {
    const authHeader = 'Basic ' + Buffer.from('user@work.com:password123').toString('base64');
    const response = await request(app)
      .get('/health')
      .set('Authorization', authHeader);

    expect(response.status).toBe(400);
  });
});

// ============================================================================
// C. Edge Case Tests - Response Format
// ============================================================================

describe('C. Health Endpoint - Edge Case Tests', () => {

  test('C.1 - Health endpoint rejects query parameters', async () => {
    const response = await request(app)
      .get('/health?foo=bar&baz=qux');

    expect(response.status).toBe(400);
  });
});
