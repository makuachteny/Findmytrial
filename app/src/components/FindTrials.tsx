import { ArrowRight, Binoculars, Heart, MagnifyingGlass, MapPin } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { formatMiles, longDate, plural } from '../domain/format';
import { filterTrials, toggleSavedTrial } from '../domain/referrals';
import { searchRegistry } from '../domain/registry';
import { TRIALS } from '../domain/seed';
import type { Trial } from '../domain/types';
import { useAppState, useCurrentUser } from '../store/store';
import { useAct } from './act';
import { useDataDate } from './useDataDate';
import { Field, TrialStatusBadge } from './ui';

const MIN_REGISTRY_QUERY = 3;
const SEARCH_DELAY_MS = 400;

type RegistryFilters = { query: string; region: string; distance: string; recruitingOnly: boolean; phase: string; age: string };
type RegistryResult = { key: string; trials: Trial[]; total: number | null; nextPageToken: string | null; failed: boolean };

function useRegistrySearch(filters: RegistryFilters) {
  const [result, setResult] = useState<RegistryResult | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const active = filters.query.trim().length >= MIN_REGISTRY_QUERY;
  const key = JSON.stringify({ ...filters, query: filters.query.trim() });

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setMoreFailed(false);
      searchRegistry(filters, controller.signal)
        .then((page) => setResult({ key, ...page, failed: false }))
        .catch(() => {
          if (!controller.signal.aborted) setResult({ key, trials: [], total: null, nextPageToken: null, failed: true });
        });
    }, SEARCH_DELAY_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // `key` carries every filter.
  }, [active, key]);

  const current = active && result?.key === key ? result : null;

  const loadMore = () => {
    if (!current?.nextPageToken || loadingMore) return;
    setLoadingMore(true);
    setMoreFailed(false);
    searchRegistry({ ...filters, pageToken: current.nextPageToken }, new AbortController().signal)
      .then((page) => {
        setResult((latest) =>
          latest?.key === key
            ? { ...latest, trials: [...latest.trials, ...page.trials], nextPageToken: page.nextPageToken }
            : latest,
        );
      })
      .catch(() => setMoreFailed(true))
      .finally(() => setLoadingMore(false));
  };

  return {
    active,
    loading: active && !current,
    failed: current?.failed ?? false,
    trials: current?.trials ?? [],
    total: current?.total ?? null,
    hasMore: !!current?.nextPageToken,
    loadingMore,
    moreFailed,
    loadMore,
  };
}

function TrialCard({ trial, saved, onToggle }: { trial: Trial; saved: boolean; onToggle: () => void }) {
  return (
    <article className="trial-card">
      <div className="trial-card__top">
        <TrialStatusBadge status={trial.status} />
        <button
          type="button"
          className="save-btn"
          aria-pressed={saved}
          aria-label={saved ? `Remove ${trial.shortTitle} from saved` : `Save ${trial.shortTitle}`}
          onClick={onToggle}
        >
          <Heart size={18} weight={saved ? 'fill' : 'regular'} />
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      <div>
        <div className="eyebrow">
          {trial.condition} · {trial.phase}
        </div>
        <h3 className="trial-card__title">{trial.title}</h3>
      </div>
      <div className="meta-line">
        <MapPin />
        {trial.site} · {trial.city}
        {trial.distance !== null && ` · ${formatMiles(trial.distance, 'mi')}`}
        {!!trial.moreSites && ` · ${plural(trial.moreSites, 'more site')}`}
      </div>
      <p className="trial-card__summary">{trial.summary}</p>
      <Link className="btn btn--primary btn--start" to={trial.id}>
        View trial
        <ArrowRight />
      </Link>
    </article>
  );
}

export function FindTrials() {
  const [params, setParams] = useSearchParams();
  const state = useAppState();
  const user = useCurrentUser();
  const act = useAct();
  // Local state keeps typing responsive; the URL mirrors it so "Back to results" restores the filters.
  const [filters, setFilters] = useState(() => ({
    query: params.get('q') ?? '',
    region: params.get('region') ?? 'all',
    distance: params.get('distance') ?? 'any',
    recruitingOnly: params.get('recruiting') === '1',
    phase: params.get('phase') ?? '',
    age: params.get('age') ?? '',
  }));
  const { query, region, distance, recruitingOnly, phase, age } = filters;
  const saved = useMemo(() => (user && state.saved[user.id]) || [], [state.saved, user]);
  const registry = useRegistrySearch(filters);
  const dataDate = useDataDate(registry.active);

  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set('q', query);
    if (region !== 'all') next.set('region', region);
    if (distance !== 'any') next.set('distance', distance);
    if (recruitingOnly) next.set('recruiting', '1');
    if (phase) next.set('phase', phase);
    if (age) next.set('age', age);
    setParams(next, { replace: true });
  }, [query, region, distance, recruitingOnly, phase, age, setParams]);

  const setFilter = (change: Partial<typeof filters>) => setFilters((current) => ({ ...current, ...change }));

  const trials = filterTrials(TRIALS, filters);
  const total = trials.length + (registry.total ?? registry.trials.length);
  const toggle = (trial: Trial) => {
    const wasSaved = saved.includes(trial.id);
    if (user) act((s) => toggleSavedTrial(s, user, trial), wasSaved ? 'Trial removed from saved' : 'Trial saved');
  };
  const card = (trial: Trial) => (
    <TrialCard key={trial.id} trial={trial} saved={saved.includes(trial.id)} onToggle={() => toggle(trial)} />
  );

  return (
    <section className="stack stack--24">
      <div>
        <h1 className="page-title page-title--tight">Find a trial</h1>
        <p className="muted">Search by condition. Potential matches still require eligibility review by the research team.</p>
      </div>
      <div className="filters">
        <Field label="Condition">
          {(id) => (
            <div className="search-input">
              <MagnifyingGlass size={16} />
              <input
                id={id}
                className="input"
                value={query}
                placeholder="e.g. type 2 diabetes, asthma, migraine"
                onChange={(e) => setFilter({ query: e.target.value })}
              />
            </div>
          )}
        </Field>
        <Field label="Location">
          {(id) => (
            <select id={id} className="input" value={region} onChange={(e) => setFilter({ region: e.target.value })}>
              <option value="all">All locations</option>
              <option value="MA">Massachusetts</option>
              <option value="RI">Rhode Island</option>
              <option value="CT">Connecticut</option>
            </select>
          )}
        </Field>
        <Field label="Distance from Boston">
          {(id) => (
            <select id={id} className="input" value={distance} onChange={(e) => setFilter({ distance: e.target.value })}>
              <option value="any">Any distance</option>
              <option value="10">Within 10 miles</option>
              <option value="25">Within 25 miles</option>
              <option value="50">Within 50 miles</option>
              <option value="100">Within 100 miles</option>
            </select>
          )}
        </Field>
        <Field label="Phase">
          {(id) => (
            <select id={id} className="input" value={phase} onChange={(e) => setFilter({ phase: e.target.value })}>
              <option value="">Any phase</option>
              <option value="Phase 1">Phase 1</option>
              <option value="Phase 2">Phase 2</option>
              <option value="Phase 3">Phase 3</option>
              <option value="Phase 4">Phase 4</option>
            </select>
          )}
        </Field>
        <Field label="Age group">
          {(id) => (
            <select id={id} className="input" value={age} onChange={(e) => setFilter({ age: e.target.value })}>
              <option value="">Any age</option>
              <option value="CHILD">Children (under 18)</option>
              <option value="ADULT">Adults (18 to 64)</option>
              <option value="OLDER_ADULT">Older adults (65+)</option>
            </select>
          )}
        </Field>
        <label className="check">
          <input
            type="checkbox"
            checked={recruitingOnly}
            onChange={(e) => setFilter({ recruitingOnly: e.target.checked })}
          />
          Recruiting only
        </label>
      </div>
      <div className="result-line">
        <span>{plural(total, 'trial').replace(/^\d+/, total.toLocaleString('en-US'))}</span>
        <span>{saved.length} saved</span>
      </div>
      {trials.length > 0 && (
        <section className="stack">
          {registry.active && <h2 className="section-title">Sample trials</h2>}
          <div className="trial-grid">{trials.map(card)}</div>
        </section>
      )}
      {registry.active && (
        <section className="stack" aria-live="polite">
          <div>
            <h2 className="section-title">Real studies from ClinicalTrials.gov</h2>
            <p className="meta-note">
              {registry.loading && 'Searching ClinicalTrials.gov…'}
              {registry.failed && 'ClinicalTrials.gov could not be reached. Try again in a moment.'}
              {!registry.loading && !registry.failed && (
                <>
                  Source: ClinicalTrials.gov{dataDate && `, data processed ${longDate(dataDate)}`}. Sites shown are the nearest
                  to Boston.
                </>
              )}
            </p>
          </div>
          {registry.trials.length > 0 && <div className="trial-grid">{registry.trials.map(card)}</div>}
          {registry.moreFailed && <p className="meta-note">More studies could not be loaded. Try again.</p>}
          {registry.hasMore && (
            <button
              type="button"
              className="btn btn--outline btn--start"
              disabled={registry.loadingMore}
              onClick={registry.loadMore}
            >
              {registry.loadingMore ? 'Loading…' : 'Load more studies'}
            </button>
          )}
        </section>
      )}
      {total === 0 && !registry.loading && (
        <div className="empty empty--large">
          <Binoculars size={40} />
          <div className="empty__title">No trials match these filters</div>
          <div className="muted">Try a broader condition term or a wider distance. New trials open regularly.</div>
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => setFilter({ query: '', region: 'all', distance: 'any', recruitingOnly: false, phase: '', age: '' })}
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
