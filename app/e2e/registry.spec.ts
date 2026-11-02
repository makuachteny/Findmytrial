import { expect, test, type Page, type Route } from '@playwright/test';

const site = (facility: string, city: string, state: string, lat: number, lon: number, status = 'RECRUITING') => ({
  facility,
  city,
  state,
  status,
  geoPoint: { lat, lon },
});

function study(id: string, title: string, overallStatus = 'RECRUITING') {
  return {
    protocolSection: {
      identificationModule: { nctId: id, briefTitle: title },
      statusModule: { overallStatus, lastUpdatePostDateStruct: { date: '2026-10-20' } },
      sponsorCollaboratorsModule: { leadSponsor: { name: 'Acme Research' } },
      descriptionModule: { briefSummary: 'A summary of the study.' },
      conditionsModule: { conditions: ['Asthma'] },
      designModule: { phases: ['PHASE2'] },
      eligibilityModule: {
        eligibilityCriteria: 'Inclusion Criteria:\n* Adults\n\nExclusion Criteria:\n* Smokers',
        minimumAge: '18 Years',
        sex: 'ALL',
      },
      contactsLocationsModule: {
        centralContacts: [{ name: 'Robin Vale', phone: '555-0100', email: 'robin@example.com' }],
        locations: [site('Far Clinic', 'Anchorage', 'Alaska', 61.2, -149.9), site('Near Hospital', 'Boston', 'Massachusetts', 42.3601, -71.0589)],
      },
    },
  };
}

async function mockRegistry(page: Page) {
  const urls: URL[] = [];
  await page.route('**/app/api/ctgov/**', (route: Route) => {
    const url = new URL(route.request().url());
    urls.push(url);
    if (url.pathname.endsWith('/version')) return route.fulfill({ json: { dataTimestamp: '2026-10-30T09:00:04' } });
    if (url.pathname.endsWith('NCT00000002')) return route.fulfill({ json: study('NCT00000002', 'A finished study', 'COMPLETED') });
    if (url.pathname.endsWith('NCT00000001')) return route.fulfill({ json: study('NCT00000001', 'First live study') });
    if (url.searchParams.get('pageToken')) {
      return route.fulfill({ json: { studies: [study('NCT00000003', 'Second page study')] } });
    }
    return route.fulfill({ json: { studies: [study('NCT00000001', 'First live study')], totalCount: 2345, nextPageToken: 'next' } });
  });
  return urls;
}

async function signIn(page: Page, role = 'patient') {
  await page.goto(`/app/signin?role=${role}`);
  await page.getByRole('button', { name: /^Continue as/ }).click();
  await expect(page).toHaveURL(new RegExp(`/app/${role}$`));
}

test('search shows the nearest site, totals, the source and more results', async ({ page }) => {
  const urls = await mockRegistry(page);
  await signIn(page);
  await page.goto('/app/patient/trials');
  await page.getByLabel('Condition').fill('asthma');

  const card = page.locator('.trial-card', { hasText: 'First live study' });
  await expect(card).toContainText('Near Hospital');
  await expect(card).toContainText('1 more site');
  await expect(card).toContainText('Less than 1 mi');
  await expect(card).not.toContainText('0 mi');
  await expect(card).not.toContainText('Far Clinic');
  await expect(page.getByText('2,346 trials')).toBeVisible();
  await expect(page.getByText(/Source: ClinicalTrials\.gov, data processed Oct 30, 2026/)).toBeVisible();

  const search = urls.find((url) => url.pathname.endsWith('/studies'));
  expect(search?.pathname).toBe('/app/api/ctgov/studies');
  expect(search?.searchParams.get('sort')).toBe('@relevance');
  expect(search?.searchParams.get('filter.overallStatus')).toBe('RECRUITING,NOT_YET_RECRUITING');

  await page.getByRole('button', { name: 'Load more studies' }).click();
  await expect(page.getByText('Second page study')).toBeVisible();
  await expect(page.getByText('First live study')).toBeVisible();
});

test('phase, age, recruiting and distance filters reach the search', async ({ page }) => {
  const urls = await mockRegistry(page);
  await signIn(page);
  await page.goto('/app/patient/trials');
  await page.getByLabel('Condition').fill('asthma');
  await page.getByLabel('Phase').selectOption('Phase 2');
  await page.getByLabel('Age group').selectOption('OLDER_ADULT');
  await page.getByLabel('Distance from Boston').selectOption('25');
  await page.getByLabel('Recruiting only').check();

  await expect.poll(() => urls.at(-1)?.searchParams.get('filter.advanced')).toBe('AREA[Phase]PHASE2 AND AREA[StdAge]OLDER_ADULT');
  const last = urls.filter((url) => url.pathname.endsWith('/studies')).at(-1);
  expect(last?.searchParams.get('filter.overallStatus')).toBe('RECRUITING');
  expect(last?.searchParams.get('filter.geo')).toBe('distance(42.3601,-71.0589,25mi)');
});

test('a real study offers its contacts and no referral', async ({ page }) => {
  await mockRegistry(page);
  await signIn(page);
  await page.goto('/app/patient/trials/NCT00000001');
  await expect(page.getByRole('heading', { name: 'First live study' })).toBeVisible();
  await expect(page.getByRole('link', { name: '555-0100' })).toHaveAttribute('href', 'tel:555-0100');
  await expect(page.getByRole('link', { name: 'robin@example.com' })).toHaveAttribute('href', 'mailto:robin@example.com');
  await expect(page.getByRole('link', { name: 'View on ClinicalTrials.gov' })).toHaveAttribute('href', 'https://clinicaltrials.gov/study/NCT00000001');
  await expect(page.getByRole('button', { name: 'Request screening' })).toHaveCount(0);
  await expect(page.getByText('Smokers')).toBeVisible();
  await expect(page.getByText(/Record last updated Oct 20, 2026/)).toBeVisible();
  await expect(page.getByText('Discuss the risks and benefits')).toBeVisible();
});

test('a physician cannot refer into a real study', async ({ page }) => {
  await mockRegistry(page);
  await signIn(page, 'physician');
  await page.goto('/app/physician/trials/NCT00000001');
  await expect(page.getByRole('link', { name: 'robin@example.com' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Refer a patient' })).toHaveCount(0);
});

test('a finished study shows its real status', async ({ page }) => {
  await mockRegistry(page);
  await signIn(page);
  await page.goto('/app/patient/trials/NCT00000002');
  await expect(page.locator('.trial-head').getByText('Completed')).toBeVisible();
  await expect(page.getByText('This study is listed as completed')).toBeVisible();
});

test('a saved study refreshes, and warns when the registry is down', async ({ page }) => {
  await mockRegistry(page);
  await signIn(page);
  await page.goto('/app/patient/trials/NCT00000001');
  await page.getByRole('button', { name: 'Save trial' }).click();
  await expect(page.getByRole('button', { name: 'Saved to your list' })).toBeVisible();

  await page.unroute('**/app/api/ctgov/**');
  await page.route('**/app/api/ctgov/**', (route) => route.fulfill({ status: 502, body: '{}' }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'First live study' })).toBeVisible();
  await expect(page.getByText('this saved copy may be out of date')).toBeVisible();
});

test('a failed search keeps the sample trials and says what happened', async ({ page }) => {
  await page.route('**/app/api/ctgov/**', (route) => route.fulfill({ status: 503, body: '{}' }));
  await signIn(page);
  await page.goto('/app/patient/trials');
  await page.getByLabel('Condition').fill('asthma');
  await expect(page.getByText('ClinicalTrials.gov could not be reached. Try again in a moment.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sample trials' })).toBeVisible();
});
