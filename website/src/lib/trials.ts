// Goes through our server, so a patient's search doesn't leave their browser for a third party.
const API_URL = '/app/api/ctgov';
const PAGE_SIZE = 10;
const VISIBLE_SITES = 3;
const FIELDS = [
  'NCTId',
  'BriefTitle',
  'BriefSummary',
  'StudyType',
  'Phase',
  'MinimumAge',
  'MaximumAge',
  'LocationCity',
  'LocationState',
  'LocationCountry',
];

export interface Trial {
  id: string;
  title: string;
  summary: string;
  design: string;
  ages: string;
  sites: string[];
  moreSites: number;
  url: string;
}

export interface SearchResult {
  trials: Trial[];
  total: number | null;
  nextPageToken: string | null;
}

interface RawLocation {
  city?: string;
  state?: string;
  country?: string;
}

export interface RawStudy {
  protocolSection: {
    identificationModule: { nctId: string; briefTitle?: string };
    descriptionModule?: { briefSummary?: string };
    designModule?: { studyType?: string; phases?: string[] };
    eligibilityModule?: { minimumAge?: string; maximumAge?: string };
    contactsLocationsModule?: { locations?: RawLocation[] };
  };
}

export function buildSearchUrl(condition: string, pageToken?: string): string {
  const query = new URLSearchParams({
    'query.cond': condition.trim(),
    'filter.overallStatus': 'RECRUITING',
    pageSize: String(PAGE_SIZE),
    fields: FIELDS.join(','),
  });
  if (pageToken) query.set('pageToken', pageToken);
  else query.set('countTotal', 'true');
  return `${API_URL}/studies?${query}`;
}

/** "October 30, 2026" for the registry's "2026-10-30T09:00:04". */
export function formatDataDate(timestamp: string): string | null {
  const date = new Date(`${timestamp.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatDesign(studyType?: string, phases: string[] = []): string {
  const numbers = phases.flatMap((phase) => {
    if (phase === 'EARLY_PHASE1') return ['Early phase 1'];
    const match = /^PHASE(\d)$/.exec(phase);
    return match ? [match[1]] : [];
  });
  if (numbers[0] === 'Early phase 1') return numbers[0];
  if (numbers.length > 0) return `Phase ${numbers.join(' and ')}`;
  return studyType === 'OBSERVATIONAL' ? 'Observational study' : 'Interventional study';
}

export function formatAges(minimum?: string, maximum?: string): string {
  const lower = minimum?.toLowerCase();
  const upper = maximum?.toLowerCase();
  if (lower && upper) return `Ages ${lower} to ${upper}`;
  if (lower) return `Ages ${lower} and older`;
  if (upper) return `Ages up to ${upper}`;
  return 'No age limit listed';
}

export function uniqueSites(locations: RawLocation[]): string[] {
  const names = locations.map(({ city, state, country }) =>
    [city, state ?? country].filter(Boolean).join(', '),
  );
  return [...new Set(names.filter(Boolean))];
}

export function parseStudy(study: RawStudy): Trial {
  const section = study.protocolSection;
  const id = section.identificationModule.nctId;
  const sites = uniqueSites(section.contactsLocationsModule?.locations ?? []);
  return {
    id,
    title: section.identificationModule.briefTitle ?? id,
    summary: section.descriptionModule?.briefSummary ?? '',
    design: formatDesign(section.designModule?.studyType, section.designModule?.phases),
    ages: formatAges(section.eligibilityModule?.minimumAge, section.eligibilityModule?.maximumAge),
    sites: sites.slice(0, VISIBLE_SITES),
    moreSites: Math.max(0, sites.length - VISIBLE_SITES),
    url: `https://clinicaltrials.gov/study/${encodeURIComponent(id)}`,
  };
}

/** When ClinicalTrials.gov last processed its data, which must be shown with the results. */
export async function fetchDataDate(signal: AbortSignal): Promise<string | null> {
  const response = await fetch(`${API_URL}/version`, { signal });
  if (!response.ok) return null;
  const { dataTimestamp }: { dataTimestamp?: string } = await response.json();
  return dataTimestamp ? formatDataDate(dataTimestamp) : null;
}

export async function searchTrials(
  condition: string,
  pageToken: string | undefined,
  signal: AbortSignal,
): Promise<SearchResult> {
  const response = await fetch(buildSearchUrl(condition, pageToken), { signal });
  if (!response.ok) throw new Error(`Trial search returned ${response.status}`);
  const data: { totalCount?: number; nextPageToken?: string; studies?: RawStudy[] } =
    await response.json();
  return {
    trials: (data.studies ?? []).map(parseStudy),
    total: data.totalCount ?? null,
    nextPageToken: data.nextPageToken ?? null,
  };
}
