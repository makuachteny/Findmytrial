import { useSyncExternalStore } from 'react';
import { createSeedState, findAccount } from '../domain/seed';
import type { AppState, User } from '../domain/types';

const STATE_KEY = 'findmytrial.record';
// Also read by the public website, which shares this origin, to show the portal link.
const SESSION_KEY = 'findmytrial.session';
const VERSION = 5;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

function readState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    const parsed = raw ? (JSON.parse(raw) as AppState) : null;
    if (parsed?.version === VERSION) return parsed;
  } catch {
    // Unreadable data falls through to a fresh seed.
  }
  const seeded = createSeedState(VERSION);
  localStorage.setItem(STATE_KEY, JSON.stringify(seeded));
  return seeded;
}

let snapshot: AppState | null = null;

function getState(): AppState {
  snapshot ??= readState();
  return snapshot;
}

/** Applies a change to the latest stored record, so concurrent tabs do not overwrite each other. */
export function commit(change: (state: AppState, now: string) => AppState) {
  const next = change(readState(), new Date().toISOString());
  localStorage.setItem(STATE_KEY, JSON.stringify(next));
  snapshot = next;
  emit();
}

export function resetDemo() {
  localStorage.removeItem(STATE_KEY);
  snapshot = null;
  emit();
}

// The storage event only fires in other tabs, which is what makes the portals update at once.
window.addEventListener('storage', (event) => {
  if (event.key !== STATE_KEY && event.key !== null) return;
  snapshot = null;
  emit();
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

// The session is per tab, so one browser can show several accounts side by side.
function sessionSnapshot(): string | null {
  return sessionStorage.getItem(SESSION_KEY);
}

export function signIn(user: User) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, name: user.name, role: user.role }));
  emit();
}

export function signOut() {
  sessionStorage.removeItem(SESSION_KEY);
  emit();
}

export function useCurrentUser(): User | null {
  const session = useSyncExternalStore(subscribe, sessionSnapshot);
  if (!session) return null;
  try {
    return findAccount((JSON.parse(session) as { id: string }).id) ?? null;
  } catch {
    return null;
  }
}
