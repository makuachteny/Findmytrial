import { CheckCircle, SealCheck, XCircle, type Icon } from '@phosphor-icons/react';
import { useState } from 'react';
import { Alert, Dialog } from '../../components/ui';
import { recordDecision } from '../../domain/referrals';
import type { Outcome, Referral } from '../../domain/types';
import { useCurrentUser } from '../../store/store';
import { useDialogAct } from './useDialogAct';

const OPTIONS: { value: Outcome; label: string; sub: string; icon: Icon }[] = [
  { value: 'eligible', label: 'Eligible to enroll', sub: 'Patient meets criteria; enrollment call follows.', icon: CheckCircle },
  { value: 'not_eligible', label: 'Not eligible', sub: 'Criteria not met; physician is notified.', icon: XCircle },
];

export function DecisionDialog({ referral, onClose }: { referral: Referral; onClose: () => void }) {
  const user = useCurrentUser();
  const run = useDialogAct();
  const [choice, setChoice] = useState<Outcome | null>(null);
  const [error, setError] = useState('');

  const submit = () => {
    if (!user) return;
    if (!choice) {
      setError('Choose a decision to record');
      return;
    }
    const failed = run((state, now) => recordDecision(state, user, referral.id, choice, now), 'Eligibility decision recorded');
    if (failed) setError(failed);
    else onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      kicker={`${referral.patient} · ${referral.id}`}
      title="Record eligibility decision"
      footer={
        <>
          <button type="button" className="btn btn--plain" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--dark" onClick={submit}>
            <SealCheck />
            Confirm and record
          </button>
        </>
      }
    >
      <div className="stack stack--12">
        <div className="coord-fields">
          {OPTIONS.map(({ value, label, sub, icon: OptionIcon }) => (
            <button
              key={value}
              type="button"
              className={`coord-decision coord-decision--${value}`}
              aria-pressed={choice === value}
              onClick={() => {
                setChoice(value);
                setError('');
              }}
            >
              <span className="coord-decision__label">
                <OptionIcon size={20} />
                {label}
              </span>
              <span className="coord-decision__sub">{sub}</span>
            </button>
          ))}
        </div>
        {error && <div className="field-error">{error}</div>}
        <Alert>
          This is final and is shown to the patient and referring physician immediately. The referral moves out of pending
          screening.
        </Alert>
      </div>
    </Dialog>
  );
}
