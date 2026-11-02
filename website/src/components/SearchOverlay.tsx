import { ArrowRight, MagnifyingGlass } from '@phosphor-icons/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { SEARCH_SUGGESTIONS } from '../data/content';
import { signInAs } from '../lib/links';
import { fetchDataDate, searchTrials, type Trial } from '../lib/trials';
import { Overlay } from './Overlay';

type Status = 'idle' | 'loading' | 'done' | 'error';

const SERVICE_ERROR = "Trial search didn't respond. Check your connection and try again.";

function TrialRow({ trial }: { trial: Trial }) {
  return (
    <li className="trial">
      <div className="trial__main">
        <h3>
          <a href={trial.url} target="_blank" rel="noreferrer">
            {trial.title}
            <span className="visually-hidden"> (opens ClinicalTrials.gov in a new tab)</span>
          </a>
        </h3>
        <p className="trial__summary">{trial.summary}</p>
      </div>
      <div className="trial__side">
        <dl>
          <div>
            <dt>Study type</dt>
            <dd>{trial.design}</dd>
          </div>
          <div>
            <dt>Ages</dt>
            <dd>{trial.ages}</dd>
          </div>
          <div>
            <dt>Sites</dt>
            <dd>
              {trial.sites.length > 0 ? trial.sites.join('; ') : 'Not listed yet'}
              {trial.moreSites > 0 && `, and ${trial.moreSites} more`}
            </dd>
          </div>
        </dl>
        <a className="button button--solid" href={signInAs('patient', trial.id)}>
          View study contacts
        </a>
      </div>
    </li>
  );
}

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [trials, setTrials] = useState<Trial[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreFailed, setMoreFailed] = useState(false);
  const [dataDate, setDataDate] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  // The results still work without the date, so a failed lookup just leaves it out.
  useEffect(() => {
    const controller = new AbortController();
    fetchDataDate(controller.signal).then(setDataDate, () => undefined);
    return () => controller.abort();
  }, []);

  const startRequest = () => {
    pending.current?.abort();
    pending.current = new AbortController();
    return pending.current.signal;
  };

  const search = async (condition: string) => {
    const signal = startRequest();
    setSearched(condition.trim());
    setStatus('loading');
    setLoadingMore(false);
    setMoreFailed(false);
    try {
      const result = await searchTrials(condition, undefined, signal);
      setTrials(result.trials);
      setTotal(result.total);
      setNextPage(result.nextPageToken);
      setStatus('done');
    } catch {
      if (!signal.aborted) setStatus('error');
    }
  };

  const loadMore = async () => {
    if (!nextPage) return;
    const signal = startRequest();
    setLoadingMore(true);
    setMoreFailed(false);
    try {
      const result = await searchTrials(searched, nextPage, signal);
      setTrials((existing) => [...existing, ...result.trials]);
      setNextPage(result.nextPageToken);
    } catch {
      if (!signal.aborted) setMoreFailed(true);
    } finally {
      if (!signal.aborted) setLoadingMore(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (query.trim()) void search(query);
  };

  const pick = (suggestion: string) => {
    setQuery(suggestion);
    void search(suggestion);
  };

  return (
    <Overlay label="Search trials" onClose={onClose}>
      <div className="search">
        <h2>What can we help you find?</h2>
        <form className="search__form" onSubmit={submit}>
          <MagnifyingGlass size={22} aria-hidden="true" />
          <input
            data-autofocus
            type="text"
            inputMode="search"
            enterKeyHint="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by condition, e.g. type 2 diabetes"
            aria-label="Search by condition"
            autoComplete="off"
          />
          <button type="submit" aria-label="Search" disabled={status === 'loading'}>
            <ArrowRight size={26} aria-hidden="true" />
          </button>
        </form>

        {status === 'idle' && (
          <ul className="search__suggestions">
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <li key={suggestion}>
                <button type="button" onClick={() => pick(suggestion)}>
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="search__results" aria-busy={status === 'loading'}>
          <div role="status" className="search__status">
            {status === 'loading' && <p>Searching ClinicalTrials.gov…</p>}
            {status === 'done' && trials.length > 0 && (
              <p>
                Showing {trials.length}
                {total !== null && ` of ${total.toLocaleString('en-US')}`} recruiting{' '}
                {total === 1 ? 'trial' : 'trials'} for “{searched}”
              </p>
            )}
            {status === 'done' && trials.length === 0 && (
              <p>No recruiting trials match “{searched}”. Try a broader term.</p>
            )}
          </div>

          {status === 'error' && (
            <div className="search__error" role="alert">
              <p>{SERVICE_ERROR}</p>
              <button
                type="button"
                className="button button--outline"
                onClick={() => void search(searched)}
              >
                Search again
              </button>
            </div>
          )}

          {status === 'done' && trials.length > 0 && (
            <>
              <ul className="search__list">
                {trials.map((trial) => (
                  <TrialRow key={trial.id} trial={trial} />
                ))}
              </ul>
              {moreFailed && (
                <p className="search__more-error" role="alert">
                  {SERVICE_ERROR}
                </p>
              )}
              {nextPage && (
                <button
                  type="button"
                  className="button button--outline search__more"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? 'Loading trials…' : 'Show more trials'}
                </button>
              )}
            </>
          )}

          <p className="search__note">
            Source: ClinicalTrials.gov{dataDate && `, data processed ${dataDate}`}. Summaries are
            shortened, so open a study for the full record. A listing doesn’t mean you’re eligible,
            so talk with your doctor.
          </p>
        </div>
      </div>
    </Overlay>
  );
}
