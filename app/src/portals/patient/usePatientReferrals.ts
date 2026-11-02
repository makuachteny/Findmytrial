import { isMine, visibleReferrals } from '../../domain/referrals';
import { useAppState, useCurrentUser } from '../../store/store';

/** The patient's referrals, with the ones waiting on them first. */
export function usePatientReferrals() {
  const state = useAppState();
  const user = useCurrentUser();
  const needsMe = (referral: Parameters<typeof isMine>[0]) => Number(!!user && isMine(referral, user) && !referral.decision);
  const referrals = user ? [...visibleReferrals(state, user)].sort((a, b) => needsMe(b) - needsMe(a)) : [];
  return { referrals, trials: state.trials };
}
