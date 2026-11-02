import { useCallback } from 'react';
import { useToast } from '../../components/act';
import { DomainError } from '../../domain/referrals';
import type { AppState } from '../../domain/types';
import { commit } from '../../store/store';

/**
 * Like useAct, but hands a rule failure back to the dialog instead of toasting it.
 * A toast sits dimmed behind an open modal, so the reason belongs beside the form it blocks.
 */
export function useDialogAct() {
  const toast = useToast();
  return useCallback(
    (change: (state: AppState, now: string) => AppState, success: string): string | null => {
      try {
        commit(change);
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
        return error.message;
      }
      toast(success);
      return null;
    },
    [toast],
  );
}
