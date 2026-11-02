export type Role = 'patient' | 'physician' | 'coordinator';
export type Stage = 'submitted' | 'review' | 'screening' | 'decision';
export type Outcome = 'eligible' | 'not_eligible';
export type TrialStatus =
  | 'Recruiting'
  | 'Not yet recruiting'
  | 'Active, not recruiting'
  | 'Enrolling by invitation'
  | 'Completed'
  | 'Suspended'
  | 'Terminated'
  | 'Withdrawn'
  | 'Status unknown';
export type Answer = 'Yes' | 'No' | 'Not sure';

export interface User {
  id: string;
  role: Role;
  name: string;
  roleLabel: string;
  /** Practice for a physician, research site for a coordinator, condition for a patient. */
  detail: string;
  /** Patients only: the physician on every referral they start themselves. */
  physicianId?: string;
  /** Patients only: fills in the screening request. */
  contact?: Contact;
}

export interface Trial {
  id: string;
  title: string;
  shortTitle: string;
  condition: string;
  tags: string[];
  phase: string;
  status: TrialStatus;
  site: string;
  city: string;
  state: string;
  /** Miles from Boston. Null for registry studies. */
  distance: number | null;
  address: string;
  coordinator: string;
  phone: string;
  summary: string;
  overview: string;
  criteria: string[];
  duration: string;
  visits: string;
  screening: string;
  expect: string;
  /** Set for studies from ClinicalTrials.gov; null for the sample trials. */
  registryUrl: string | null;
  /** Everything below is only on studies from ClinicalTrials.gov. */
  exclusion?: string[];
  contacts?: StudyContact[];
  moreSites?: number;
  sponsor?: string;
  lastUpdated?: string;
  facts?: { label: string; value: string }[];
}

export interface StudyContact {
  name: string;
  phone: string;
  email: string;
}

export interface Contact {
  dob: string;
  phone: string;
  email: string;
}

export interface PreScreening {
  diagnosed: Answer;
  medicine: Answer;
  travel: Answer;
}

export interface History {
  conditions: string;
  medications: string;
  notes: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  requestedBy: string;
  requestedAt: string;
  doneAt: string | null;
}

export interface ReferralDocument {
  id: string;
  name: string;
  by: string;
  at: string;
  fileName: string | null;
}

export interface Message {
  id: string;
  from: string;
  role: Role;
  text: string;
  at: string;
}

export interface ActivityEntry {
  id: string;
  who: string;
  role: Role;
  text: string;
  at: string;
}

export interface Visit {
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM, 24-hour */
  time: string;
  place: string;
}

export interface Referral {
  id: string;
  patient: string;
  condition: string;
  /** Null when the patient has no portal account. */
  patientUserId: string | null;
  physicianId: string;
  coordinatorId: string;
  trialId: string;
  status: Stage;
  decision: Outcome | null;
  submittedAt: string;
  stageDates: Partial<Record<Stage, string>>;
  checklist: ChecklistItem[];
  documents: ReferralDocument[];
  messages: Message[];
  /** Oldest first. */
  activity: ActivityEntry[];
  appointment: Visit | null;
  contact: Contact | null;
  preScreening: PreScreening | null;
  history: History | null;
}

export interface AppState {
  version: number;
  nextId: number;
  referrals: Referral[];
  /** Every trial that is saved or referred to, so records survive registry changes. */
  trials: Record<string, Trial>;
  saved: Record<string, string[]>;
}

export type NextActionKind = 'upload' | 'review' | 'schedule' | 'attend' | 'enroll' | 'discuss';

export interface NextAction {
  text: string;
  owner: Role;
  kind: NextActionKind;
}
