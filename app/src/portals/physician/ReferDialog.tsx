import { ArrowRight, FileText, UploadSimple, X } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAct, useToast } from '../../components/act';
import { Dialog, Field } from '../../components/ui';
import { existingReferral, referPatient } from '../../domain/referrals';
import { useAppState, useCurrentUser } from '../../store/store';

const empty = (trialId = '') => ({ patient: '', condition: '', trialId, note: '', attachments: [] as string[] });

export function ReferDialog({ open, trialId, onClose }: { open: boolean; trialId?: string; onClose: () => void }) {
  const state = useAppState();
  const user = useCurrentUser();
  const act = useAct();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(() => empty(trialId));
  const [errors, setErrors] = useState<Partial<Record<'patient' | 'condition' | 'trialId', string>>>({});

  useEffect(() => {
    if (open) {
      setForm(empty(trialId));
      setErrors({});
    }
  }, [open, trialId]);

  const set = (key: keyof typeof form, value: string | string[]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const submit = () => {
    const found: typeof errors = {};
    if (!form.patient.trim()) found.patient = "Enter the patient's name";
    if (!form.condition.trim()) found.condition = 'Enter the condition';
    if (!form.trialId) found.trialId = 'Choose a trial';
    setErrors(found);
    if (Object.keys(found).length > 0 || !user) return;

    const duplicate = existingReferral(state, form.patient, form.trialId);
    if (duplicate) {
      onClose();
      navigate(`/physician/referrals/${duplicate.id}`);
      toast('A referral for this patient and trial already exists');
      return;
    }
    const trial = state.trials[form.trialId];
    let id = '';
    const sent = act(
      (current, now) => {
        const result = referPatient(current, user, { ...form, trial }, now);
        id = result.id;
        return result.state;
      },
      () => `Referral ${id} sent to ${trial.site}`,
    );
    if (sent) {
      onClose();
      navigate(`/physician/referrals/${id}`);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      width={560}
      kicker="New referral"
      title="Refer a patient"
      footer={
        <>
          <button type="button" className="btn btn--plain" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn--primary" onClick={submit}>
            Send referral
            <ArrowRight />
          </button>
        </>
      }
    >
      <Field label="Patient name" error={errors.patient}>
        {(id) => (
          <input
            id={id}
            className="input"
            placeholder="e.g. Jamie Rivera"
            aria-invalid={!!errors.patient}
            value={form.patient}
            onChange={(e) => set('patient', e.target.value)}
          />
        )}
      </Field>
      <Field label="Condition" error={errors.condition}>
        {(id) => (
          <input
            id={id}
            className="input"
            placeholder="e.g. Type 2 diabetes"
            aria-invalid={!!errors.condition}
            value={form.condition}
            onChange={(e) => set('condition', e.target.value)}
          />
        )}
      </Field>
      <Field label="Trial" error={errors.trialId}>
        {(id) => (
          <select
            id={id}
            className="input"
            aria-invalid={!!errors.trialId}
            value={form.trialId}
            onChange={(e) => set('trialId', e.target.value)}
          >
            <option value="">Select a trial</option>
            {Object.values(state.trials)
              .filter((trial) => !trial.registryUrl)
              .map((trial) => (
              <option key={trial.id} value={trial.id}>
                {trial.title} — {trial.city}
              </option>
            ))}
          </select>
        )}
      </Field>
      <div>
        <div className="label">Attach records (optional)</div>
        <label className="dropzone dropzone--row">
          <input
            type="file"
            multiple
            className="visually-hidden"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            onChange={(e) => {
              const names = Array.from(e.target.files ?? []).map((file) => file.name);
              set('attachments', [...form.attachments, ...names.filter((name) => !form.attachments.includes(name))]);
              e.target.value = '';
            }}
          />
          <UploadSimple size={20} />
          <span className="dropzone__title">Choose files from your device</span>
        </label>
        {form.attachments.map((name) => (
          <div key={name} className="attachment attachment--gap">
            <FileText size={18} />
            <span>{name}</span>
            <button
              type="button"
              className="icon-btn icon-btn--small"
              aria-label={`Remove ${name}`}
              onClick={() => set('attachments', form.attachments.filter((item) => item !== name))}
            >
              <X />
            </button>
          </div>
        ))}
      </div>
      <Field label="Note to research team (optional)">
        {(id) => (
          <textarea
            id={id}
            className="input input--area"
            rows={3}
            placeholder="Relevant history, recent labs, scheduling constraints"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
          />
        )}
      </Field>
    </Dialog>
  );
}
