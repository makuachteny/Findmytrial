import { ArrowRight, FilePlus, SealCheck } from '@phosphor-icons/react';
import { useState } from 'react';
import { useAct } from '../../components/act';
import { STAGE_LABEL, startReview } from '../../domain/referrals';
import type { Referral } from '../../domain/types';
import { useCurrentUser } from '../../store/store';
import { DecisionDialog } from './DecisionDialog';
import { RequestDocumentDialog } from './RequestDocumentDialog';
import { ScheduleVisitDialog } from './ScheduleVisitDialog';

/** The research site's buttons for one referral, shared by the queue rows and the next action band. */
export function ReferralActions({ referral, compact }: { referral: Referral; compact?: boolean }) {
  const user = useCurrentUser();
  const act = useAct();
  const [dialog, setDialog] = useState<'request' | 'schedule' | 'decide' | null>(null);
  if (!user) return null;

  const close = () => setDialog(null);
  const { id, status } = referral;
  const next = status === 'submitted' ? 'review' : 'screening';
  const advance = () => {
    if (status === 'review') setDialog('schedule');
    else act((state, now) => startReview(state, user, id, now), `Referral moved to ${STAGE_LABEL.review}`);
  };

  return (
    <>
      {!referral.decision &&
        (compact ? (
          <button
            type="button"
            className="btn queue__icon-btn"
            title="Request document"
            aria-label={`Request document for ${referral.patient}`}
            onClick={() => setDialog('request')}
          >
            <FilePlus size={16} />
          </button>
        ) : (
          <button type="button" className="btn btn--outline" onClick={() => setDialog('request')}>
            <FilePlus />
            Request document
          </button>
        ))}
      {(status === 'submitted' || status === 'review') && (
        <button
          type="button"
          className={compact ? 'btn queue__row-btn' : 'btn btn--primary'}
          aria-label={compact ? `Move ${referral.patient} to ${STAGE_LABEL[next]}` : undefined}
          onClick={advance}
        >
          Move to {STAGE_LABEL[next]}
          {!compact && <ArrowRight />}
        </button>
      )}
      {status === 'screening' && (
        <button
          type="button"
          className={compact ? 'btn queue__row-btn queue__row-btn--dark' : 'btn btn--dark'}
          aria-label={compact ? `Record decision for ${referral.patient}` : undefined}
          onClick={() => setDialog('decide')}
        >
          {!compact && <SealCheck />}
          {compact ? 'Record decision' : 'Record eligibility decision'}
        </button>
      )}

      {dialog === 'request' && <RequestDocumentDialog referral={referral} onClose={close} />}
      {dialog === 'schedule' && <ScheduleVisitDialog referral={referral} onClose={close} />}
      {dialog === 'decide' && <DecisionDialog referral={referral} onClose={close} />}
    </>
  );
}
