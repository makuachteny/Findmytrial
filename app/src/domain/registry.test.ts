import { describe, expect, it } from 'vitest';
import { bestSite, isRegistryId, milesFromBoston, toTrial } from './registry';
import { TRIALS, USERS } from './seed';
import { requestScreening, referPatient } from './referrals';
import { createSeedState } from './seed';

const boston = { facility: 'Harbor Hospital', city: 'Boston', state: 'Massachusetts', status: 'RECRUITING', geoPoint: { lat: 42.35, lon: -71.06 } };
const providence = { facility: 'Bay Clinic', city: 'Providence', state: 'Rhode Island', status: 'RECRUITING', geoPoint: { lat: 41.82, lon: -71.41 } };
const anchorage = { facility: 'North Clinic', city: 'Anchorage', state: 'Alaska', status: 'RECRUITING', geoPoint: { lat: 61.22, lon: -149.9 } };
const closedNearby = { ...boston, facility: 'Closed Clinic', status: 'COMPLETED' };

function study(overrides = {}) {
  return {
    protocolSection: {
      identificationModule: { nctId: 'NCT01234567', briefTitle: 'A study' },
      statusModule: { overallStatus: 'RECRUITING', lastUpdatePostDateStruct: { date: '2026-10-01' } },
      sponsorCollaboratorsModule: { leadSponsor: { name: 'Acme Research' } },
      conditionsModule: { conditions: ['Migraine', 'Headache'] },
      designModule: { phases: ['PHASE2', 'PHASE3'] },
      eligibilityModule: {
        minimumAge: '18 Years',
        sex: 'ALL',
        healthyVolunteers: true,
        eligibilityCriteria:
          'Inclusion Criteria:\n\n* Age 18 or older\n1. Migraine\n\nExclusion Criteria:\n\n* Pregnancy\n* Stroke',
      },
      contactsLocationsModule: {
        centralContacts: [{ name: 'Sam Lee', phone: '555-0100', email: 'sam@example.com' }],
        locations: [anchorage, boston, providence],
      },
      ...overrides,
    },
  };
}

describe('registry mapping', () => {
  it('maps a study into the trial shape', () => {
    expect(toTrial(study())).toMatchObject({
      phase: 'Phase 2 and 3',
      condition: 'Migraine',
      criteria: ['Age 18 or older', 'Migraine'],
      exclusion: ['Pregnancy', 'Stroke'],
      sponsor: 'Acme Research',
      lastUpdated: '2026-10-01',
      moreSites: 2,
      registryUrl: 'https://clinicaltrials.gov/study/NCT01234567',
    });
    expect(toTrial(study()).facts).toEqual([
      { label: 'Ages', value: '18 years and older' },
      { label: 'Sex', value: 'All' },
      { label: 'Healthy volunteers', value: 'Accepted' },
    ]);
  });

  it('reports the real study status instead of assuming recruiting', () => {
    const status = (overallStatus: string) => toTrial(study({ statusModule: { overallStatus } })).status;
    expect(status('COMPLETED')).toBe('Completed');
    expect(status('NOT_YET_RECRUITING')).toBe('Not yet recruiting');
    expect(status('WITHHELD')).toBe('Status unknown');
  });

  it('shows the nearest site rather than the first one listed', () => {
    expect(toTrial(study())).toMatchObject({ site: 'Harbor Hospital', city: 'Boston, Massachusetts', distance: 1 });
  });

  it('keeps every criterion and tolerates missing modules', () => {
    const many = Array.from({ length: 9 }, (_, i) => `* Rule ${i}`).join('\n');
    expect(toTrial(study({ eligibilityModule: { eligibilityCriteria: many } })).criteria).toHaveLength(9);
    const bare = toTrial({ protocolSection: { identificationModule: { nctId: 'NCT01234567' } } });
    expect(bare).toMatchObject({ title: 'NCT01234567', status: 'Status unknown', city: 'Location not listed', distance: null, contacts: [] });
  });

  it('dedupes contacts and skips ones with no way to reach them', () => {
    const shared = { name: 'Sam Lee', phone: '555-0100', email: 'sam@example.com' };
    const trial = toTrial(
      study({
        contactsLocationsModule: {
          centralContacts: [shared, { name: 'No details' }],
          locations: [{ ...boston, contacts: [shared, { name: 'Site desk', phone: '555-0199' }] }],
        },
      }),
    );
    expect(trial.contacts).toEqual([shared, { name: 'Site desk', phone: '555-0199', email: '' }]);
  });

  it('only accepts real NCT IDs from links', () => {
    expect(isRegistryId('NCT01234567')).toBe(true);
    expect(isRegistryId('NCT1/../../x')).toBe(false);
  });
});

describe('choosing a site', () => {
  it('measures miles from Boston', () => {
    expect(milesFromBoston(providence.geoPoint)).toBeGreaterThan(35);
    expect(milesFromBoston(providence.geoPoint)).toBeLessThan(45);
  });

  it('prefers an open site over a closer closed one', () => {
    expect(bestSite([closedNearby, providence])?.facility).toBe('Bay Clinic');
  });

  it('keeps to the chosen state and distance', () => {
    expect(bestSite([boston, providence], { region: 'RI', distance: 'any' })?.facility).toBe('Bay Clinic');
    expect(bestSite([anchorage, closedNearby], { region: 'all', distance: '25' })?.facility).toBe('Closed Clinic');
  });

  it('copes with sites that have no coordinates', () => {
    expect(bestSite([{ city: 'Unknown' }, boston])?.facility).toBe('Harbor Hospital');
  });
});

describe('real studies and the shared record', () => {
  const live = { ...TRIALS[0], id: 'NCT01234567', registryUrl: 'https://clinicaltrials.gov/study/NCT01234567' };
  const state = createSeedState(1);
  const contact = { dob: '', phone: '', email: '' };
  const preScreening = { diagnosed: 'Yes', medicine: 'Yes', travel: 'Yes' } as const;

  it('refuses a screening request, because nothing can reach the real study team', () => {
    const input = { trial: live, condition: 'x', contact, preScreening, history: null, attachments: [] };
    expect(() => requestScreening(state, USERS.patient, input, new Date().toISOString())).toThrow(/Contact the study team/);
  });

  it('refuses a physician referral for the same reason', () => {
    const input = { patient: 'Jo Doe', condition: 'x', trial: live, note: '', attachments: [] };
    expect(() => referPatient(state, USERS.physician, input, new Date().toISOString())).toThrow(/Contact the study team/);
  });
});
