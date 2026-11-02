import {
  ArrowLeft,
  CalendarCheck,
  CalendarPlus,
  ChatCircle,
  ChatTeardropDots,
  Check,
  CheckCircle,
  Clock,
  FileText,
  Info,
  LockSimple,
  MagnifyingGlass,
  MapPin,
  CalendarBlank,
  PaperPlaneTilt,
  Phone,
  SpinnerGap,
  Stethoscope,
  UploadSimple,
  type Icon,
} from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { clockTime, initials, longDate, shortDate, stamp, visitDay, visitTime } from '../domain/format';
import {
  isMine,
  nextAction,
  openItems,
  ownerName,
  sendMessage,
  STAGES,
  STAGE_LABEL,
  STATUS_EXPLAINER,
  uploaderRole,
  uploadDocument,
} from '../domain/referrals';
import { COVERAGE, findAccount, QUICK_REPLIES, ROLE_LABEL } from '../domain/seed';
import type { ActivityEntry, ChecklistItem, NextActionKind, Referral, Role, User } from '../domain/types';
import { useAppState } from '../store/store';
import { useAct } from './act';
import { StatusBadge } from './ui';

const KIND_ICON: Record<NextActionKind, Icon> = {
  upload: UploadSimple,
  review: MagnifyingGlass,
  schedule: CalendarPlus,
  attend: CalendarCheck,
  enroll: Phone,
  discuss: Stethoscope,
};

const BACK_LABEL: Record<Role, string> = {
  patient: 'Back to my referrals',
  physician: 'Back to referrals',
  coordinator: 'Back to queue',
};

const TABS = ['overview', 'documents', 'messages', 'coverage'] as const;
type Tab = (typeof TABS)[number];

function steps(referral: Referral) {
  const decided = referral.status === 'decision';
  const index = STAGES.indexOf(referral.status);
  return STAGES.map((stage, i) => {
    const done = decided || i < index;
    const current = !decided && i === index;
    const date = referral.stageDates[stage];
    let sub = 'Not started';
    if (current) sub = 'In progress';
    if (done) {
      if (stage === 'decision') sub = referral.decision === 'eligible' ? 'Eligible to enroll' : 'Not eligible';
      else sub = date ? `Completed ${shortDate(date)}` : 'Completed';
    }
    let tone = 'todo';
    if (done || current) tone = 'active';
    if (done && stage === 'decision') tone = referral.decision === 'eligible' ? 'eligible' : 'not-eligible';
    return { stage, label: STAGE_LABEL[stage], sub, tone, current };
  });
}

/** Keeps the chosen file's name only; a real upload needs a backend. */
function useUpload(referral: Referral, user: User) {
  const act = useAct();
  const input = useRef<HTMLInputElement>(null);
  const target = useRef<string | null>(null);
  const [uploading, setUploading] = useState<{ itemId: string; pct: number } | null>(null);
  const timer = useRef<number>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const pick = (itemId: string) => {
    target.current = itemId;
    input.current?.click();
  };

  const onFile = (file: File | undefined) => {
    const itemId = target.current;
    if (!file || !itemId) return;
    setUploading({ itemId, pct: 0 });
    let pct = 0;
    timer.current = window.setInterval(() => {
      pct = Math.min(100, pct + 9);
      setUploading({ itemId, pct });
      if (pct < 100) return;
      window.clearInterval(timer.current);
      const label = referral.checklist.find((item) => item.id === itemId)?.label;
      act((s, now) => uploadDocument(s, user, referral.id, itemId, file.name, now), `Document uploaded · ${label}`);
      setUploading(null);
    }, 90);
  };

  const fileInput = (
    <input
      ref={input}
      type="file"
      className="visually-hidden"
      aria-label="Choose a file to upload"
      tabIndex={-1}
      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
      onChange={(event) => {
        onFile(event.target.files?.[0]);
        event.target.value = '';
      }}
    />
  );

  return { uploading, pick, fileInput };
}

function ChecklistRow(props: {
  item: ChecklistItem;
  uploader: Role;
  canUpload: boolean;
  uploading: { itemId: string; pct: number } | null;
  onUpload: (id: string) => void;
}) {
  const { item, uploader, canUpload, onUpload } = props;
  const uploading = props.uploading?.itemId === item.id;
  return (
    <div className="check-row">
      <div className={`check-row__icon check-row__icon--${item.doneAt ? 'done' : 'open'}`}>
        {item.doneAt ? <Check size={15} /> : uploading ? <SpinnerGap size={15} /> : <Clock size={15} />}
      </div>
      <div className="check-row__text">
        <div className="check-row__label">{item.label}</div>
        <div className="meta-note">
          {item.doneAt ? `Received ${shortDate(item.doneAt)}` : `Requested ${shortDate(item.requestedAt)} by ${item.requestedBy}`}
        </div>
        {uploading && (
          <div className="progress">
            <div style={{ width: `${props.uploading?.pct}%` }} />
          </div>
        )}
      </div>
      {canUpload && !item.doneAt && !uploading && (
        <button type="button" className="btn btn--primary btn--small" onClick={() => onUpload(item.id)}>
          <UploadSimple />
          Upload
        </button>
      )}
      {!canUpload && !item.doneAt && <span className="waiting-pill">Waiting on {uploader}</span>}
    </div>
  );
}

function ActivityList({ activity }: { activity: ActivityEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const newestFirst = useMemo(() => [...activity].reverse(), [activity]);
  const shown = showAll ? newestFirst : newestFirst.slice(0, 4);
  return (
    <div className="card card--pad">
      <div className="card-head">
        <h2 className="section-title">Activity</h2>
        {newestFirst.length > 4 && (
          <button type="button" className="text-btn" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show less' : `Show all ${newestFirst.length}`}
          </button>
        )}
      </div>
      <ol className="timeline">
        {shown.map((entry) => (
          <li key={entry.id}>
            <div className="timeline__rail">
              <div className={`timeline__dot timeline__dot--${entry.role}`} />
              <div className="timeline__line" />
            </div>
            <div>
              <div className="timeline__head">
                <span className="timeline__who">{entry.who}</span>
                <span className={`role-pill role-pill--${entry.role}`}>{ROLE_LABEL[entry.role]}</span>
                <span className="timeline__at">{stamp(entry.at)}</span>
              </div>
              <div className="timeline__text">{entry.text}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Thread({ referral, user, draft, setDraft }: {
  referral: Referral;
  user: User;
  draft: string;
  setDraft: (value: string) => void;
}) {
  const act = useAct();
  const thread = useRef<HTMLDivElement>(null);
  const action = nextAction(referral);

  useEffect(() => {
    const element = thread.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [referral.messages.length]);

  const send = () => {
    if (!draft.trim()) return;
    if (act((s, now) => sendMessage(s, user, referral.id, draft, now), 'Message sent')) setDraft('');
  };

  const participants: { name: string; role: Role }[] = [
    { name: referral.patient, role: 'patient' },
    { name: ownerName(referral, 'physician'), role: 'physician' },
    { name: ownerName(referral, 'coordinator'), role: 'coordinator' },
  ];

  return (
    <div className="two-col two-col--thread">
      <div className="thread-card">
        <div className="thread-card__head">
          <div className="thread-card__who">
            <div className="avatar-stack">
              {participants.map((p) => (
                <div key={p.role} className={`avatar avatar--small avatar--${p.role}`} title={`${p.name} · ${ROLE_LABEL[p.role]}`}>
                  {initials(p.name)}
                </div>
              ))}
            </div>
            <div>
              <div className="thread-card__title">Referral conversation</div>
              <div className="meta-note">{participants.map((p) => p.name.split(' ').at(-1)).join(', ')}</div>
            </div>
          </div>
          <span className="thread-card__lock">
            <LockSimple />
            Visible only to people on this referral
          </span>
        </div>
        <div ref={thread} className="thread" data-testid="thread">
          {referral.messages.map((message, i, all) => {
            const previous = all[i - 1];
            const day = longDate(message.at);
            const newDay = !previous || longDate(previous.at) !== day;
            const sameAuthor = !newDay && previous.from === message.from;
            const mine = message.from === user.name;
            return (
              <div key={message.id} className="thread__item">
                {newDay && <div className="thread__day">{day}</div>}
                <div className={`bubble-row${mine ? ' bubble-row--mine' : ''}${sameAuthor ? '' : ' bubble-row--gap'}`}>
                  {!mine && (
                    <div className={`avatar avatar--small avatar--${message.role}${sameAuthor ? ' avatar--ghost' : ''}`}>
                      {initials(message.from)}
                    </div>
                  )}
                  <div className="bubble-wrap">
                    {!sameAuthor && (
                      <div className="bubble-head">
                        <span>{message.from}</span>
                        <span className={`bubble-head__role bubble-head__role--${message.role}`}>
                          {ROLE_LABEL[message.role]}
                        </span>
                      </div>
                    )}
                    <div className="bubble">{message.text}</div>
                    <div className="bubble-time">{clockTime(message.at)}</div>
                  </div>
                </div>
              </div>
            );
          })}
          {referral.messages.length === 0 && (
            <div className="thread__empty">
              <ChatTeardropDots size={36} />
              <div className="thread__empty-title">No messages yet</div>
              <div className="meta-note">Start the conversation. Everyone on this referral will see it.</div>
            </div>
          )}
        </div>
        <div className="composer">
          {!draft && (
            <div className="quick-replies">
              {QUICK_REPLIES[user.role].map((reply) => (
                <button key={reply} type="button" className="quick-reply" onClick={() => setDraft(reply)}>
                  {reply}
                </button>
              ))}
            </div>
          )}
          <div className="composer__box">
            <div className="avatar avatar--small avatar--ink">{initials(user.name)}</div>
            <textarea
              aria-label="Message"
              rows={Math.min(5, Math.max(1, draft.split('\n').length))}
              value={draft}
              placeholder={
                user.role === 'patient'
                  ? 'Ask the research team a question…'
                  : `Write to ${referral.patient} and the care team…`
              }
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            <button type="button" className="send-btn" aria-label="Send" disabled={!draft.trim()} onClick={send}>
              <PaperPlaneTilt size={18} />
            </button>
          </div>
          <div className="composer__hint">
            <span>
              Sending as {user.name} · {user.roleLabel}
            </span>
            <span>Enter to send · Shift+Enter for a new line</span>
          </div>
        </div>
      </div>
      <div className="stack stack--14">
        <div className="card card--pad-xs">
          <div className="small-heading">People on this referral</div>
          <div className="people">
            {participants.map((p) => (
              <div key={p.role} className="person">
                <div className={`avatar avatar--${p.role}`}>{initials(p.name)}</div>
                <div className="person__text">
                  <div className="person__name">
                    {p.name}
                    {p.name === user.name && ' (you)'}
                  </div>
                  <div className="meta-note">{ROLE_LABEL[p.role]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card card--pad-xs">
          <div className="small-heading">Next action</div>
          <div className="body-text">{action.text}</div>
          <div className="meta-note">
            {ownerName(referral, action.owner)} · {ROLE_LABEL[action.owner]}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReferralWorkspace({ referral, user, actions }: { referral: Referral; user: User; actions?: ReactNode }) {
  const { trials } = useAppState();
  const trial = trials[referral.trialId];
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : 'overview';
  const setTab = (next: Tab) => setParams(next === 'overview' ? {} : { tab: next }, { replace: true });
  const [draft, setDraft] = useState('');
  const { uploading, pick, fileInput } = useUpload(referral, user);

  const action = nextAction(referral);
  const ActionIcon = KIND_ICON[action.kind];
  const owner = ownerName(referral, action.owner);
  const mine = isMine(referral, user) && owner === user.name;
  const decided = referral.status === 'decision';
  const open = openItems(referral);
  const uploader = uploaderRole(referral);
  const canUpload = user.role === uploader;
  const done = referral.checklist.length - open.length;
  const history = referral.history;
  const historyItems = [
    ...(history
      ? ([
          ['Conditions', history.conditions],
          ['Medications', history.medications],
          ['Other notes', history.notes],
        ] as const)
      : []),
    ...(referral.preScreening
      ? ([
          ['Diagnosed by a clinician', referral.preScreening.diagnosed],
          ['Taking prescription medicine', referral.preScreening.medicine],
          ['Able to travel to visits', referral.preScreening.travel],
        ] as const)
      : []),
  ].filter(([, value]) => value);

  const checklistRow = (item: ChecklistItem) => (
    <ChecklistRow
      key={item.id}
      item={item}
      uploader={uploader}
      canUpload={canUpload}
      uploading={uploading}
      onUpload={pick}
    />
  );

  const counts: Record<Tab, number> = {
    overview: 0,
    documents: referral.documents.length,
    messages: referral.messages.length,
    coverage: 0,
  };
  const labels: Record<Tab, string> = {
    overview: 'Overview',
    documents: 'Documents',
    messages: 'Messages',
    coverage: 'Coverage questions',
  };

  return (
    <section className="stack stack--24 workspace">
      {fileInput}
      <Link className="back-link" to={`/${user.role}/referrals`}>
        <ArrowLeft />
        {BACK_LABEL[user.role]}
      </Link>

      <div className="card summary">
        <div className="summary__top">
          <div className="summary__title">
            <div className="kicker">Shared referral · {referral.id}</div>
            <h1 className="workspace-title">{trial.title}</h1>
            <div className="meta-line">
              {trial.site} · {trial.city} · Submitted {longDate(referral.submittedAt)}
            </div>
          </div>
          <StatusBadge referral={referral} large />
        </div>
        <div className="summary__people">
          <div>
            <div className="field-label">Patient</div>
            <div className="field-value">{referral.patient}</div>
            <div className="meta-note">{referral.condition}</div>
          </div>
          <div>
            <div className="field-label">Referring physician</div>
            <div className="field-value">{ownerName(referral, 'physician')}</div>
            <div className="meta-note">{findAccount(referral.physicianId)?.detail}</div>
          </div>
          <div>
            <div className="field-label">Research coordinator</div>
            <div className="field-value">{ownerName(referral, 'coordinator')}</div>
            <div className="meta-note">{trial.site}</div>
          </div>
          <div>
            <div className="field-label">Screening visit</div>
            <div className="field-value">
              {referral.appointment
                ? `${visitDay(referral.appointment)} · ${visitTime(referral.appointment)}`
                : decided
                  ? 'Completed'
                  : 'Not yet scheduled'}
            </div>
            <div className="meta-note">
              {referral.appointment?.place ?? (decided ? 'Decision recorded' : 'Scheduled after initial review')}
            </div>
          </div>
        </div>
        <div>
          <div className="card-head card-head--tight">
            <div className="small-heading small-heading--flush">Referral progress</div>
            <div className="meta-note">
              {decided ? `Final decision recorded ${shortDate(referral.stageDates.decision ?? '')}` : 'Eligibility not yet decided'}
            </div>
          </div>
          <ol className="progress-steps">
            {steps(referral).map((step) => (
              <li key={step.stage} className={`step step--${step.tone}`} aria-current={step.current ? 'step' : undefined}>
                <div className="step__label">{step.label}</div>
                <div className="step__sub">{step.sub}</div>
              </li>
            ))}
          </ol>
          <div className="explainer">
            <Info size={16} />
            <span>{STATUS_EXPLAINER[referral.status]}</span>
          </div>
        </div>
      </div>

      <div className={`next-band${action.owner === user.role ? ' next-band--mine' : ''}`}>
        <div className="next-band__text">
          <div className="next-band__icon">
            <ActionIcon size={22} />
          </div>
          <div>
            <div className="kicker">{decided ? 'What happens next' : 'Next action'}</div>
            <div className="next-band__action">{action.text}</div>
            <div className="meta-line">
              <span>
                Assigned to <strong>{owner}</strong> · {ROLE_LABEL[action.owner]}
                {mine && ' (you)'}
              </span>
            </div>
          </div>
        </div>
        <div className="next-band__actions">
          {canUpload && open.length > 0 && !uploading && (
            <button type="button" className="btn btn--primary" onClick={() => pick(open[0].id)}>
              <UploadSimple />
              Upload document
            </button>
          )}
          {actions}
        </div>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((key) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className="tab" onClick={() => setTab(key)}>
            {labels[key]}
            {counts[key] > 0 && <span className="tab__count">{counts[key]}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="two-col">
          <div className="stack stack--24">
            {referral.checklist.length > 0 && (
              <div className="card card--pad">
                <div className="card-head">
                  <h2 className="section-title">Requested information</h2>
                  <span className="meta-note">
                    {done} of {referral.checklist.length} complete
                  </span>
                </div>
                <div>{referral.checklist.map(checklistRow)}</div>
              </div>
            )}
            <ActivityList activity={referral.activity} />
          </div>
          <div className="card card--pad-sm">
            {historyItems.length > 0 && (
              <div className="history">
                <div className="small-heading">Patient history</div>
                {historyItems.map(([label, value]) => (
                  <div key={label}>
                    <div className="history__label">{label}</div>
                    <div className="body-text">{value}</div>
                  </div>
                ))}
                <div className="history__label">Shared by {referral.patient} with the screening request</div>
              </div>
            )}
            <div className="small-heading">About this trial</div>
            <div className="about-title">{trial.shortTitle}</div>
            <div className="icon-list">
              <div>
                <MapPin />
                {trial.address}
              </div>
              <div>
                <CalendarBlank />
                {trial.duration} · {trial.visits}
              </div>
              <div>
                <Phone />
                {trial.phone}
              </div>
            </div>
            <Link className="underline-link underline-link--gap" to={`/${user.role}/trials/${trial.id}`}>
              View trial page
            </Link>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="two-col">
          <div className="card card--pad">
            <h2 className="section-title section-title--gap">Documents</h2>
            {referral.documents.map((document) => (
              <div key={document.id} className="doc-row">
                <div className="doc-row__icon">
                  <FileText size={20} />
                </div>
                <div className="doc-row__text">
                  <div className="check-row__label">{document.name}</div>
                  <div className="meta-note">
                    Uploaded by {document.by} · {longDate(document.at)}
                  </div>
                </div>
                <span className="received-pill">Received</span>
              </div>
            ))}
            {referral.documents.length === 0 && <div className="muted">No documents yet.</div>}
          </div>
          <div className="stack stack--16">
            <div className="card card--pad-sm">
              <div className="small-heading">Still needed</div>
              {open.map(checklistRow)}
              {open.length === 0 && (
                <div className="nothing-left">
                  <CheckCircle />
                  Nothing outstanding
                </div>
              )}
            </div>
            <div className="meta-note meta-note--inset">
              Documents are visible only to you, your referring physician and the research team on this referral.
            </div>
          </div>
        </div>
      )}

      {tab === 'messages' &&
        (user.role === 'patient' ? (
          // Patients have a Messages section, so their conversations open only there.
          <Navigate to={`/patient/messages/${referral.id}`} state={{ draft }} replace />
        ) : (
          <Thread referral={referral} user={user} draft={draft} setDraft={setDraft} />
        ))}

      {tab === 'coverage' && (
        <div className="two-col">
          <div className="card card--pad">
            <h2 className="section-title">Coverage questions</h2>
            <p className="meta-note meta-note--below">
              General answers from the research site. Nothing here confirms insurance coverage for you.
            </p>
            {COVERAGE.map((item) => (
              <div key={item.q} className="coverage-item">
                <div className="check-row__label">{item.q}</div>
                <div className="coverage-item__answer">{item.a}</div>
              </div>
            ))}
          </div>
          <div className="ask-card">
            <div className="ask-card__title">Have a specific coverage question?</div>
            <div className="coverage-item__answer">Ask the coordinator in the shared conversation so your physician can see the answer too.</div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setDraft('Coverage question: ');
                setTab('messages');
              }}
            >
              <ChatCircle />
              Ask the coordinator
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
