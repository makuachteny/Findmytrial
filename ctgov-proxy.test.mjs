import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { createCtgovProxy } from './ctgov-proxy.mjs';

let time;
let requests;
let timestamp;
let studyStatus;

const fakeFetch = async (url) => {
  requests.push(url);
  if (url.endsWith('/version')) return new Response(JSON.stringify({ dataTimestamp: timestamp }));
  return new Response('{"studies":[]}', { status: studyStatus });
};
const proxy = (options) => createCtgovProxy({ fetchImpl: fakeFetch, now: () => time, ...options });
const studyCalls = () => requests.filter((url) => !url.endsWith('/version')).length;

beforeEach(() => {
  time = 0;
  requests = [];
  timestamp = 'one';
  studyStatus = 200;
});

test('serves repeat searches from cache, whatever the parameter order', async () => {
  const handle = proxy();
  assert.equal((await handle('/studies', 'query.cond=asthma&pageSize=9')).headers['X-Cache'], 'MISS');
  assert.equal((await handle('/studies', 'pageSize=9&query.cond=asthma')).headers['X-Cache'], 'HIT');
  assert.equal(studyCalls(), 1);
});

test('drops the cache once the registry publishes new data', async () => {
  const handle = proxy({ versionTtlMs: 1000 });
  await handle('/studies', 'query.cond=asthma');
  timestamp = 'two';
  time = 500;
  assert.equal((await handle('/studies', 'query.cond=asthma')).headers['X-Cache'], 'HIT');
  time = 2000;
  assert.equal((await handle('/studies', 'query.cond=asthma')).headers['X-Cache'], 'MISS');
});

test('refuses anything outside the search API', async () => {
  const handle = proxy();
  assert.equal((await handle('/studies/metadata', '')).status, 404);
  assert.equal((await handle('/studies/NCT1/../..', '')).status, 404);
  assert.equal((await handle('/../internal', '')).status, 404);
  assert.equal((await handle('/studies', 'format=csv')).status, 400);
  assert.equal(studyCalls(), 0);
});

test('caches a missing study so bad links do not reach the registry twice', async () => {
  studyStatus = 404;
  const handle = proxy();
  assert.equal((await handle('/studies/NCT00000000', '')).status, 404);
  assert.equal((await handle('/studies/NCT00000000', '')).headers['X-Cache'], 'HIT');
});

test('holds traffic under the per-minute limit, then recovers', async () => {
  const handle = proxy({ maxPerMinute: 2 });
  await handle('/studies', 'query.cond=a');
  assert.equal((await handle('/studies', 'query.cond=b')).status, 503);
  time = 61_000;
  assert.equal((await handle('/studies', 'query.cond=b')).status, 200);
});

test('falls back to the last answer when the registry fails', async () => {
  let down = false;
  const handle = createCtgovProxy({
    now: () => time,
    versionTtlMs: 1000,
    fetchImpl: async (url) => {
      if (down) throw new Error('offline');
      return fakeFetch(url);
    },
  });
  await handle('/studies', 'query.cond=asthma');
  timestamp = 'two';
  await handle('/studies', 'query.cond=other');
  down = true;
  assert.equal((await handle('/studies', 'query.cond=asthma')).headers['X-Cache'], 'HIT');
  assert.equal((await handle('/studies', 'query.cond=new')).status, 502);
});

test('does not cache upstream errors', async () => {
  studyStatus = 500;
  const handle = proxy();
  assert.equal((await handle('/studies', 'query.cond=asthma')).status, 502);
  studyStatus = 200;
  assert.equal((await handle('/studies', 'query.cond=asthma')).status, 200);
});
