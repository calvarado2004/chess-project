import assert from 'node:assert/strict';
import test from 'node:test';
import { z } from 'zod';
import { validate } from '../src/middleware/validate.js';
import type { Request, Response, NextFunction } from 'express';

// Mock Express request/response/next
function createMockReq(body: any = {}): Request {
  return { body } as unknown as Request;
}

function createMockRes(): Response {
  const res: any = {};
  res.status = function (code: number) {
    res.statusCode = code;
    return this;
  };
  res.json = function (data: any) {
    res.jsonData = data;
    return this;
  };
  return res as unknown as Response;
}

function createMockNext(): [NextFunction, { called: boolean; error: any }] {
  const state = { called: false, error: null };
  const next = function (err?: any) {
    state.called = true;
    state.error = err;
  } as NextFunction;
  return [next, state];
}

// ---------- validate middleware with valid data ----------

test('validate passes valid data through', () => {
  const schema = z.object({ username: z.string(), age: z.number() });
  const middleware = validate(schema);
  const req = createMockReq({ username: 'alice', age: 30 });
  const res = createMockRes();
  const [next, state] = createMockNext();

  middleware(req, res, next);

  assert.ok(state.called, 'next should be called');
  assert.deepEqual(req.body, { username: 'alice', age: 30 });
});

test('validate passes parsed data through', () => {
  const schema = z.object({ count: z.number() });
  const middleware = validate(schema);
  const req = createMockReq({ count: 42 });
  const res = createMockRes();
  const [next, state] = createMockNext();

  middleware(req, res, next);

  assert.ok(state.called);
});

test('validate rejects missing required field', () => {
  const schema = z.object({ username: z.string() });
  const middleware = validate(schema);
  const req = createMockReq({});
  const res = createMockRes();
  const [next, state] = createMockNext();

  middleware(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.equal(res.jsonData.error, 'Validation failed');
  assert.ok(Array.isArray(res.jsonData.errors));
});

test('validate rejects wrong type', () => {
  const schema = z.object({ age: z.number() });
  const middleware = validate(schema);
  const req = createMockReq({ age: 'not-a-number' });
  const res = createMockRes();
  const [next, state] = createMockNext();

  middleware(req, res, next);

  assert.equal(res.statusCode, 400);
});

test('validate rejects invalid email format', () => {
  const schema = z.object({ email: z.string().email() });
  const middleware = validate(schema);
  const req = createMockReq({ email: 'not-an-email' });
  const res = createMockRes();
  const [next, state] = createMockNext();

  middleware(req, res, next);

  assert.equal(res.statusCode, 400);
});

test('validate rejects nested invalid data', () => {
  const schema = z.object({ user: z.object({ name: z.string() }) });
  const middleware = validate(schema);
  const req = createMockReq({ user: { name: 123 } });
  const res = createMockRes();
  const [next, state] = createMockNext();

  middleware(req, res, next);

  assert.equal(res.statusCode, 400);
  const err = res.jsonData.errors.find((e: any) => e.field === 'user.name');
  assert.ok(err, 'should have error for nested field user.name');
});

test('validate returns multiple errors for multiple failures', () => {
  const schema = z.object({ username: z.string(), age: z.number() });
  const middleware = validate(schema);
  const req = createMockReq({ username: 123, age: 'old' });
  const res = createMockRes();
  const [next, state] = createMockNext();

  middleware(req, res, next);

  assert.equal(res.statusCode, 400);
  assert.ok(res.jsonData.errors.length >= 2, 'should have at least 2 errors');
});

test('validate rejects extra fields with strict schema', () => {
  const schema = z.object({ username: z.string() }).strict();
  const middleware = validate(schema);
  const req = createMockReq({ username: 'alice', extra: 'field' });
  const res = createMockRes();
  const [next, state] = createMockNext();

  middleware(req, res, next);

  assert.equal(res.statusCode, 400);
});

test('validate handles empty body for schema with no required fields', () => {
  const schema = z.object({ optional: z.string().optional() });
  const middleware = validate(schema);
  const req = createMockReq({});
  const res = createMockRes();
  const [next, state] = createMockNext();

  middleware(req, res, next);

  assert.ok(state.called);
});

test('validate rejects empty body when fields are required', () => {
  const schema = z.object({ username: z.string() });
  const middleware = validate(schema);
  const req = createMockReq({});
  const res = createMockRes();
  const [next, state] = createMockNext();

  middleware(req, res, next);

  assert.equal(res.statusCode, 400);
});

test('validate error has field and message', () => {
  const schema = z.object({ username: z.string() });
  const middleware = validate(schema);
  const req = createMockReq({ username: 123 });
  const res = createMockRes();
  const [next, state] = createMockNext();

  middleware(req, res, next);

  const err = res.jsonData.errors[0];
  assert.ok('field' in err, 'error should have field');
  assert.ok('message' in err, 'error should have message');
  assert.equal(err.field, 'username');
});
