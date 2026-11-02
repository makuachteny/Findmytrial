import { FilePlus } from '@phosphor-icons/react';
import { useState } from 'react';
import { Dialog } from '../../components/ui';
import { requestDocument, uploaderRole } from '../../domain/referrals';
import { DOC_OPTIONS } from '../../domain/seed';
import type { Referral } from '../../domain/types';
import { useCurrentUser } from '../../store/store';
import { useDialogAct } from './useDialogAct';

export function RequestDocumentDialog({ referral, onClose }: { referral: Referral; onClose: () => void }) {
  const user = useCurrentUser();
  const run = useDialogAct();
  const [doc, setDoc] = useState('');
  const [error, setError] = useState('');
  const options = DOC_OPTIONS.filter((option) => !referral.checklist.some((item) => item.label === option));
  const fromPatient = uploaderRole(referral) === 'patient';

  const submit = () => {
    if (!user) return;
    if (!doc) {
      setError('Choose a document to request');
      return;
    }
    const failed = run(
      (state, now) => requestDocument(state, user, referral.id, doc, now),
      `Document requested from ${fromPatient ? 'patient' : 'referring physician'}`,
    );
    if (failed) setError(failed);
    else onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      kicker={`${referral.patient} · ${referral.id}`}
      title="Request a document"
      footer={
        <>
          <button type="button" className="btn btn--plain" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" disabled={options.length === 0} onClick={submit}>
            <FilePlus />
            Send request
          </button>
        </>
      }
    >
      <div className="stack stack--10">
        <p className="coord-note">
          {fromPatient
            ? 'The patient will see this as their next step and can upload it from their dashboard.'
            : `${referral.patient} has no account yet, so their referring physician will see this as their next step and can upload it for them.`}
        </p>
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className="coord-option"
            aria-pressed={doc === option}
            onClick={() => {
              setDoc(option);
              setError('');
            }}
          >
            <span className="coord-option__dot" />
            {option}
          </button>
        ))}
        {options.length === 0 && <p className="coord-note">Every document on this list has already been requested.</p>}
        {error && <div className="field-error">{error}</div>}
      </div>
    </Dialog>
  );
}
