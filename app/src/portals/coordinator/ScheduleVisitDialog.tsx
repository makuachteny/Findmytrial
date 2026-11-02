import { ArrowRight } from '@phosphor-icons/react';
import { useState } from 'react';
import { Dialog, Field } from '../../components/ui';
import { moveToScreening, STAGE_LABEL } from '../../domain/referrals';
import type { Referral } from '../../domain/types';
import { useAppState, useCurrentUser } from '../../store/store';
import { useDialogAct } from './useDialogAct';

// en-CA formats as YYYY-MM-DD in local time, which is what a date input expects.
const today = () => new Date().toLocaleDateString('en-CA');

export function ScheduleVisitDialog({ referral, onClose }: { referral: Referral; onClose: () => void }) {
  const state = useAppState();
  const user = useCurrentUser();
  const run = useDialogAct();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:30');
  const [place, setPlace] = useState(`${state.trials[referral.trialId].site}, 4th floor`);
  const [error, setError] = useState('');

  const submit = () => {
    if (!user) return;
    const failed = run(
      (current, now) => moveToScreening(current, user, referral.id, { date, time, place }, now),
      `Referral moved to ${STAGE_LABEL.screening}`,
    );
    if (failed) setError(failed);
    else onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      kicker={`${referral.patient} · ${referral.id}`}
      title="Schedule the screening visit"
      footer={
        <>
          <button type="button" className="btn btn--plain" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={submit}>
            Move to {STAGE_LABEL.screening}
            <ArrowRight />
          </button>
        </>
      }
    >
      <div className="stack stack--14">
        <p className="coord-note">The patient and physician see the visit as soon as you schedule it. Plan on about 90 minutes.</p>
        <div className="coord-fields">
          <Field label="Date">
            {(id) => <input id={id} className="input" type="date" min={today()} value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
          <Field label="Time">
            {(id) => <input id={id} className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />}
          </Field>
        </div>
        <Field label="Location">
          {(id) => <input id={id} className="input" value={place} onChange={(e) => setPlace(e.target.value)} />}
        </Field>
        {error && <div className="field-error">{error}</div>}
      </div>
    </Dialog>
  );
}
