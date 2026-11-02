import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { canAccess } from '../domain/referrals';
import { useAppState, useCurrentUser } from '../store/store';
import { NotFound } from './NotFound';
import { ReferralWorkspace } from './ReferralWorkspace';
import type { Referral } from '../domain/types';

/** The shared workspace for the `referrals/:id` route. `actions` adds role buttons to the next action band. */
export function ReferralRoute({ actions }: { actions?: (referral: Referral) => ReactNode }) {
  const { id } = useParams();
  const state = useAppState();
  const user = useCurrentUser();
  const referral = state.referrals.find((r) => r.id === id);
  if (!user || !referral || !canAccess(referral, user)) {
    return <NotFound title="This referral is not available" back={`/${user?.role ?? ''}/referrals`} />;
  }
  return <ReferralWorkspace referral={referral} user={user} actions={actions?.(referral)} />;
}
