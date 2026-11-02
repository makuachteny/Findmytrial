import { useEffect, useState } from 'react';
import { fetchStudy, isRegistryId } from '../domain/registry';
import type { Trial } from '../domain/types';
import { useAppState } from '../store/store';

export type TrialLookup =
  | { trial: Trial; stale: boolean }
  | { trial: null; status: 'loading' | 'missing' | 'failed' };

/**
 * Finds a sample trial in the shared record, or loads a study from ClinicalTrials.gov.
 * A saved study is always refreshed, because the registry's terms require current data.
 */
export function useTrial(id: string | undefined): TrialLookup {
  const { trials } = useAppState();
  const stored = id ? trials[id] : undefined;
  const [loaded, setLoaded] = useState<{ id: string; trial: Trial | null } | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const isRegistry = !!id && isRegistryId(id);

  useEffect(() => {
    if (!isRegistry || !id) return;
    const controller = new AbortController();
    fetchStudy(id, controller.signal)
      .then((trial) => setLoaded({ id, trial }))
      .catch(() => {
        if (!controller.signal.aborted) setFailedId(id);
      });
    return () => controller.abort();
  }, [id, isRegistry]);

  if (!isRegistry) return stored ? { trial: stored, stale: false } : { trial: null, status: 'missing' };
  if (loaded?.id === id) return loaded.trial ? { trial: loaded.trial, stale: false } : { trial: null, status: 'missing' };
  if (failedId === id) return stored ? { trial: stored, stale: true } : { trial: null, status: 'failed' };
  return stored ? { trial: stored, stale: false } : { trial: null, status: 'loading' };
}
