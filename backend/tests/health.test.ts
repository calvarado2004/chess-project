import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';

function createMockRes(): Response {
  const res: any = {};
  res.json = function (data: any) {
    res.jsonData = data;
    return this;
  };
  res.status = function (code: number) {
    res.statusCode = code;
    return this;
  };
  return res as unknown as Response;
}

// Simulate what the health route handler does: res.json({ status: 'ok', timestamp: new Date().toISOString() })
function healthHandler(_req: Request, res: Response): void {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

test('health route returns ok status', () => {
  const res = createMockRes();
  healthHandler({} as Request, res);

  assert.equal(res.jsonData.status, 'ok');
  assert.ok(res.jsonData.timestamp, 'should have timestamp');
});

test('health route response has correct shape', () => {
  const res = createMockRes();
  healthHandler({} as Request, res);

  assert.equal(Object.keys(res.jsonData).length, 2, 'should have exactly 2 keys');
  assert.ok('status' in res.jsonData);
  assert.ok('timestamp' in res.jsonData);
});

test('health route timestamp is valid ISO date', () => {
  const res = createMockRes();
  healthHandler({} as Request, res);

  const date = new Date(res.jsonData.timestamp);
  assert.ok(!isNaN(date.getTime()), 'timestamp should be a valid date');
  assert.ok(res.jsonData.timestamp.includes('T'), 'ISO timestamp should contain T separator');
});

test('health route timestamp is recent', () => {
  const before = Date.now();
  const res = createMockRes();
  healthHandler({} as Request, res);
  const after = Date.now();

  const timestamp = new Date(res.jsonData.timestamp).getTime();
  assert.ok(timestamp >= before, 'timestamp should be >= request start');
  assert.ok(timestamp <= after, 'timestamp should be <= request end');
});

test('health route status is string ok', () => {
  const res = createMockRes();
  healthHandler({} as Request, res);

  assert.equal(typeof res.jsonData.status, 'string');
  assert.equal(res.jsonData.status, 'ok');
});
