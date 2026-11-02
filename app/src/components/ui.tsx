import { WarningCircle } from '@phosphor-icons/react';
import { useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import { STAGE_LABEL } from '../domain/referrals';
import type { Referral, Stage, TrialStatus } from '../domain/types';

const MARK_COLORS = {
  full: { steps: '#e8893a', pin: '#1d4ed8', check: '#fff' },
  reversed: { steps: '#f6b98a', pin: '#fff', check: '#132452' },
};

/** The brand mark: three steps rising to a pin. Use `reversed` on navy. */
export function Mark({ size, tone = 'full' }: { size: number; tone?: keyof typeof MARK_COLORS }) {
  const { steps, pin, check } = MARK_COLORS[tone];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="6" cy="58" r="2.4" fill={steps} opacity=".5" />
      <circle cx="14.5" cy="56.5" r="3" fill={steps} opacity=".75" />
      <circle cx="24.5" cy="53.5" r="3.6" fill={steps} />
      <path d="M40 4C30.6 4 23 11.4 23 20.6C23 32.5 40 48 40 48S57 32.5 57 20.6C57 11.4 49.4 4 40 4Z" fill={pin} />
      <path d="M32 20.5L37.5 26L48 15.5" stroke={check} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The app icon, used in the portal sidebar. */
export function Logo() {
  return (
    <span className="logo-mark">
      <Mark size={24} tone="reversed" />
    </span>
  );
}

export function statusBadge(referral: Referral): { label: string; tone: string } {
  if (referral.status === 'decision') {
    return referral.decision === 'eligible'
      ? { label: 'Decision: eligible to enroll', tone: 'eligible' }
      : { label: 'Decision: not eligible', tone: 'not-eligible' };
  }
  const labels: Record<Exclude<Stage, 'decision'>, string> = {
    submitted: STAGE_LABEL.submitted,
    review: STAGE_LABEL.review,
    screening: 'Screening · pending',
  };
  return { label: labels[referral.status], tone: referral.status };
}

export function StatusBadge({ referral, large }: { referral: Referral; large?: boolean }) {
  const { label, tone } = statusBadge(referral);
  return <span className={`badge badge--${tone}${large ? ' badge--large' : ''}`}>{label}</span>;
}

const TRIAL_TONE: Record<TrialStatus, string> = {
  Recruiting: 'screening',
  'Not yet recruiting': 'review',
  'Active, not recruiting': 'muted',
  'Enrolling by invitation': 'review',
  Completed: 'muted',
  Suspended: 'review',
  Terminated: 'muted',
  Withdrawn: 'muted',
  'Status unknown': 'muted',
};

export function TrialStatusBadge({ status }: { status: TrialStatus }) {
  return <span className={`badge badge--${TRIAL_TONE[status]}`}>{status}</span>;
}

export const STATUS_CHIPS = [
  ['all', 'All'],
  ['submitted', 'New'],
  ['review', 'Initial review'],
  ['screening', 'Screening'],
  ['missing', 'Missing info'],
  ['decision', 'Decided'],
] as const;

export function matchesChip(referral: Referral, chip: string): boolean {
  if (chip === 'all') return true;
  if (chip === 'missing') return !referral.decision && referral.checklist.some((item) => !item.doneAt);
  return referral.status === chip;
}

export function StatusChips({ active, onChange }: { active: string; onChange: (chip: string) => void }) {
  return (
    <div className="chips">
      {STATUS_CHIPS.map(([key, label]) => (
        <button key={key} type="button" className="chip" aria-pressed={active === key} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function KpiCard(props: {
  label: string;
  value: number;
  sub: string;
  accent: 'primary' | 'orange' | 'navy' | 'green';
  large?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`kpi kpi--${props.accent}${props.large ? ' kpi--large' : ''}`}
      onClick={props.onClick}
    >
      <span className="kpi__label">{props.label}</span>
      <span className="kpi__value">{props.value}</span>
      <span className="kpi__sub">{props.sub}</span>
    </button>
  );
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  return hour < 17 ? 'Good afternoon' : 'Good evening';
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: (id: string) => ReactElement;
}) {
  const id = useId();
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children(id)}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export function Dialog(props: {
  open: boolean;
  onClose: () => void;
  kicker: string;
  title: string;
  subtitle?: string;
  footer: ReactNode;
  width?: number;
  children: ReactNode;
}) {
  const { open, onClose } = props;
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      style={{ maxWidth: props.width ?? 520 }}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <div className="dialog__header">
            <div>
              <div className="kicker">{props.kicker}</div>
              <h2 id={titleId} className="dialog__title">
                {props.title}
              </h2>
              {props.subtitle && <div className="dialog__subtitle">{props.subtitle}</div>}
            </div>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="dialog__body">{props.children}</div>
          <div className="dialog__footer">{props.footer}</div>
        </>
      )}
    </dialog>
  );
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert">
      <WarningCircle size={18} />
      <span>{children}</span>
    </div>
  );
}
