import { describe, expect, it } from 'vitest';
import {
  buildSearchUrl,
  formatAges,
  formatDataDate,
  formatDesign,
  parseStudy,
  uniqueSites,
} from './trials';

const params = (url: string) => new URL(url, 'http://localhost').searchParams;

describe('buildSearchUrl', () => {
  it('only asks for recruiting studies and counts the first page', () => {
    const query = params(buildSearchUrl(' asthma '));
    expect(query.get('query.cond')).toBe('asthma');
    expect(query.get('filter.overallStatus')).toBe('RECRUITING');
    expect(query.get('countTotal')).toBe('true');
  });

  it('uses the page token instead of recounting on later pages', () => {
    const query = params(buildSearchUrl('lupus', 'abc'));
    expect(query.get('pageToken')).toBe('abc');
    expect(query.has('countTotal')).toBe(false);
  });
});

describe('buildSearchUrl routing', () => {
  it('searches through our server, not directly from the browser', () => {
    expect(buildSearchUrl('asthma')).toMatch(/^\/app\/api\/ctgov\/studies\?/);
  });
});

describe('formatDataDate', () => {
  it('shows the day the registry processed its data', () => {
    expect(formatDataDate('2026-10-30T09:00:04')).toBe('October 30, 2026');
  });

  it('leaves out a date it cannot read', () => {
    expect(formatDataDate('soon')).toBeNull();
  });
});

describe('formatDesign', () => {
  it.each([
    ['INTERVENTIONAL', ['PHASE3'], 'Phase 3'],
    ['INTERVENTIONAL', ['PHASE1', 'PHASE2'], 'Phase 1 and 2'],
    ['INTERVENTIONAL', ['EARLY_PHASE1'], 'Early phase 1'],
    ['INTERVENTIONAL', ['NA'], 'Interventional study'],
    ['OBSERVATIONAL', undefined, 'Observational study'],
  ])('%s %j is %s', (type, phases, expected) => {
    expect(formatDesign(type, phases)).toBe(expected);
  });
});

describe('formatAges', () => {
  it.each([
    ['12 Years', '17 Years', 'Ages 12 years to 17 years'],
    ['18 Years', undefined, 'Ages 18 years and older'],
    [undefined, '65 Years', 'Ages up to 65 years'],
    [undefined, undefined, 'No age limit listed'],
  ])('%s to %s', (minimum, maximum, expected) => {
    expect(formatAges(minimum, maximum)).toBe(expected);
  });
});

describe('uniqueSites', () => {
  it('removes duplicates, skips blanks, and falls back to the country', () => {
    expect(
      uniqueSites([
        { city: 'Boston', state: 'Massachusetts', country: 'United States' },
        { city: 'Boston', state: 'Massachusetts', country: 'United States' },
        { city: 'Moscow', country: 'Russia' },
        {},
      ]),
    ).toEqual(['Boston, Massachusetts', 'Moscow, Russia']);
  });
});

describe('parseStudy', () => {
  it('fills in sparse studies without throwing', () => {
    const trial = parseStudy({
      protocolSection: { identificationModule: { nctId: 'NCT01234567' } },
    });
    expect(trial).toMatchObject({
      title: 'NCT01234567',
      sites: [],
      moreSites: 0,
      url: 'https://clinicaltrials.gov/study/NCT01234567',
    });
  });

  it('counts the sites beyond the visible three', () => {
    const locations = ['Ames', 'Bath', 'Cork', 'Dover', 'Essen'].map((city) => ({ city }));
    const trial = parseStudy({
      protocolSection: {
        identificationModule: { nctId: 'NCT1' },
        contactsLocationsModule: { locations },
      },
    });
    expect(trial.sites).toHaveLength(3);
    expect(trial.moreSites).toBe(2);
  });
});
