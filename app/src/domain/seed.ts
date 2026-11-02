import type {
  AppState,
  ChecklistItem,
  History,
  Message,
  PreScreening,
  Referral,
  Role,
  Stage,
  Trial,
  User,
  Visit,
} from './types';

export const PATIENT_CONDITION = 'Type 2 diabetes · hypertension';

export const ROLE_LABEL: Record<Role, string> = {
  patient: 'Patient',
  physician: 'Physician',
  coordinator: 'Research coordinator',
};

const staff = (role: Role, id: string, name: string, detail: string): User => ({
  id,
  role,
  name,
  roleLabel: ROLE_LABEL[role],
  detail,
});

const PHYSICIANS = {
  park: staff('physician', 'user-park', 'Dr. Elena Park', 'Riverside Primary Care'),
  adler: staff('physician', 'user-adler', 'Dr. Naomi Adler', 'Northside Family Medicine'),
};

const COORDINATORS = {
  dana: staff('coordinator', 'user-dana', 'Dana Whitfield', 'Beacon Clinical Research Center'),
  marcus: staff('coordinator', 'user-marcus', 'Marcus Oyelaran', 'Charles River Lung Institute'),
  venkatesan: staff('coordinator', 'user-venkatesan', 'Priya Venkatesan', 'Northgate Neurology Research'),
  hannah: staff('coordinator', 'user-hannah', 'Hannah Blum', 'Bay State Rheumatology Trials'),
  luis: staff('coordinator', 'user-luis', 'Luis Ortega', 'Harbor Community Health Research'),
};

const patient = (key: string, name: string, condition: string, physician: User, dob: string, phone: string): User => ({
  id: `user-${key}`,
  role: 'patient',
  name,
  roleLabel: ROLE_LABEL.patient,
  detail: condition,
  physicianId: physician.id,
  contact: { dob, phone, email: `${name.toLowerCase().replace(' ', '.')}@example.com` },
});

const { park, adler } = PHYSICIANS;

const PATIENTS = {
  alex: patient('alex', 'Alex Morgan', PATIENT_CONDITION, park, '03/14/1971', '(617) 555-0142'),
  jordan: patient('jordan', 'Jordan Lee', 'Asthma', park, '07/22/1988', '(617) 555-0107'),
  maria: patient('maria', 'Maria Castillo', 'Type 2 diabetes', park, '11/02/1963', '(617) 555-0126'),
  sam: patient('sam', 'Sam Okafor', 'Type 2 diabetes', park, '05/30/1975', '(617) 555-0133'),
  priya: patient('priya', 'Priya Nair', 'Rheumatoid arthritis', adler, '09/18/1969', '(781) 555-0115'),
  theo: patient('theo', 'Theo Brandt', 'Migraine', adler, '01/09/1990', '(781) 555-0174'),
  grace: patient('grace', 'Grace Liu', 'Asthma', adler, '12/05/1982', '(781) 555-0158'),
  omar: patient('omar', 'Omar Haddad', PATIENT_CONDITION, adler, '04/27/1966', '(781) 555-0191'),
  lena: patient('lena', 'Lena Fischer', 'Rheumatoid arthritis', adler, '08/11/1958', '(781) 555-0149'),
};

/** Every sample person who can sign in. */
export const ACCOUNTS: User[] = [
  ...Object.values(PATIENTS),
  ...Object.values(PHYSICIANS),
  ...Object.values(COORDINATORS),
];

/** The account each portal offers first. */
export const USERS: Record<Role, User> = {
  patient: PATIENTS.alex,
  physician: park,
  coordinator: COORDINATORS.dana,
};

export function findAccount(id: string): User | undefined {
  return ACCOUNTS.find((account) => account.id === id);
}

/** Sample trials go to their own coordinator. Registry studies have none, so they go to the demo site. */
export function coordinatorFor(trial: Trial): User {
  return Object.values(COORDINATORS).find((c) => c.name === trial.coordinator) ?? USERS.coordinator;
}

export const DOC_OPTIONS = [
  "HbA1c lab result (last 3 months)",
  "Current medication list",
  "Recent blood pressure log",
  "Pulmonary function test report",
  "Copy of insurance card"
];

export const COVERAGE = [
  {
    "q": "Who pays for the study medicine and visits?",
    "a": "Study medicine, study-specific tests and visit parking are covered by the study sponsor. Routine care you would receive anyway is billed as usual."
  },
  {
    "q": "Will my insurance be contacted?",
    "a": "Only if routine care is billed. The research team can walk through what is study-related and what is routine before you decide to join."
  },
  {
    "q": "Is travel reimbursed?",
    "a": "Most sites reimburse mileage or transit for each visit. The exact amount is confirmed with you before the screening visit."
  }
];

export const QUICK_REPLIES: Record<Role, string[]> = {
  patient: ['Thank you, that works for me.', 'Can I reschedule the visit?', 'What should I bring?'],
  physician: [
    'Records sent. Let me know if anything is missing.',
    'Please keep me posted on the decision.',
    'Happy to discuss by phone.',
  ],
  coordinator: [
    'Thanks, received.',
    'Could you upload that when you have a moment?',
    'Your visit is confirmed. Plan on about 90 minutes.',
  ],
};

export const TRIALS: Trial[] = ([
  {
    "id": "FMT-2041",
    "title": "Once-weekly injectable for type 2 diabetes (ASCEND-2)",
    "shortTitle": "ASCEND-2 · Type 2 diabetes",
    "condition": "Type 2 diabetes",
    "tags": [
      "diabetes",
      "glucose",
      "a1c",
      "injectable"
    ],
    "phase": "Phase 3",
    "status": "Recruiting",
    "site": "Beacon Clinical Research Center",
    "city": "Boston, MA",
    "state": "MA",
    "distance": 4,
    "address": "120 Harbor Way, 4th floor, Boston, MA 02210",
    "coordinator": "Dana Whitfield",
    "phone": "(617) 555-0188",
    "summary": "Compares a once-weekly injectable with standard daily therapy in adults whose HbA1c remains above target on metformin.",
    "overview": "This study looks at whether a once-weekly injectable medicine lowers HbA1c more than standard daily therapy over 52 weeks in adults with type 2 diabetes. Participants continue their usual metformin and are randomly assigned to one of two treatment groups.",
    "criteria": [
      "Adults 18–75 with type 2 diabetes for at least 6 months",
      "HbA1c between 7.0% and 10.5% at screening",
      "Currently taking metformin at a stable dose",
      "No insulin use in the past 90 days"
    ],
    "duration": "52 weeks",
    "visits": "9 in-person visits, 4 phone check-ins",
    "screening": "About 2 hours, includes blood work",
    "expect": "Visits include a brief exam, blood draws and a review of your glucose log. Study medicine and visit parking are provided at no cost. You can leave the study at any time."
  },
  {
    "id": "FMT-2057",
    "title": "Inhaled biologic for moderate persistent asthma (BREATHE-Forward)",
    "shortTitle": "BREATHE-Forward · Asthma",
    "condition": "Asthma",
    "tags": [
      "asthma",
      "lung",
      "breathing",
      "inhaler"
    ],
    "phase": "Phase 2",
    "status": "Recruiting",
    "site": "Charles River Lung Institute",
    "city": "Cambridge, MA",
    "state": "MA",
    "distance": 7,
    "address": "55 Binney Street, Cambridge, MA 02142",
    "coordinator": "Marcus Oyelaran",
    "phone": "(617) 555-0142",
    "summary": "Tests whether an inhaled biologic reduces flare-ups in adults with moderate asthma not fully controlled on inhaled steroids.",
    "overview": "Participants add an investigational inhaled biologic or placebo to their current controller inhaler for 24 weeks. The study measures flare-ups, lung function and symptom scores.",
    "criteria": [
      "Adults 18–65 with a physician diagnosis of asthma",
      "At least one flare-up requiring oral steroids in the past year",
      "Stable controller therapy for 3 months",
      "Non-smoker for at least 12 months"
    ],
    "duration": "24 weeks",
    "visits": "7 in-person visits",
    "screening": "About 90 minutes, includes breathing tests",
    "expect": "Each visit includes breathing tests and a symptom questionnaire. A rescue inhaler is always available."
  },
  {
    "id": "FMT-2063",
    "title": "Preventive therapy for chronic migraine (CLEARPATH)",
    "shortTitle": "CLEARPATH · Migraine",
    "condition": "Migraine",
    "tags": [
      "migraine",
      "headache",
      "neurology",
      "prevention"
    ],
    "phase": "Phase 3",
    "status": "Not yet recruiting",
    "site": "Northgate Neurology Research",
    "city": "Worcester, MA",
    "state": "MA",
    "distance": 41,
    "address": "9 Northgate Plaza, Worcester, MA 01608",
    "coordinator": "Priya Venkatesan",
    "phone": "(508) 555-0171",
    "summary": "Evaluates a monthly preventive treatment for adults with 15 or more headache days per month.",
    "overview": "This 6-month study compares a monthly preventive treatment with placebo in adults with chronic migraine. Headache days are tracked in a daily diary app.",
    "criteria": [
      "Adults 18–65 with chronic migraine for at least 1 year",
      "15 or more headache days per month",
      "No more than 2 prior failed preventive medicines",
      "Willing to keep a daily headache diary"
    ],
    "duration": "6 months",
    "visits": "5 in-person visits, monthly diary review",
    "screening": "About 1 hour",
    "expect": "Most of the study happens through the diary app. In-person visits are short and focused on safety checks."
  },
  {
    "id": "FMT-2070",
    "title": "Blood pressure control in adults with diabetes (STEADY-BP)",
    "shortTitle": "STEADY-BP · Hypertension",
    "condition": "Hypertension",
    "tags": [
      "blood pressure",
      "hypertension",
      "diabetes",
      "cardiovascular"
    ],
    "phase": "Phase 3",
    "status": "Recruiting",
    "site": "Beacon Clinical Research Center",
    "city": "Boston, MA",
    "state": "MA",
    "distance": 4,
    "address": "120 Harbor Way, 4th floor, Boston, MA 02210",
    "coordinator": "Dana Whitfield",
    "phone": "(617) 555-0188",
    "summary": "Compares two blood pressure targets in adults who have both high blood pressure and type 2 diabetes.",
    "overview": "Participants are assigned to a standard or a more intensive blood pressure target for 12 months. Medicines are adjusted by the study physician to reach the assigned target.",
    "criteria": [
      "Adults 40–80 with type 2 diabetes and high blood pressure",
      "Systolic blood pressure 140 or higher on current treatment",
      "No heart attack or stroke in the past 6 months",
      "Able to measure blood pressure at home"
    ],
    "duration": "12 months",
    "visits": "8 in-person visits, home readings weekly",
    "screening": "About 90 minutes, includes ECG",
    "expect": "A home blood pressure monitor is provided. Visits focus on readings, medicine adjustments and lab work."
  },
  {
    "id": "FMT-2084",
    "title": "Oral therapy for moderate rheumatoid arthritis (JOINT-Reach)",
    "shortTitle": "JOINT-Reach · Rheumatoid arthritis",
    "condition": "Rheumatoid arthritis",
    "tags": [
      "arthritis",
      "joint",
      "rheumatology",
      "autoimmune"
    ],
    "phase": "Phase 2",
    "status": "Active, not recruiting",
    "site": "Bay State Rheumatology Trials",
    "city": "Providence, RI",
    "state": "RI",
    "distance": 48,
    "address": "300 Richmond Street, Providence, RI 02903",
    "coordinator": "Hannah Blum",
    "phone": "(401) 555-0119",
    "summary": "Studies a once-daily oral treatment for adults with moderate rheumatoid arthritis who have not responded to methotrexate.",
    "overview": "A 16-week study of a once-daily oral medicine added to methotrexate, measuring joint counts and patient-reported function.",
    "criteria": [
      "Adults 18 and older with rheumatoid arthritis",
      "Inadequate response to methotrexate for at least 3 months",
      "No biologic therapy in the past 8 weeks",
      "Up-to-date on tuberculosis screening"
    ],
    "duration": "16 weeks",
    "visits": "6 in-person visits",
    "screening": "About 2 hours, includes joint exam and labs",
    "expect": "Visits include a joint assessment, blood work and a questionnaire about daily activities."
  },
  {
    "id": "FMT-2091",
    "title": "Glucose-monitoring coaching study (GLUCO-Guide)",
    "shortTitle": "GLUCO-Guide · Type 2 diabetes",
    "condition": "Type 2 diabetes",
    "tags": [
      "diabetes",
      "glucose",
      "cgm",
      "coaching",
      "lifestyle"
    ],
    "phase": "Phase 4",
    "status": "Recruiting",
    "site": "Harbor Community Health Research",
    "city": "Hartford, CT",
    "state": "CT",
    "distance": 92,
    "address": "41 Asylum Street, Hartford, CT 06103",
    "coordinator": "Luis Ortega",
    "phone": "(860) 555-0163",
    "summary": "Tests whether a continuous glucose monitor paired with phone coaching improves HbA1c compared with usual care.",
    "overview": "Participants wear a continuous glucose monitor for 6 months. Half also receive weekly phone coaching from a diabetes educator. Most contact is remote.",
    "criteria": [
      "Adults 18 and older with type 2 diabetes",
      "HbA1c of 7.5% or higher in the past 3 months",
      "Own a smartphone compatible with the monitor app",
      "Not currently using a continuous glucose monitor"
    ],
    "duration": "6 months",
    "visits": "3 in-person visits, weekly phone calls",
    "screening": "About 1 hour",
    "expect": "After the first visit nearly everything is remote. Sensors are mailed to you and coaching calls are 15 minutes."
  }
] satisfies Omit<Trial, 'registryUrl'>[]).map((trial) => ({
  ...trial,
  status: trial.status as Trial['status'],
  registryUrl: null,
}));

// The design's dates sit around this day. The seed keeps their spacing but moves them to today,
// so the sample screening visits are always upcoming.
const SEED_ANCHOR = Date.parse('2026-10-17T12:00:00');
const DAY_MS = 86_400_000;

const STAGE_ORDER: Stage[] = ['submitted', 'review', 'screening', 'decision'];

export function createSeedState(version: number, nowMs = Date.now()): AppState {
  const shift = Math.round((nowMs - SEED_ANCHOR) / DAY_MS) * DAY_MS;
  const at = (date: string) => new Date(Date.parse(`2026-${date}:00`) + shift).toISOString();
  const { alex, jordan, maria, sam, priya, theo, grace, omar, lena } = PATIENTS;
  const { dana, marcus, venkatesan, hannah, luis } = COORDINATORS;

  const say = (id: string, user: User, text: string, date: string): Message => ({
    id,
    from: user.name,
    role: user.role,
    text,
    at: at(date),
  });
  const log = (id: string, user: User, text: string, date: string) => ({
    id,
    who: user.name,
    role: user.role,
    text,
    at: at(date),
  });
  const item = (id: string, by: User, label: string, requested: string, done: string | null): ChecklistItem => ({
    id,
    label,
    requestedBy: by.name,
    requestedAt: at(requested),
    doneAt: done ? at(done) : null,
  });
  const doc = (id: string, name: string, by: string, date: string) => ({ id, name, by, at: at(date), fileName: null });
  const visit = (date: string, time: string, place: string): Visit => ({
    date: new Date(Date.parse(`2026-${date}T12:00:00`) + shift).toISOString().slice(0, 10),
    time,
    place,
  });
  const fourthFloor = `${dana.detail}, 4th floor`;

  /** Fills in the links between people, so a referral only lists what makes it different. */
  const referral = (
    id: string,
    person: User,
    trialId: string,
    dates: Partial<Record<Stage, string>>,
    details: Partial<Referral> = {},
  ): Referral => {
    const trial = TRIALS.find((t) => t.id === trialId) as Trial;
    const scoped = <T extends { id: string }>(items: T[] = []) => items.map((x) => ({ ...x, id: `${id}-${x.id}` }));
    return {
      id,
      patient: person.name,
      patientUserId: person.id,
      condition: person.detail,
      physicianId: person.physicianId as string,
      coordinatorId: coordinatorFor(trial).id,
      trialId,
      status: STAGE_ORDER.filter((stage) => dates[stage]).at(-1) as Stage,
      decision: null,
      submittedAt: at(dates.submitted as string),
      stageDates: Object.fromEntries(Object.entries(dates).map(([stage, date]) => [stage, at(date)])),
      appointment: null,
      contact: null,
      preScreening: null,
      history: null,
      ...details,
      checklist: scoped(details.checklist),
      documents: scoped(details.documents),
      messages: scoped(details.messages),
      activity: scoped(details.activity),
    };
  };

  const yes: PreScreening = { diagnosed: 'Yes', medicine: 'Yes', travel: 'Yes' };
  const alexHistory: History = {
    conditions: 'Type 2 diabetes since 2019, high blood pressure since 2021',
    medications: 'Metformin 1000 mg twice daily, lisinopril 20 mg daily',
    notes: 'Prefers morning visits.',
  };

  const referrals: Referral[] = [
    referral('R-1042', alex, 'FMT-2070', { submitted: '10-06T15:12', review: '10-08T09:30', screening: '10-14T11:15' }, {
      checklist: [
        item('c1', dana, 'Current medication list', '10-08T09:30', '10-09T08:02'),
        item('c2', dana, 'Recent blood pressure log', '10-08T09:30', '10-12T18:40'),
      ],
      documents: [
        doc('d1', 'Current medication list', alex.name, '10-09T08:02'),
        doc('d2', 'Recent blood pressure log', alex.name, '10-12T18:40'),
      ],
      messages: [
        say('m1', dana, 'Hi Alex, thanks for sending the blood pressure log. Your screening visit is confirmed. Please bring your home monitor.', '10-14T11:20'),
        say('m2', alex, 'Thanks, I will be there. Should I take my morning medicines as usual?', '10-14T12:05'),
        say('m3', dana, 'Yes, take everything as usual. No fasting is needed for this visit.', '10-14T13:48'),
      ],
      activity: [
        log('a1', park, 'Referred Alex Morgan to STEADY-BP.', '10-06T15:12'),
        log('a2', dana, 'Started initial review. Requested medication list and blood pressure log.', '10-08T09:30'),
        log('a3', alex, 'Uploaded Current medication list.', '10-09T08:02'),
        log('a4', alex, 'Uploaded Recent blood pressure log.', '10-12T18:40'),
        log('a5', dana, 'Moved referral to Screening and scheduled the screening visit.', '10-14T11:15'),
      ],
      appointment: visit('10-28', '10:00', fourthFloor),
    }),
    referral('R-1040', alex, 'FMT-2091', { submitted: '10-15T18:20' }, {
      condition: 'Type 2 diabetes',
      contact: alex.contact,
      preScreening: yes,
      history: alexHistory,
      messages: [say('m1', alex, 'Hi, is the glucose monitor provided, or would I need to buy one?', '10-15T18:31')],
      activity: [log('a1', alex, 'Requested screening for GLUCO-Guide, answered 3 pre-screening questions and shared health history.', '10-15T18:20')],
    }),
    referral('R-1038', jordan, 'FMT-2057', { submitted: '10-09T10:44', review: '10-10T14:10' }, {
      checklist: [item('c1', marcus, 'Pulmonary function test report', '10-10T14:10', null)],
      messages: [
        say('m1', marcus, 'Hi Jordan, could you upload your most recent pulmonary function test so we can complete the review?', '10-10T14:15'),
      ],
      activity: [
        log('a1', park, 'Referred Jordan Lee to BREATHE-Forward.', '10-09T10:44'),
        log('a2', marcus, 'Requested Pulmonary function test report.', '10-10T14:10'),
      ],
    }),
    referral('R-1036', grace, 'FMT-2057', { submitted: '10-02T11:05', review: '10-05T09:40', screening: '10-13T10:20' }, {
      checklist: [item('c1', marcus, 'Current medication list', '10-05T09:40', '10-06T19:12')],
      documents: [doc('d1', 'Current medication list', grace.name, '10-06T19:12')],
      messages: [
        say('m1', marcus, 'Hi Grace, your screening visit is booked. The breathing tests take about 45 minutes, so please avoid your rescue inhaler for 6 hours beforehand if you safely can.', '10-13T10:25'),
        say('m2', grace, 'Understood, thank you. Is there parking at the institute?', '10-13T17:02'),
        say('m3', marcus, 'Yes, the Binney Street garage. We validate your ticket at the front desk.', '10-14T09:10'),
      ],
      activity: [
        log('a1', adler, 'Referred Grace Liu to BREATHE-Forward.', '10-02T11:05'),
        log('a2', marcus, 'Started initial review. Requested Current medication list.', '10-05T09:40'),
        log('a3', grace, 'Uploaded Current medication list.', '10-06T19:12'),
        log('a4', marcus, 'Moved referral to Screening and scheduled the screening visit.', '10-13T10:20'),
      ],
      appointment: visit('10-29', '11:30', `${marcus.detail}, Clinic B`),
    }),
    referral('R-1035', priya, 'FMT-2084', { submitted: '10-16T16:02' }, {
      messages: [say('m1', adler, 'Priya has had an inadequate response to methotrexate for about five months. Please let me know if you need her recent labs.', '10-16T16:02')],
      activity: [log('a1', adler, 'Referred Priya Nair to JOINT-Reach.', '10-16T16:02')],
    }),
    referral('R-1033', omar, 'FMT-2070', { submitted: '10-07T13:30', review: '10-09T10:15' }, {
      checklist: [item('c1', dana, 'Recent blood pressure log', '10-09T10:15', '10-13T20:05')],
      documents: [doc('d1', 'Recent blood pressure log', omar.name, '10-13T20:05')],
      messages: [
        say('m1', dana, 'Hi Omar, could you upload two weeks of home blood pressure readings?', '10-09T10:20'),
        say('m2', omar, 'Uploaded just now. Evenings are easiest for me if there is a choice of visit times.', '10-13T20:09'),
      ],
      activity: [
        log('a1', adler, 'Referred Omar Haddad to STEADY-BP.', '10-07T13:30'),
        log('a2', dana, 'Started initial review. Requested Recent blood pressure log.', '10-09T10:15'),
        log('a3', omar, 'Uploaded Recent blood pressure log.', '10-13T20:05'),
      ],
    }),
    referral('R-1031', maria, 'FMT-2041', { submitted: '09-29T13:20', review: '10-01T09:00', screening: '10-07T09:55' }, {
      checklist: [item('c1', dana, 'HbA1c lab result (last 3 months)', '10-01T09:00', '10-03T09:00')],
      documents: [doc('d1', 'HbA1c lab result (last 3 months)', maria.name, '10-03T09:00')],
      messages: [say('m1', dana, 'Screening visit confirmed.', '10-07T10:00')],
      activity: [
        log('a1', park, 'Referred Maria Castillo to ASCEND-2.', '09-29T13:20'),
        log('a2', dana, 'Moved referral to Screening.', '10-07T09:55'),
      ],
      appointment: visit('10-30', '09:00', fourthFloor),
    }),
    referral('R-1029', sam, 'FMT-2041', { submitted: '09-18T09:10', review: '09-20T09:00', screening: '09-26T11:00', decision: '10-08T15:25' }, {
      decision: 'eligible',
      checklist: [item('c1', dana, 'Current medication list', '09-20T09:00', '09-21T09:00')],
      documents: [doc('d1', 'Current medication list', sam.name, '09-21T09:00')],
      messages: [say('m1', dana, 'Good news, Sam. You are eligible to enroll. I will call this week to review consent.', '10-08T15:30')],
      activity: [
        log('a1', park, 'Referred Sam Okafor to ASCEND-2.', '09-18T09:10'),
        log('a2', dana, 'Screening visit completed.', '09-26T11:00'),
        log('a3', dana, 'Recorded eligibility decision: eligible to enroll.', '10-08T15:25'),
      ],
    }),
    referral('R-1027', omar, 'FMT-2091', { submitted: '09-15T10:30', review: '09-17T14:00', screening: '09-22T09:45', decision: '10-06T11:10' }, {
      condition: 'Type 2 diabetes',
      decision: 'eligible',
      checklist: [item('c1', luis, 'HbA1c lab result (last 3 months)', '09-17T14:00', '09-18T12:20')],
      documents: [doc('d1', 'HbA1c lab result (last 3 months)', omar.name, '09-18T12:20')],
      messages: [say('m1', luis, 'Omar, you are eligible for GLUCO-Guide. Your monitor will be mailed once consent is complete.', '10-06T11:15')],
      activity: [
        log('a1', adler, 'Referred Omar Haddad to GLUCO-Guide.', '09-15T10:30'),
        log('a2', luis, 'Requested HbA1c lab result (last 3 months).', '09-17T14:00'),
        log('a3', omar, 'Uploaded HbA1c lab result (last 3 months).', '09-18T12:20'),
        log('a4', luis, 'Screening visit completed.', '09-29T10:00'),
        log('a5', luis, 'Recorded eligibility decision: eligible to enroll.', '10-06T11:10'),
      ],
    }),
    referral('R-1025', lena, 'FMT-2084', { submitted: '10-03T14:45', review: '10-06T11:00' }, {
      checklist: [item('c1', hannah, 'Tuberculosis screening result', '10-06T11:00', null)],
      messages: [
        say('m1', hannah, 'Hi Lena, the study needs an up-to-date tuberculosis screening result. Could you upload your latest one?', '10-06T11:05'),
        say('m2', lena, 'I think Dr. Adler has it on file. I will ask the office to send me a copy.', '10-07T08:47'),
      ],
      activity: [
        log('a1', adler, 'Referred Lena Fischer to JOINT-Reach.', '10-03T14:45'),
        log('a2', hannah, 'Requested Tuberculosis screening result.', '10-06T11:00'),
      ],
    }),
    referral('R-1022', theo, 'FMT-2063', { submitted: '09-11T14:00', review: '09-12T09:00', screening: '09-19T09:00', decision: '09-24T16:05' }, {
      decision: 'not_eligible',
      messages: [
        say('m1', venkatesan, 'Thank you for coming in, Theo. Based on the screening results this trial is not a fit right now. Dr. Adler can talk through other options.', '09-24T16:10'),
      ],
      activity: [
        log('a1', adler, 'Referred Theo Brandt to CLEARPATH.', '09-11T14:00'),
        log('a2', venkatesan, 'Recorded eligibility decision: not eligible.', '09-24T16:05'),
      ],
    }),
    referral('R-1019', jordan, 'FMT-2063', { submitted: '10-11T09:25', review: '10-13T15:30' }, {
      condition: 'Migraine',
      checklist: [item('c1', venkatesan, 'Headache diary (last 3 months)', '10-13T15:30', '10-15T21:14')],
      documents: [doc('d1', 'Headache diary (last 3 months)', jordan.name, '10-15T21:14')],
      activity: [
        log('a1', park, 'Referred Jordan Lee to CLEARPATH.', '10-11T09:25'),
        log('a2', venkatesan, 'Requested Headache diary (last 3 months).', '10-13T15:30'),
        log('a3', jordan, 'Uploaded Headache diary (last 3 months).', '10-15T21:14'),
      ],
    }),
    // Ruth has no portal account, so her physician handles her documents.
    referral('R-1016', { ...jordan, id: '', name: 'Ruth Adeyemi', detail: 'Asthma' }, 'FMT-2057', { submitted: '10-12T12:15', review: '10-14T09:50' }, {
      patientUserId: null,
      checklist: [item('c1', marcus, 'Pulmonary function test report', '10-14T09:50', null)],
      messages: [
        say('m1', park, 'Ruth does not use the portal, so I will handle her paperwork.', '10-12T12:15'),
        say('m2', marcus, 'Thanks, Dr. Park. We need her pulmonary function test report to continue the review.', '10-14T09:55'),
      ],
      activity: [
        log('a1', park, 'Referred Ruth Adeyemi to BREATHE-Forward.', '10-12T12:15'),
        log('a2', marcus, 'Requested Pulmonary function test report.', '10-14T09:50'),
      ],
    }),
  ];

  return {
    version,
    nextId: 1043,
    referrals,
    trials: Object.fromEntries(TRIALS.map((trial) => [trial.id, trial])),
    saved: {
      [alex.id]: ['FMT-2041'],
      [jordan.id]: ['FMT-2070'],
      [maria.id]: ['FMT-2091'],
      [sam.id]: ['FMT-2070'],
      [priya.id]: ['FMT-2041'],
      [theo.id]: ['FMT-2057', 'FMT-2070'],
      [grace.id]: ['FMT-2063'],
      [omar.id]: ['FMT-2041'],
      [lena.id]: ['FMT-2063'],
    },
  };
}
