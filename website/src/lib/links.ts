export type RoleKey = 'patient' | 'physician' | 'coordinator';

/** Stands in for pages and accounts that don't exist yet, as in the design. */
export const PLACEHOLDER_LINK = '#top';

export function signInAs(role: RoleKey, trialId?: string): string {
  const query = new URLSearchParams({ role });
  if (trialId) query.set('trial', trialId);
  return `/app/signin?${query}`;
}
