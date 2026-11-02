import { useEffect, useState } from 'react';
import type { RoleKey } from './links';

// Written by the portals on sign-in. The two share an origin, so a tab carries it across.
const SESSION_KEY = 'findmytrial.session';

export interface Session {
  name: string;
  role: RoleKey;
}

function readSession(): Session | null {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null') as Session | null;
  } catch {
    return null;
  }
}

export function useSession(): Session | null {
  const [session, setSession] = useState(readSession);

  // The back button can restore this page from memory after signing in or out of the portal.
  useEffect(() => {
    const refresh = () => setSession(readSession());
    window.addEventListener('pageshow', refresh);
    return () => window.removeEventListener('pageshow', refresh);
  }, []);

  return session;
}
