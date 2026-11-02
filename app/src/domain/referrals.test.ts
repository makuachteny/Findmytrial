import { beforeEach, describe, expect, it } from 'vitest';
import {
  canAccess,
  DomainError,
  existingReferral,
  filterTrials,
  isMine,
  moveToScreening,
  nextAction,
  openItems,
  ownerName,
  recordDecision,
  referPatient,
  requestDocument,
  requestScreening,
  sendMessage,
  startReview,
  toggleSavedTrial,
  uploadDocument,
  visibleReferrals,
} from './referrals';
import { matchesChip } from '../components/ui';
import { ACCOUNTS, coordinatorFor, createSeedState, findAccount, PATIENT_CONDITION, TRIALS, USERS } from './seed';
import type { AppState, Trial } from './types';

const { patient: alex, physician: park, coordinator: dana } = USERS;
const NOW = '2026-11-01T12:00:00.000Z';
const visit = { date: '2026-11-20', time: '10:00', place: 'Fourth floor' };
// Dana's site runs this trial, and she is the coordinator acting in these tests.
const trial = TRIALS.find((t) => t.id === 'FMT-2070') as Trial;
const contact = { dob: '03/14/1971', phone: '(617) 555-0142', email: 'alex.morgan@example.com' };
const preScreening = { diagnosed: 'Yes', medicine: 'No', travel: 'Not sure' } as const;

let state: AppState;

beforeEach(() => {
  state = { ...createSeedState(1, Date.parse(NOW)), referrals: [] };
});

function request(s = state) {
  return requestScreening(s, alex, { trial, condition: PATIENT_CONDITION, contact, preScreening, history: null, attachments: [] }, NOW);
}

describe('seven-step journey', () => {
  it('moves one record through every step, visible to all three portals', () => {
    const created = request();
    let s = created.state;
    const id = created.id;
    const referral = () => s.referrals.find((r) => r.id === id)!;

    expect(id).toBe('R-1043');
    expect(referral().status).toBe('submitted');
    expect(nextAction(referral()).owner).toBe('coordinator');

    s = startReview(s, dana, id, NOW);
    s = requestDocument(s, dana, id, 'Current medication list', NOW);
    expect(nextAction(referral())).toMatchObject({ text: 'Upload Current medication list', owner: 'patient' });
    expect(referral().messages.at(-1)?.text).toContain('Hi Alex');
    expect(isMine(referral(), alex)).toBe(true);

    s = uploadDocument(s, alex, id, referral().checklist[0].id, 'meds.pdf', NOW);
    expect(referral().documents[0]).toMatchObject({ name: 'Current medication list', by: 'Alex Morgan', fileName: 'meds.pdf' });
    expect(nextAction(referral()).owner).toBe('coordinator');

    s = moveToScreening(s, dana, id, visit, NOW);
    expect(referral().status).toBe('screening');
    expect(referral().messages.at(-1)?.text).toContain('Plan on about 90 minutes');
    expect(nextAction(referral()).text).toContain('Attend screening visit');

    s = sendMessage(s, park, id, 'How did it go?', NOW);
    s = recordDecision(s, dana, id, 'eligible', NOW);

    expect(referral()).toMatchObject({ status: 'decision', decision: 'eligible', appointment: null });
    expect(nextAction(referral()).kind).toBe('enroll');
    for (const user of [alex, park, dana]) expect(visibleReferrals(s, user).map((r) => r.id)).toContain(id);
  });
});

describe('next action', () => {
  it('sends a not-eligible patient back to the physician', () => {
    const { state: s0, id } = request();
    let s = startReview(s0, dana, id, NOW);
    s = moveToScreening(s, dana, id, visit, NOW);
    s = recordDecision(s, dana, id, 'not_eligible', NOW);
    expect(nextAction(s.referrals[0])).toMatchObject({ owner: 'physician', kind: 'discuss' });
  });

  it('puts a requested document ahead of the stage, as the design does', () => {
    const { state: s0, id } = request();
    const s = requestDocument(startReview(s0, dana, id, NOW), dana, id, 'Copy of insurance card', NOW);
    expect(nextAction(s.referrals[0]).kind).toBe('upload');
  });

  it('names the trial coordinator as owner', () => {
    const { state: s } = request();
    expect(ownerName(s.referrals[0], 'coordinator')).toBe(trial.coordinator);
  });
});

describe('duplicates', () => {
  it('blocks a second request for the same trial, even after a decision', () => {
    expect(() => request(request().state)).toThrow(/already exists/);
  });

  it('treats name case and spacing as the same patient', () => {
    expect(existingReferral(request().state, '  alex   MORGAN ', trial.id)).toBeDefined();
  });

  it('blocks a physician from duplicating a patient referral', () => {
    const input = { patient: 'Alex Morgan', condition: 'x', trial, note: '', attachments: [] };
    expect(() => referPatient(request().state, park, input, NOW)).toThrow(/already exists/);
  });
});

describe('stage rules', () => {
  it('rejects a visit in the past', () => {
    const { state: s0, id } = request();
    const s = startReview(s0, dana, id, NOW);
    expect(() => moveToScreening(s, dana, id, { ...visit, date: '2026-10-01' }, NOW)).toThrow(/future/);
  });

  it('cannot record a decision before screening', () => {
    const { state: s0, id } = request();
    expect(() => recordDecision(startReview(s0, dana, id, NOW), dana, id, 'eligible', NOW)).toThrow(/screening/);
  });

  it('makes the decision final', () => {
    const { state: s0, id } = request();
    let s = moveToScreening(startReview(s0, dana, id, NOW), dana, id, visit, NOW);
    s = recordDecision(s, dana, id, 'eligible', NOW);
    expect(() => recordDecision(s, dana, id, 'not_eligible', NOW)).toThrow(/final/);
    expect(() => requestDocument(s, dana, id, 'Copy of insurance card', NOW)).toThrow(/final/);
  });

  it('does not request the same document twice', () => {
    const { state: s0, id } = request();
    const s = requestDocument(s0, dana, id, 'Copy of insurance card', NOW);
    expect(() => requestDocument(s, dana, id, 'Copy of insurance card', NOW)).toThrow(/already been requested/);
    expect(openItems(s.referrals[0])).toHaveLength(1);
  });
});

describe('who can do what', () => {
  it('stops patients and physicians from taking site actions', () => {
    const { state: s, id } = request();
    expect(() => startReview(s, alex, id, NOW)).toThrow(DomainError);
    expect(() => startReview(s, park, id, NOW)).toThrow(DomainError);
  });

  it('stops anyone but the patient uploading', () => {
    const { state: s0, id } = request();
    const s = requestDocument(s0, dana, id, 'Copy of insurance card', NOW);
    expect(() => uploadDocument(s, dana, id, s.referrals[0].checklist[0].id, 'x.pdf', NOW)).toThrow(DomainError);
  });

  it('lets the referring physician upload when the patient has no account', () => {
    const referred = referPatient(state, park, { patient: 'Jo Doe', condition: 'Migraine', trial, note: '', attachments: [] }, NOW);
    const s = requestDocument(referred.state, dana, referred.id, 'Copy of insurance card', NOW);
    const referral = s.referrals[0];
    expect(nextAction(referral)).toMatchObject({ owner: 'physician', kind: 'upload' });
    expect(isMine(referral, park)).toBe(true);
    expect(referral.messages.at(-1)?.text).toContain('Hi Dr. Park');
    const uploaded = uploadDocument(s, park, referred.id, referral.checklist[0].id, 'card.pdf', NOW);
    expect(openItems(uploaded.referrals[0])).toHaveLength(0);
    expect(uploaded.referrals[0].documents[0].by).toBe(park.name);
  });

  it('keeps uploads with the patient when they have an account', () => {
    const { state: s0, id } = request();
    const s = requestDocument(s0, dana, id, 'Copy of insurance card', NOW);
    expect(() => uploadDocument(s, park, id, s.referrals[0].checklist[0].id, 'x.pdf', NOW)).toThrow(DomainError);
  });

  it('credits a document request to whoever made it', () => {
    const { state: s0, id } = request();
    const s = requestDocument(s0, dana, id, 'Copy of insurance card', NOW);
    expect(s.referrals[0].checklist[0].requestedBy).toBe(dana.name);
  });

  it('hides other people’s referrals from a patient', () => {
    const { state: s } = referPatient(state, park, { patient: 'Jo Doe', condition: 'Migraine', trial, note: 'Hello', attachments: [] }, NOW);
    expect(canAccess(s.referrals[0], alex)).toBe(false);
    expect(() => sendMessage(s, alex, s.referrals[0].id, 'hi', NOW)).toThrow(DomainError);
  });

  it('links a physician referral to the patient portal when the patient has an account', () => {
    const { state: s } = referPatient(state, park, { patient: 'alex morgan', condition: 'Migraine', trial, note: '', attachments: [] }, NOW);
    expect(visibleReferrals(s, alex)).toHaveLength(1);
  });

  it('turns the physician note into the first message and logs attachments', () => {
    const { state: s } = referPatient(state, park, { patient: 'Jo Doe', condition: 'Migraine', trial, note: 'Recent labs attached', attachments: ['labs.pdf'] }, NOW);
    expect(s.referrals[0].messages[0].text).toBe('Recent labs attached');
    expect(s.referrals[0].documents[0]).toMatchObject({ name: 'labs.pdf', by: park.name });
  });
});

describe('status chips', () => {
  it('does not count a decided referral as missing information', () => {
    const { state: s0, id } = request();
    let s = moveToScreening(startReview(s0, dana, id, NOW), dana, id, visit, NOW);
    s = requestDocument(s, dana, id, 'Copy of insurance card', NOW);
    expect(matchesChip(s.referrals[0], 'missing')).toBe(true);
    s = recordDecision(s, dana, id, 'eligible', NOW);
    expect(matchesChip(s.referrals[0], 'missing')).toBe(false);
    expect(matchesChip(s.referrals[0], 'decision')).toBe(true);
  });
});

describe('seed and search', () => {
  it('keeps every sample screening visit in the future', () => {
    const seeded = createSeedState(1, Date.parse(NOW));
    const visits = seeded.referrals.flatMap((r) => (r.appointment ? [r.appointment] : []));
    expect(visits).toHaveLength(3);
    for (const v of visits) expect(Date.parse(`${v.date}T${v.time}`)).toBeGreaterThan(Date.parse(NOW));
  });

  it('gives every sample account its own referrals', () => {
    const seeded = createSeedState(1, Date.parse(NOW));
    expect(ACCOUNTS).toHaveLength(16);
    for (const account of ACCOUNTS) {
      expect(visibleReferrals(seeded, account).length, account.name).toBeGreaterThan(0);
    }
    expect(visibleReferrals(seeded, alex).map((r) => r.id)).toEqual(['R-1042', 'R-1040']);
    expect(visibleReferrals(seeded, park)).toHaveLength(7);
    expect(visibleReferrals(seeded, dana)).toHaveLength(4);
  });

  it('links every seeded referral to real people at the right site', () => {
    const seeded = createSeedState(1, Date.parse(NOW));
    for (const r of seeded.referrals) {
      const site = coordinatorFor(seeded.trials[r.trialId]);
      expect(r.coordinatorId, r.id).toBe(site.id);
      expect(findAccount(r.physicianId)?.role, r.id).toBe('physician');
      if (r.patientUserId) expect(findAccount(r.patientUserId)?.name, r.id).toBe(r.patient);
      for (const note of [...r.messages, ...r.activity]) {
        const author = 'from' in note ? note.from : note.who;
        expect([r.patient, ownerName(r, 'physician'), site.name], `${r.id}: ${author}`).toContain(author);
      }
    }
  });

  it('shows the seven stage combinations a demo needs', () => {
    const seeded = createSeedState(1, Date.parse(NOW));
    const states = new Set(seeded.referrals.map((r) => r.decision ?? r.status));
    expect([...states].sort()).toEqual(['eligible', 'not_eligible', 'review', 'screening', 'submitted']);
    expect(seeded.referrals.some((r) => r.patientUserId === null)).toBe(true);
    expect(seeded.referrals.some((r) => r.checklist.some((item) => !item.doneAt))).toBe(true);
  });

  it('keeps each person to their own referrals', () => {
    const seeded = createSeedState(1, Date.parse(NOW));
    const hannah = ACCOUNTS.find((a) => a.name === 'Hannah Blum') as NonNullable<ReturnType<typeof findAccount>>;
    const jordan = ACCOUNTS.find((a) => a.name === 'Jordan Lee') as NonNullable<ReturnType<typeof findAccount>>;
    const adler = ACCOUNTS.find((a) => a.name === 'Dr. Naomi Adler') as NonNullable<ReturnType<typeof findAccount>>;
    const danas = seeded.referrals.find((r) => r.id === 'R-1042') as AppState['referrals'][number];
    expect(canAccess(danas, hannah)).toBe(false);
    expect(canAccess(danas, jordan)).toBe(false);
    expect(canAccess(danas, adler)).toBe(false);
    expect(() => recordDecision(seeded, hannah, danas.id, 'eligible', NOW)).toThrow(DomainError);
    expect(() => requestDocument(seeded, hannah, danas.id, 'Copy of insurance card', NOW)).toThrow(DomainError);
    expect(() => sendMessage(seeded, jordan, danas.id, 'Hello', NOW)).toThrow(DomainError);
  });

  it('gives every seeded record a unique ID', () => {
    const seeded = createSeedState(1, Date.parse(NOW));
    const ids = seeded.referrals.flatMap((r) => [...r.messages, ...r.activity, ...r.checklist, ...r.documents].map((x) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('routes a referral to the patient’s physician and the trial’s coordinator', () => {
    const omar = ACCOUNTS.find((a) => a.name === 'Omar Haddad') as NonNullable<ReturnType<typeof findAccount>>;
    const asthma = TRIALS.find((t) => t.id === 'FMT-2057') as Trial;
    const { state: next, id } = requestScreening(state, omar, { trial: asthma, condition: 'Asthma', contact, preScreening, history: null, attachments: [] }, NOW);
    const created = next.referrals.find((r) => r.id === id) as AppState['referrals'][number];
    expect(ownerName(created, 'physician')).toBe('Dr. Naomi Adler');
    expect(ownerName(created, 'coordinator')).toBe('Marcus Oyelaran');
  });

  it('sends a registry study to the demo site', () => {
    const live = { ...trial, id: 'NCT00000000', coordinator: 'Study team' };
    expect(coordinatorFor(live)).toBe(dana);
  });

  it('filters by condition, region, distance and recruiting', () => {
    const base = { query: '', region: 'all', distance: 'any', recruitingOnly: false, phase: '', age: '' };
    expect(filterTrials(TRIALS, { ...base, query: 'migraine' }).map((t) => t.id)).toEqual(['FMT-2063']);
    expect(filterTrials(TRIALS, { ...base, region: 'RI' }).map((t) => t.id)).toEqual(['FMT-2084']);
    expect(filterTrials(TRIALS, { ...base, distance: '10' })).toHaveLength(3);
    expect(filterTrials(TRIALS, { ...base, recruitingOnly: true })).toHaveLength(4);
    expect(filterTrials(TRIALS, { ...base, phase: 'Phase 2' }).map((t) => t.id)).toEqual(['FMT-2057', 'FMT-2084']);
    expect(filterTrials(TRIALS, { ...base, age: 'CHILD' })).toHaveLength(0);
  });

  it('keeps a saved trial in the record so it survives without the registry', () => {
    const live = { ...trial, id: 'NCT00000000' };
    const saved = toggleSavedTrial(state, alex, live);
    expect(saved.saved[alex.id]).toContain(live.id);
    expect(saved.trials[live.id]).toEqual(live);
    expect(toggleSavedTrial(saved, alex, live).saved[alex.id]).not.toContain(live.id);
  });
});
