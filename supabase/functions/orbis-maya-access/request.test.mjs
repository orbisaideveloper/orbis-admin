import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { decideAccess } from './core.mjs';

// Exercise request boundaries without starting Deno or opening a database.
const source = stripTypeScriptTypes(
  readFileSync(new URL('./index.ts', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, ''),
);

function handler() {
  let serve;
  runInNewContext(source, {
    Deno: { serve: fn => { serve = fn; }, env: { get: () => undefined } },
    postgres: () => { throw new Error('Unexpected database connection'); },
    decideAccess, Response, TextDecoder, Uint8Array,
  });
  assert.equal(typeof serve, 'function');
  return serve;
}

function request(body = '{}', headers = {}) {
  return new Request('https://example.test/access', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-orbis-service-key': 'test-key', ...headers },
    ...(body === null ? {} : { body }),
  });
}

async function expectResponse(input, status, error) {
  const response = await handler()(input);
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), { error });
  assert.equal(response.headers.get('cache-control'), 'no-store');
}

test('rejects unsupported methods', async () => {
  await expectResponse(new Request('https://example.test/access'), 405, 'method_not_allowed');
});

test('rejects missing or whitespace-only service keys', async () => {
  for (const key of ['', '   ']) {
    await expectResponse(request('{}', { 'x-orbis-service-key': key }), 401, 'service_key_required');
  }
});

test('requires JSON content type', async () => {
  await expectResponse(request('{}', { 'content-type': 'text/plain' }), 400, 'json_required');
});

test('rejects missing bodies and malformed JSON', async () => {
  for (const body of [null, '{']) {
    await expectResponse(request(body), 400, 'invalid_request');
  }
});

test('accepts a valid body at the 4096-byte boundary before checking configuration', async () => {
  await expectResponse(request(JSON.stringify('x'.repeat(4094))), 503, 'policy_unavailable');
});

test('rejects 4097-byte bodies before accessing configuration', async () => {
  await expectResponse(request(JSON.stringify('x'.repeat(4095))), 413, 'input_too_large');
});

test('counts bytes rather than Unicode characters', async () => {
  await expectResponse(request(JSON.stringify('é'.repeat(2048))), 413, 'input_too_large');
});

test('counts chunks together and cancels an oversized stream', async () => {
  let reads = 0;
  let cancelled = false;
  const streamRequest = {
    method: 'POST', headers: request().headers,
    body: { getReader: () => ({
      read: async () => ({ done: false, value: new Uint8Array(++reads === 1 ? 3000 : 1097) }),
      cancel: async () => { cancelled = true; },
    }) },
  };
  await expectResponse(streamRequest, 413, 'input_too_large');
  assert.equal(reads, 2);
  assert.equal(cancelled, true);
});

test('returns invalid_request when the input stream fails', async () => {
  await expectResponse({
    method: 'POST', headers: request().headers,
    body: { getReader: () => ({ read: async () => { throw new Error('Disconnected'); } }) },
  }, 400, 'invalid_request');
});
