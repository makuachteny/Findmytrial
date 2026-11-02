import { ArrowLeft, ArrowRight, FileText, Paperclip, UploadSimple, X } from '@phosphor-icons/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAct } from '../../components/act';
import { Dialog, Field } from '../../components/ui';
import { requestScreening } from '../../domain/referrals';
import type { Answer, Trial, User } from '../../domain/types';
import { useCurrentUser } from '../../store/store';

const STEP_TITLES = ['Confirm your details', 'A few screening questions', 'Share your health history', 'Review and submit'];
const ANSWERS: Answer[] = ['Yes', 'No', 'Not sure'];
const TYPICAL_RECORDS = ['Recent lab results', 'Medication list', 'Discharge summary', 'Imaging report'];

const emptyForm = (user: User | null) => ({
  name: user?.name ?? '',
  dob: user?.contact?.dob ?? '',
  phone: user?.contact?.phone ?? '',
  email: user?.contact?.email ?? '',
  q1: '' as Answer | '',
  q2: '' as Answer | '',
  q3: '' as Answer | '',
  conditions: '',
  medications: '',
  notes: '',
  attachments: [] as string[],
  consent: false,
});

type Form = ReturnType<typeof emptyForm>;
type Errors = Partial<Record<keyof Form, string>>;

function validate(step: number, form: Form): Errors {
  const errors: Errors = {};
  if (step === 1) {
    if (!form.name.trim()) errors.name = 'Enter your name';
    if (!form.dob.trim()) errors.dob = 'Enter your date of birth';
    if (!form.phone.trim()) errors.phone = 'Enter a phone number';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Enter a valid email';
  }
  if (step === 2) {
    for (const key of ['q1', 'q2', 'q3'] as const) if (!form[key]) errors[key] = 'Choose an answer';
  }
  if (step === 4 && !form.consent) errors.consent = 'Please confirm to continue';
  return errors;
}

export function ScreeningDialog({ open, trial, onClose }: { open: boolean; trial: Trial; onClose: () => void }) {
  const user = useCurrentUser();
  const act = useAct();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => emptyForm(user));
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const close = () => {
    onClose();
    setStep(1);
    setForm(emptyForm(user));
    setErrors({});
  };

  const next = () => {
    const found = validate(step, form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    if (!user) return;
    const hasHistory = [form.conditions, form.medications, form.notes].some((value) => value.trim());
    let id = '';
    const sent = act(
      (state, now) => {
        const result = requestScreening(
          state,
          user,
          {
            trial,
            condition: user.detail,
            contact: { dob: form.dob.trim(), phone: form.phone.trim(), email: form.email.trim() },
            preScreening: { diagnosed: form.q1 as Answer, medicine: form.q2 as Answer, travel: form.q3 as Answer },
            history: hasHistory
              ? { conditions: form.conditions.trim(), medications: form.medications.trim(), notes: form.notes.trim() }
              : null,
            attachments: form.attachments,
          },
          now,
        );
        id = result.id;
        return result.state;
      },
      () => `Screening request sent · referral ${id} created`,
    );
    if (sent) {
      close();
      navigate(`/patient/referrals/${id}`);
    }
  };

  const questions = [
    { key: 'q1', text: `Have you been diagnosed with ${trial.condition.toLowerCase()} by a clinician?` },
    { key: 'q2', text: 'Are you currently taking any prescription medicine for it?' },
    { key: 'q3', text: `Could you travel to ${trial.city} for study visits over ${trial.duration.toLowerCase()}?` },
  ] as const;

  const review: [string, string][] = [
    ['Trial', trial.shortTitle],
    ['Site', trial.site],
    ['Name', form.name],
    ['Date of birth', form.dob],
    ['Contact', `${form.phone} · ${form.email}`],
    ['Diagnosed', form.q1],
    ['Taking medicine', form.q2],
    ['Able to travel', form.q3],
    ['Health history', form.conditions || form.medications || form.notes ? 'Shared' : 'Not shared'],
    ['Attached records', form.attachments.length ? form.attachments.join(', ') : 'None'],
  ];

  const history = [
    ['conditions', 'Current conditions', 'e.g. Type 2 diabetes since 2018, high blood pressure'],
    ['medications', 'Current medications', 'e.g. Metformin 1000 mg twice daily, lisinopril 10 mg'],
    ['notes', 'Surgeries, allergies or other notes', 'Anything else the research team should know'],
  ] as const;

  const addFiles = (files: FileList | null) => {
    const names = Array.from(files ?? []).map((file) => file.name);
    set('attachments', [...form.attachments, ...names.filter((name) => !form.attachments.includes(name))]);
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      width={600}
      kicker={`Request screening · Step ${step} of 4`}
      title={STEP_TITLES[step - 1]}
      subtitle={trial.title}
      footer={
        <>
          <button type="button" className="btn btn--plain" onClick={() => (step === 1 ? close() : setStep(step - 1))}>
            <ArrowLeft />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          <button type="button" className="btn btn--primary" onClick={next}>
            {step === 4 ? 'Submit request' : 'Continue'}
            <ArrowRight />
          </button>
        </>
      }
    >
      <div className="dots">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} data-on={i <= step} />
        ))}
      </div>
      {step === 1 && (
        <>
          <p className="meta-note">Confirm the details the research team will use to contact you.</p>
          <div className="form-grid">
            {(
              [
                ['name', 'Full name'],
                ['dob', 'Date of birth'],
                ['phone', 'Phone'],
                ['email', 'Email'],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label} error={errors[key]}>
                {(id) => (
                  <input
                    id={id}
                    className="input"
                    aria-invalid={!!errors[key]}
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                  />
                )}
              </Field>
            ))}
          </div>
        </>
      )}
      {step === 2 && (
        <>
          <p className="meta-note">Three quick questions help the team prepare. Your answers do not determine eligibility.</p>
          {questions.map(({ key, text }) => (
            <div key={key}>
              <div className="question">{text}</div>
              <div className="answers" role="group" aria-label={text}>
                {ANSWERS.map((answer) => (
                  <button
                    key={answer}
                    type="button"
                    className="answer"
                    aria-pressed={form[key] === answer}
                    onClick={() => set(key, answer)}
                  >
                    {answer}
                  </button>
                ))}
              </div>
              {errors[key] && <div className="field-error">{errors[key]}</div>}
            </div>
          ))}
        </>
      )}
      {step === 3 && (
        <>
          <p className="meta-note">
            Optional. Upload records and add notes; they are visible only to the research team and your referring physician
            and help them prepare for your screening visit.
          </p>
          <div>
            <div className="label">Upload documents (optional)</div>
            <label className="dropzone">
              <input
                type="file"
                multiple
                className="visually-hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <UploadSimple size={26} />
              <span className="dropzone__title">Choose files from your device</span>
              <span className="meta-note">Lab results, medication lists, discharge summaries, imaging reports · PDF or images</span>
            </label>
            <div className="stack stack--8">
              {form.attachments.map((name) => (
                <div key={name} className="attachment">
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
              <div className="typical">
                <span className="faint">or add a typical record:</span>
                {TYPICAL_RECORDS.filter((record) => !form.attachments.includes(record)).map((record) => (
                  <button
                    key={record}
                    type="button"
                    className="dashed-btn"
                    onClick={() => set('attachments', [...form.attachments, record])}
                  >
                    <Paperclip />
                    {record}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {history.map(([key, label, placeholder]) => (
            <Field key={key} label={label}>
              {(id) => (
                <textarea
                  id={id}
                  className="input input--area"
                  rows={2}
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                />
              )}
            </Field>
          ))}
        </>
      )}
      {step === 4 && (
        <>
          <div className="review">
            {review.map(([key, value]) => (
              <div key={key}>
                <span>{key}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
          <label className="consent">
            <input type="checkbox" checked={form.consent} onChange={() => set('consent', !form.consent)} />
            <span>
              I understand this is a request for screening, not a confirmation of eligibility, and that the research team will
              review my information.
            </span>
          </label>
          {errors.consent && <div className="field-error">{errors.consent}</div>}
        </>
      )}
    </Dialog>
  );
}
