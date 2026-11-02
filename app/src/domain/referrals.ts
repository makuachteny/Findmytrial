import { visitDay, visitTime } from './format';
import { ACCOUNTS, coordinatorFor, findAccount, ROLE_LABEL, USERS } from './seed';
import type {
  ActivityEntry,
  AppState,
  Contact,
  History,
  NextAction,
  Outcome,
  PreScreening,
  Referral,
  Role,
  Stage,
  Trial,
  User,
  Visit,
} from './types';

export class DomainError extends Error {}

export const STAGES: Stage[] = ['submitted', 'review', 'screening', 'decision'];

export const STAGE_LABEL: Record<Stage, string> = {
  submitted: 'Submitted',
  review: 'Initial review',
  screening: 'Screening',
  decision: 'Eligibility decision',
};

export const STATUS_EXPLAINER: Record<Stage, string> = {
  submitted: 'The referral has been received but no one on the research team has reviewed it yet.',
  review:
    "The research team is checking the referral against the trial's basic criteria and may request documents. This is not an eligibility decision.",
  screening:
    'Pending screening: a screening visit is being arranged or has been scheduled. Eligibility has not been decided. The final decision comes after the visit.',
  decision: 'A final eligibility decision has been recorded by the research team. This replaces the pending screening status.',
};

const newId = () => crypto.randomUUID();
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new DomainError(message);
}

function requireRole(actor: User, role: Role, action: string) {
  ensure(actor.role === role, `Only the ${ROLE_LABEL[role].toLowerCase()} can ${action}.`);
}

function find(state: AppState, referralId: string): Referral {
  const referral = state.referrals.find((r) => r.id === referralId);
  ensure(referral, 'This referral no longer exists.');
  return referral;
}

/** Finds a referral the actor can work on, so one site can't change another site's records. */
function findFor(state: AppState, actor: User, referralId: string): Referral {
  const referral = find(state, referralId);
  ensure(canAccess(referral, actor), 'You do not have access to this referral.');
  return referral;
}

function requireOpen(referral: Referral) {
  ensure(!referral.decision, 'The decision is final, so this referral can no longer change.');
}

function log(actor: User, text: string, at: string): ActivityEntry {
  return { id: newId(), who: actor.name, role: actor.role, text, at };
}

function update(state: AppState, referralId: string, change: (referral: Referral) => Partial<Referral>): AppState {
  return {
    ...state,
    referrals: state.referrals.map((r) => (r.id === referralId ? { ...r, ...change(r) } : r)),
  };
}

export function canAccess(referral: Referral, actor: User): boolean {
  if (actor.role === 'patient') return referral.patientUserId === actor.id;
  if (actor.role === 'physician') return referral.physicianId === actor.id;
  return referral.coordinatorId === actor.id;
}

export function visibleReferrals(state: AppState, actor: User): Referral[] {
  return state.referrals.filter((r) => canAccess(r, actor));
}

export function openItems(referral: Referral) {
  return referral.checklist.filter((item) => !item.doneAt);
}

/** Who can upload for this referral: the patient, or their physician when they have no account. */
export function uploaderRole(referral: Referral): Role {
  return referral.patientUserId ? 'patient' : 'physician';
}

export function nextAction(referral: Referral): NextAction {
  if (referral.status === 'decision') {
    return referral.decision === 'eligible'
      ? { text: 'Enrollment call to review consent and schedule the first study visit', owner: 'coordinator', kind: 'enroll' }
      : { text: 'Discuss other trial options with the referring physician', owner: 'physician', kind: 'discuss' };
  }
  const [firstOpen] = openItems(referral);
  if (firstOpen) return { text: `Upload ${firstOpen.label}`, owner: uploaderRole(referral), kind: 'upload' };
  if (referral.status === 'submitted') {
    return { text: 'Initial review of the referral by the research team', owner: 'coordinator', kind: 'review' };
  }
  if (referral.status === 'review') {
    return { text: 'Complete initial review and schedule the screening visit', owner: 'coordinator', kind: 'schedule' };
  }
  return referral.appointment
    ? {
        text: `Attend screening visit on ${visitDay(referral.appointment)} at ${visitTime(referral.appointment)}`,
        owner: 'patient',
        kind: 'attend',
      }
    : { text: 'Schedule screening visit', owner: 'coordinator', kind: 'schedule' };
}

/** The person a next action is assigned to. */
export function ownerName(referral: Referral, owner: Role): string {
  if (owner === 'patient') return referral.patient;
  const id = owner === 'physician' ? referral.physicianId : referral.coordinatorId;
  return findAccount(id)?.name ?? ROLE_LABEL[owner];
}

/** "Dr. Park" for "Dr. Elena Park". */
export function doctorName(name: string): string {
  return `Dr. ${name.split(' ').at(-1)}`;
}

export function isMine(referral: Referral, actor: User): boolean {
  return nextAction(referral).owner === actor.role && canAccess(referral, actor);
}

export function existingReferral(state: AppState, patient: string, trialId: string): Referral | undefined {
  const name = normalize(patient);
  return state.referrals.find((r) => r.trialId === trialId && normalize(r.patient) === name);
}

export function filterTrials(
  trials: Trial[],
  filters: { query: string; region: string; distance: string; recruitingOnly: boolean; phase: string; age: string },
): Trial[] {
  const query = normalize(filters.query);
  return trials.filter(
    (t) =>
      (!query || normalize(`${t.title} ${t.condition} ${t.tags.join(' ')} ${t.city}`).includes(query)) &&
      (filters.region === 'all' || t.state === filters.region) &&
      (filters.distance === 'any' || (t.distance !== null && t.distance <= Number(filters.distance))) &&
      (!filters.recruitingOnly || t.status === 'Recruiting') &&
      (!filters.phase || t.phase === filters.phase) &&
      // Every sample trial is for adults.
      filters.age !== 'CHILD',
  );
}

function createReferral(
  state: AppState,
  now: string,
  trial: Trial,
  fields: Pick<
    Referral,
    'patient' | 'condition' | 'patientUserId' | 'physicianId' | 'messages' | 'activity' | 'contact' | 'preScreening' | 'history'
  >,
  attachments: string[],
  attachedBy: string,
): { state: AppState; id: string } {
  ensure(!trial.registryUrl, 'Contact the study team directly. Find My Trial cannot send referrals for this study.');
  const duplicate = existingReferral(state, fields.patient, trial.id);
  ensure(!duplicate, `A referral for ${fields.patient} and this trial already exists (${duplicate?.id}).`);
  const id = `R-${state.nextId}`;
  const referral: Referral = {
    ...fields,
    id,
    trialId: trial.id,
    coordinatorId: coordinatorFor(trial).id,
    status: 'submitted',
    decision: null,
    submittedAt: now,
    stageDates: { submitted: now },
    checklist: [],
    documents: attachments.map((name) => ({ id: newId(), name, by: attachedBy, at: now, fileName: name })),
    appointment: null,
  };
  return {
    id,
    state: {
      ...state,
      nextId: state.nextId + 1,
      referrals: [referral, ...state.referrals],
      trials: { ...state.trials, [trial.id]: trial },
    },
  };
}

export function requestScreening(
  state: AppState,
  actor: User,
  input: {
    trial: Trial;
    condition: string;
    contact: Contact;
    preScreening: PreScreening;
    history: History | null;
    attachments: string[];
  },
  now: string,
): { state: AppState; id: string } {
  requireRole(actor, 'patient', 'request screening');
  const { trial, attachments, history } = input;
  const count = attachments.length;
  const detail = `${history ? ' and shared health history' : ''}${
    count ? ` with ${count} attached record${count > 1 ? 's' : ''}` : ''
  }`;
  return createReferral(
    state,
    now,
    trial,
    {
      patient: actor.name,
      condition: input.condition,
      patientUserId: actor.id,
      physicianId: actor.physicianId ?? USERS.physician.id,
      contact: input.contact,
      preScreening: input.preScreening,
      history,
      messages: [],
      activity: [log(actor, `Requested screening for ${trial.shortTitle.split(' · ')[0]}, answered 3 pre-screening questions${detail}.`, now)],
    },
    attachments,
    actor.name,
  );
}

export function referPatient(
  state: AppState,
  actor: User,
  input: { patient: string; condition: string; trial: Trial; note: string; attachments: string[] },
  now: string,
): { state: AppState; id: string } {
  requireRole(actor, 'physician', 'refer a patient');
  const patient = input.patient.trim();
  const condition = input.condition.trim();
  const note = input.note.trim();
  ensure(patient, "Enter the patient's name");
  ensure(condition, 'Enter the condition');
  const account = ACCOUNTS.find((a) => a.role === 'patient' && normalize(a.name) === normalize(patient));
  return createReferral(
    state,
    now,
    input.trial,
    {
      patient,
      condition,
      patientUserId: account?.id ?? null,
      physicianId: actor.id,
      contact: null,
      preScreening: null,
      history: null,
      messages: note ? [{ id: newId(), from: actor.name, role: actor.role, text: note, at: now }] : [],
      activity: [log(actor, `Referred ${patient} to ${input.trial.shortTitle.split(' · ')[0]}.`, now)],
    },
    input.attachments,
    actor.name,
  );
}

export function startReview(state: AppState, actor: User, referralId: string, now: string): AppState {
  requireRole(actor, 'coordinator', 'start a review');
  ensure(findFor(state, actor, referralId).status === 'submitted', 'This referral is already in review.');
  return update(state, referralId, (r) => ({
    status: 'review',
    stageDates: { ...r.stageDates, review: now },
    activity: [...r.activity, log(actor, 'Started initial review.', now)],
  }));
}

export function requestDocument(state: AppState, actor: User, referralId: string, label: string, now: string): AppState {
  requireRole(actor, 'coordinator', 'request a document');
  const referral = findFor(state, actor, referralId);
  requireOpen(referral);
  const name = label.trim();
  ensure(name, 'Choose a document to request');
  ensure(!referral.checklist.some((item) => item.label === name), `${name} has already been requested.`);
  const firstName = referral.patient.split(' ')[0];
  const lowerName = name.toLowerCase();
  const ask = referral.patientUserId
    ? `Hi ${firstName}, could you upload your ${lowerName}?`
    : `Hi ${doctorName(ownerName(referral, 'physician'))}, could you upload the ${lowerName} for ${referral.patient}?`;
  return update(state, referralId, (r) => ({
    checklist: [...r.checklist, { id: newId(), label: name, requestedBy: actor.name, requestedAt: now, doneAt: null }],
    activity: [...r.activity, log(actor, `Requested ${name}.`, now)],
    messages: [
      ...r.messages,
      {
        id: newId(),
        from: actor.name,
        role: actor.role,
        text: `${ask} It helps us complete the review before your screening visit.`,
        at: now,
      },
    ],
  }));
}

export function uploadDocument(
  state: AppState,
  actor: User,
  referralId: string,
  itemId: string,
  fileName: string,
  now: string,
): AppState {
  const referral = findFor(state, actor, referralId);
  requireRole(actor, uploaderRole(referral), 'upload this document');
  const item = referral.checklist.find((c) => c.id === itemId);
  ensure(item && !item.doneAt, 'This document is no longer waiting for an upload.');
  return update(state, referralId, (r) => ({
    checklist: r.checklist.map((c) => (c.id === itemId ? { ...c, doneAt: now } : c)),
    documents: [...r.documents, { id: newId(), name: item.label, by: actor.name, at: now, fileName }],
    activity: [...r.activity, log(actor, `Uploaded ${item.label}.`, now)],
  }));
}

export function moveToScreening(state: AppState, actor: User, referralId: string, visit: Visit, now: string): AppState {
  requireRole(actor, 'coordinator', 'move a referral to screening');
  ensure(findFor(state, actor, referralId).status === 'review', 'Only referrals in initial review can move to screening.');
  ensure(visit.date && visit.time, 'Choose a date and time for the visit.');
  ensure(visit.place.trim(), 'Enter the visit location.');
  ensure(new Date(`${visit.date}T${visit.time}`).getTime() > Date.parse(now), 'Choose a visit time in the future.');
  const appointment = { ...visit, place: visit.place.trim() };
  const when = `${visitDay(appointment)} at ${visitTime(appointment)}`;
  return update(state, referralId, (r) => ({
    status: 'screening',
    appointment,
    stageDates: { ...r.stageDates, screening: now },
    activity: [...r.activity, log(actor, `Moved referral to Screening and scheduled the screening visit for ${when}.`, now)],
    messages: [
      ...r.messages,
      {
        id: newId(),
        from: actor.name,
        role: actor.role,
        text: `Your screening visit is scheduled for ${when}. Plan on about 90 minutes. Reply here with any questions.`,
        at: now,
      },
    ],
  }));
}

export function recordDecision(state: AppState, actor: User, referralId: string, outcome: Outcome, now: string): AppState {
  requireRole(actor, 'coordinator', 'record a decision');
  const referral = findFor(state, actor, referralId);
  requireOpen(referral);
  ensure(referral.status === 'screening', 'Move the referral to screening before recording a decision.');
  const label = outcome === 'eligible' ? 'eligible to enroll.' : 'not eligible.';
  return update(state, referralId, (r) => ({
    status: 'decision',
    decision: outcome,
    appointment: null,
    stageDates: { ...r.stageDates, decision: now },
    activity: [...r.activity, log(actor, `Recorded eligibility decision: ${label}`, now)],
  }));
}

export function sendMessage(state: AppState, actor: User, referralId: string, body: string, now: string): AppState {
  findFor(state, actor, referralId);
  const text = body.trim();
  ensure(text, 'Write a message before sending.');
  return update(state, referralId, (r) => ({
    messages: [...r.messages, { id: newId(), from: actor.name, role: actor.role, text, at: now }],
  }));
}

export function toggleSavedTrial(state: AppState, actor: User, trial: Trial): AppState {
  const saved = state.saved[actor.id] ?? [];
  const next = saved.includes(trial.id) ? saved.filter((id) => id !== trial.id) : [...saved, trial.id];
  return {
    ...state,
    saved: { ...state.saved, [actor.id]: next },
    trials: { ...state.trials, [trial.id]: trial },
  };
}
