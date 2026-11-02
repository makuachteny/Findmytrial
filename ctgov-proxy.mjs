// Forwards trial searches to ClinicalTrials.gov so patients' health searches don't go
// straight from their browser to a third party, and caches each answer until the
// registry publishes new data.
const UPSTREAM = 'https://clinicaltrials.gov/api/v2';
const PATHS = [/^\/version$/, /^\/studies$/, /^\/studies\/NCT\d{8}$/];
const PARAMS = new Set([
  'query.cond',
  'query.term',
  'query.locn',
  'filter.overallStatus',
  'filter.geo',
  'filter.ids',
  'filter.advanced',
  'fields',
  'sort',
  'pageSize',
  'pageToken',
  'countTotal',
]);
const JSON_TYPE = { 'Content-Type': 'application/json; charset=utf-8' };

const failure = (status, error) => ({ status, headers: JSON_TYPE, body: JSON.stringify({ error }) });

export function createCtgovProxy({
  fetchImpl = fetch,
  now = Date.now,
  // ClinicalTrials.gov publishes no limit. Third-party reports say about 50 a minute, so stay under that.
  maxPerMinute = 40,
  versionTtlMs = 10 * 60_000,
  maxEntries = 500,
} = {}) {
  const cache = new Map();
  let calls = [];
  let version = { dataTimestamp: null, body: null, checkedAt: -Infinity };

  function takeSlot() {
    const windowStart = now() - 60_000;
    calls = calls.filter((at) => at > windowStart);
    if (calls.length >= maxPerMinute) return false;
    calls.push(now());
    return true;
  }

  async function upstream(path) {
    if (!takeSlot()) throw new Error('busy');
    return fetchImpl(`${UPSTREAM}${path}`, { signal: AbortSignal.timeout(15_000) });
  }

  async function currentVersion() {
    if (now() - version.checkedAt < versionTtlMs) return version;
    try {
      const response = await upstream('/version');
      if (response.ok) {
        const body = await response.text();
        version = { dataTimestamp: JSON.parse(body).dataTimestamp, body, checkedAt: now() };
      }
    } catch {
      // Keep the last known version; a later request tries again.
    }
    return version;
  }

  function remember(key, entry) {
    cache.delete(key);
    cache.set(key, entry);
    if (cache.size > maxEntries) cache.delete(cache.keys().next().value);
  }

  return async function handle(path, search) {
    if (!PATHS.some((pattern) => pattern.test(path))) return failure(404, 'Not found');
    const params = new URLSearchParams(search);
    for (const name of params.keys()) {
      if (!PARAMS.has(name)) return failure(400, `Unsupported parameter: ${name}`);
    }

    const { dataTimestamp, body: versionBody } = await currentVersion();
    if (path === '/version') {
      return versionBody ? { status: 200, headers: JSON_TYPE, body: versionBody } : failure(502, 'Registry unavailable');
    }

    params.sort();
    const query = params.toString();
    const key = `${path}?${query}`;
    const cached = cache.get(key);
    if (cached && cached.dataTimestamp === dataTimestamp) {
      remember(key, cached);
      return { status: cached.status, headers: { ...JSON_TYPE, 'X-Cache': 'HIT' }, body: cached.body };
    }

    try {
      const response = await upstream(query ? `${path}?${query}` : path);
      const body = await response.text();
      if (response.status !== 200 && response.status !== 404) return failure(502, 'Registry unavailable');
      remember(key, { dataTimestamp, status: response.status, body });
      return { status: response.status, headers: { ...JSON_TYPE, 'X-Cache': 'MISS' }, body };
    } catch (error) {
      if (cached) return { status: cached.status, headers: { ...JSON_TYPE, 'X-Cache': 'STALE' }, body: cached.body };
      return error.message === 'busy' ? failure(503, 'Too many requests. Try again shortly.') : failure(502, 'Registry unavailable');
    }
  };
}
