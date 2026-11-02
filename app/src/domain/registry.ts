import type { StudyContact, Trial, TrialStatus } from './types';

// The server forwards these requests, so patient searches don't leave the browser for a third party.
const API_URL = `${import.meta.env.BASE_URL}api/ctgov`;
const PAGE_SIZE = 12;
const BOSTON = { lat: 42.3601, lon: -71.0589 };
const FIELDS = [
  'NCTId',
  'BriefTitle',
  'BriefSummary',
  'Condition',
  'Phase',
  'OverallStatus',
  'LastUpdatePostDate',
  'LeadSponsorName',
  'EligibilityCriteria',
  'MinimumAge',
  'MaximumAge',
  'Sex',
  'HealthyVolunteers',
  'CentralContactName',
  'CentralContactPhone',
  'CentralContactEMail',
  'LocationFacility',
  'LocationCity',
  'LocationState',
  'LocationCountry',
  'LocationStatus',
  'LocationGeoPoint',
  'LocationContactName',
  'LocationContactPhone',
  'LocationContactEMail',
].join(',');

const STATUS_LABEL: Record<string, TrialStatus> = {
  RECRUITING: 'Recruiting',
  NOT_YET_RECRUITING: 'Not yet recruiting',
  ACTIVE_NOT_RECRUITING: 'Active, not recruiting',
  ENROLLING_BY_INVITATION: 'Enrolling by invitation',
  COMPLETED: 'Completed',
  SUSPENDED: 'Suspended',
  TERMINATED: 'Terminated',
  WITHDRAWN: 'Withdrawn',
};

const STATES: Record<string, string> = { MA: 'Massachusetts', RI: 'Rhode Island', CT: 'Connecticut' };

interface RawContact {
  name?: string;
  phone?: string;
  email?: string;
}

interface RawLocation {
  facility?: string;
  city?: string;
  state?: string;
  country?: string;
  status?: string;
  geoPoint?: { lat: number; lon: number };
  contacts?: RawContact[];
}

export interface RawStudy {
  protocolSection: {
    identificationModule: { nctId: string; briefTitle?: string };
    statusModule?: { overallStatus?: string; lastUpdatePostDateStruct?: { date?: string } };
    sponsorCollaboratorsModule?: { leadSponsor?: { name?: string } };
    descriptionModule?: { briefSummary?: string };
    conditionsModule?: { conditions?: string[] };
    designModule?: { phases?: string[] };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      minimumAge?: string;
      maximumAge?: string;
      sex?: string;
      healthyVolunteers?: boolean;
    };
    contactsLocationsModule?: { centralContacts?: RawContact[]; locations?: RawLocation[] };
  };
}

export interface SiteFilters {
  region: string;
  distance: string;
}

export interface RegistryPage {
  trials: Trial[];
  total: number | null;
  nextPageToken: string | null;
}

const NO_SITE_FILTERS: SiteFilters = { region: 'all', distance: 'any' };

export function isRegistryId(id: string): boolean {
  return /^NCT\d{8}$/.test(id);
}

function formatPhase(phases: string[] = []): string {
  if (phases.includes('EARLY_PHASE1')) return 'Early phase 1';
  const numbers = phases.flatMap((phase) => /^PHASE(\d)$/.exec(phase)?.[1] ?? []);
  return numbers.length > 0 ? `Phase ${numbers.join(' and ')}` : 'Phase not listed';
}

function formatAges(minimum?: string, maximum?: string): string {
  const lower = minimum?.toLowerCase();
  const upper = maximum?.toLowerCase();
  if (lower && upper) return `${lower} to ${upper}`;
  if (lower) return `${lower} and older`;
  if (upper) return `Up to ${upper}`;
  return 'No age limit listed';
}

function formatSex(sex?: string): string {
  if (sex === 'FEMALE') return 'Female';
  if (sex === 'MALE') return 'Male';
  return 'All';
}

export function milesFromBoston(point: { lat: number; lon: number }): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(point.lat - BOSTON.lat);
  const dLon = radians(point.lon - BOSTON.lon);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(radians(BOSTON.lat)) * Math.cos(radians(point.lat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(3958.8 * 2 * Math.asin(Math.sqrt(a)));
}

const siteMiles = (site: RawLocation) => (site.geoPoint ? milesFromBoston(site.geoPoint) : null);

/** The site to show a patient: inside their filters first, then open to patients, then nearest. */
export function bestSite(sites: RawLocation[], filters: SiteFilters = NO_SITE_FILTERS): RawLocation | undefined {
  const state = STATES[filters.region];
  const rank = (site: RawLocation) => {
    const miles = siteMiles(site);
    return [
      state && site.state !== state ? 1 : 0,
      filters.distance !== 'any' && (miles === null || miles > Number(filters.distance)) ? 1 : 0,
      site.status && site.status !== 'RECRUITING' ? 1 : 0,
      miles ?? Infinity,
    ];
  };
  const compare = (a: number[], b: number[]) => a.map((value, i) => value - b[i]).find((difference) => difference !== 0) ?? 0;
  return sites.map((site) => ({ site, order: rank(site) })).sort((a, b) => compare(a.order, b.order))[0]?.site;
}

function criteriaLines(section: string): string[] {
  return section
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[*•-]|\d+[.)])\s*/, '').trim())
    .filter((line) => line && !/^(inclusion|exclusion) criteria:?$/i.test(line));
}

function collectContacts(lists: (RawContact[] | undefined)[]): StudyContact[] {
  const seen = new Set<string>();
  const contacts: StudyContact[] = [];
  for (const contact of lists.flatMap((list) => list ?? [])) {
    const key = `${contact.phone ?? ''}|${contact.email ?? ''}`;
    if (key === '|' || seen.has(key)) continue;
    seen.add(key);
    contacts.push({ name: contact.name ?? 'Study team', phone: contact.phone ?? '', email: contact.email ?? '' });
  }
  return contacts.slice(0, 3);
}

export function toTrial(study: RawStudy, filters: SiteFilters = NO_SITE_FILTERS): Trial {
  const section = study.protocolSection;
  const id = section.identificationModule.nctId;
  const title = section.identificationModule.briefTitle ?? id;
  const eligibility = section.eligibilityModule;
  const conditions = section.conditionsModule?.conditions ?? [];
  const contactsModule = section.contactsLocationsModule;
  const sites = contactsModule?.locations ?? [];
  const site = bestSite(sites, filters);
  const place = site ? [site.city, site.state ?? site.country].filter(Boolean).join(', ') : 'Location not listed';
  const summary = section.descriptionModule?.briefSummary ?? '';
  const [inclusion, exclusion = ''] = (eligibility?.eligibilityCriteria ?? '').split(/exclusion criteria:?/i);
  const ages = formatAges(eligibility?.minimumAge, eligibility?.maximumAge);
  const sponsor = section.sponsorCollaboratorsModule?.leadSponsor?.name;
  return {
    id,
    title,
    shortTitle: title,
    condition: conditions[0] ?? 'Condition not listed',
    tags: conditions,
    phase: formatPhase(section.designModule?.phases),
    status: STATUS_LABEL[section.statusModule?.overallStatus ?? ''] ?? 'Status unknown',
    site: site?.facility ?? 'Study site not listed',
    city: place,
    state: '',
    distance: site ? siteMiles(site) : null,
    address: place,
    coordinator: 'Study team',
    phone: '',
    summary,
    overview: summary,
    criteria: criteriaLines(inclusion),
    exclusion: criteriaLines(exclusion),
    duration: '',
    visits: '',
    screening: '',
    expect: 'The study team can explain the visits, time commitment and any costs.',
    registryUrl: `https://clinicaltrials.gov/study/${id}`,
    contacts: collectContacts([contactsModule?.centralContacts, site?.contacts]),
    moreSites: Math.max(0, sites.length - 1),
    sponsor,
    lastUpdated: section.statusModule?.lastUpdatePostDateStruct?.date,
    facts: [
      { label: 'Ages', value: ages },
      { label: 'Sex', value: formatSex(eligibility?.sex) },
      { label: 'Healthy volunteers', value: eligibility?.healthyVolunteers ? 'Accepted' : 'Not accepted' },
    ],
  };
}

export async function searchRegistry(
  filters: SiteFilters & { query: string; recruitingOnly: boolean; phase: string; age: string; pageToken?: string },
  signal: AbortSignal,
): Promise<RegistryPage> {
  const params = new URLSearchParams({
    'query.cond': filters.query.trim(),
    'filter.overallStatus': filters.recruitingOnly ? 'RECRUITING' : 'RECRUITING,NOT_YET_RECRUITING',
    pageSize: String(PAGE_SIZE),
    sort: '@relevance',
    fields: FIELDS,
  });
  if (STATES[filters.region]) params.set('query.locn', STATES[filters.region]);
  if (filters.distance !== 'any') {
    params.set('filter.geo', `distance(${BOSTON.lat},${BOSTON.lon},${filters.distance}mi)`);
  }
  const phase = /\d/.exec(filters.phase)?.[0];
  const advanced = [phase && `AREA[Phase]PHASE${phase}`, filters.age && `AREA[StdAge]${filters.age}`].filter(Boolean);
  if (advanced.length > 0) params.set('filter.advanced', advanced.join(' AND '));
  if (filters.pageToken) params.set('pageToken', filters.pageToken);
  else params.set('countTotal', 'true');

  const response = await fetch(`${API_URL}/studies?${params}`, { signal });
  if (!response.ok) throw new Error(`Trial search returned ${response.status}`);
  const body = (await response.json()) as { studies: RawStudy[]; totalCount?: number; nextPageToken?: string };
  return {
    trials: body.studies.map((study) => toTrial(study, filters)),
    total: body.totalCount ?? null,
    nextPageToken: body.nextPageToken ?? null,
  };
}

/** Resolves to null when the registry has no study with this ID. */
export async function fetchStudy(id: string, signal: AbortSignal): Promise<Trial | null> {
  const response = await fetch(`${API_URL}/studies/${id}?fields=${FIELDS}`, { signal });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Trial lookup returned ${response.status}`);
  return toTrial((await response.json()) as RawStudy);
}

let dataDate: Promise<string | null> | null = null;

/** The date ClinicalTrials.gov last processed its data, which its terms require us to show. */
export function fetchDataDate(): Promise<string | null> {
  dataDate ??= fetch(`${API_URL}/version`)
    .then((response) => (response.ok ? response.json() : null))
    .then((body: { dataTimestamp?: string } | null) => body?.dataTimestamp ?? null)
    .catch(() => null);
  return dataDate;
}
