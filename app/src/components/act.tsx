import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { DomainError } from '../domain/referrals';
import type { AppState } from '../domain/types';
import { commit } from '../store/store';

const ToastContext = createContext<(text: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

/** A popover sits in the top layer, so the toast stays clear of an open modal's backdrop. */
function Toast({ icon, text }: { icon: ReactNode; text: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.showPopover(), []);
  return (
    <div ref={ref} popover="manual" role="status" className="toast">
      {icon}
      {text}
    </div>
  );
}

export function ToastProvider({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number>(undefined);

  const show = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setToast(text);
    timer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && <Toast icon={icon} text={toast} />}
    </ToastContext.Provider>
  );
}

/**
 * Runs a change against the shared record and reports the outcome in a toast.
 * Domain rule failures show their message and return false, so forms can stay open.
 */
export function useAct() {
  const show = useToast();
  return useCallback(
    (change: (state: AppState, now: string) => AppState, success?: string | (() => string)): boolean => {
      try {
        commit(change);
      } catch (error) {
        if (!(error instanceof DomainError)) throw error;
        show(error.message);
        return false;
      }
      if (success) show(typeof success === 'function' ? success() : success);
      return true;
    },
    [show],
  );
}
