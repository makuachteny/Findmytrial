import { PLACEHOLDER_LINK, signInAs, type RoleKey } from '../lib/links';

export const NAV_LINKS = [
  { href: '#what', label: 'What it is' },
  { href: '#roles', label: "Who it's for" },
  { href: '#stages', label: 'How it works' },
];

export const STAGES = [
  {
    title: 'Submitted',
    body: "A patient requests screening from a trial page, or a physician refers them directly. The referral appears immediately in the research site's queue and on the patient's dashboard with a reference number.",
    owner: 'Research coordinator picks it up for initial review.',
  },
  {
    title: 'Initial review',
    body: "The coordinator checks the referral against the trial's basic criteria and may request documents such as a recent lab result or medication list. Requested items appear as the patient's next step until they are uploaded.",
    owner: 'Coordinator reviews; patient uploads anything requested.',
  },
  {
    title: 'Screening',
    body: 'A screening visit is scheduled. The status reads "Screening · pending" everywhere, and the workspace explains that eligibility has not been decided yet.',
    owner: 'Patient attends the visit; coordinator runs it.',
  },
  {
    title: 'Eligibility decision',
    body: 'After the visit the research team records a final decision behind a confirmation step. The badge, tracker and next action change for all three roles at once, and the decision replaces the pending status.',
    owner: 'Coordinator records; physician and patient are notified in the shared record.',
  },
];

export const SEARCH_SUGGESTIONS = [
  'Type 2 diabetes',
  'Asthma',
  'Migraine',
  'Hypertension',
  'Rheumatoid arthritis',
];

export const PORTALS: { role: RoleKey; title: string; body: string }[] = [
  {
    role: 'patient',
    title: 'Patients',
    body: 'Find trials near you, request screening and follow your referral.',
  },
  {
    role: 'physician',
    title: 'Physicians',
    body: 'Refer patients and see where every referral stands.',
  },
  {
    role: 'coordinator',
    title: 'Research sites',
    body: 'Review the referral queue, request documents and record decisions.',
  },
];

export const REASONS = [
  'See the same four-stage progress: Submitted, Initial review, Screening, Eligibility decision',
  'Know who holds the next action, and whether it is theirs',
  'Request and upload documents against a visible checklist',
  'Message in one thread instead of three separate inboxes',
  'Tell pending screening apart from a final eligibility decision',
];

export const WAITING_POINTS = [
  'A referral can pass through weeks of review, document requests and scheduling before a screening visit',
  "Each of those steps usually lives in a different inbox: the patient's, the physician's and the site's",
  'Find My Trial puts them in one record, with one history, one checklist and one conversation',
];

export const FOOTER_COLUMNS = [
  {
    title: 'For patients and physicians',
    links: [
      {
        href: signInAs('patient'),
        label: 'Patient portal',
        body: 'Search trials by condition, location and distance, and track your referrals.',
      },
      {
        href: signInAs('patient'),
        label: 'Shared referral workspace',
        body: 'Progress, next action, documents and messages in one place.',
      },
      {
        href: signInAs('physician'),
        label: 'Physician portal',
        body: "Refer a patient in a minute and follow every referral's status.",
      },
    ],
  },
  {
    title: 'For research sites',
    links: [
      {
        href: signInAs('coordinator'),
        label: 'Research site platform',
        body: 'Triage new referrals, request documents and advance screening.',
      },
      {
        href: '#stages',
        label: 'Eligibility decisions',
        body: 'Record a final decision with a confirmation step.',
      },
    ],
  },
  {
    title: 'About Find My Trial',
    links: [
      {
        href: '#what',
        label: 'Our approach',
        body: 'One shared record for every referral, from first request to eligibility decision.',
      },
      {
        href: PLACEHOLDER_LINK,
        label: 'Contact',
        body: 'Questions about trials, referrals or your account.',
      },
    ],
  },
];

export const LEGAL_LINKS = ['Privacy', 'Terms of use', 'Accessibility'];
