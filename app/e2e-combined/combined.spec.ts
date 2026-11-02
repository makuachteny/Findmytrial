import { expect, test } from '@playwright/test';

test.beforeEach(({ page }) => {
  page.on('pageerror', (error) => { throw error; });
});

test('website Sign in reaches each portal', async ({ page }) => {
  await page.goto('/');
  const links = await page.locator('a[href^="/app/signin"]').evaluateAll((all) => all.map((a) => a.getAttribute('href')));
  expect(links.length).toBeGreaterThan(0);
  for (const [role, heading] of [['patient', /Hello, Alex Morgan/], ['physician', /Dr\. Park/], ['coordinator', /Dana/]] as const) {
    await page.goto(`/app/signin?role=${role}`);
    await page.getByRole('button', { name: /^Continue as/ }).click();
    await expect(page).toHaveURL(new RegExp(`/app/${role}$`));
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await page.getByRole('link', { name: 'Sign out' }).click();
    await expect(new URL(page.url()).pathname).toBe("/");
  }
});

test('live registry: search, deep link, save survives reload', async ({ page }) => {
  await page.goto('/app/signin?role=patient');
  await page.getByRole('button', { name: /^Continue as/ }).click();
  await page.getByRole('link', { name: 'Find trials' }).click();
  await page.getByLabel('Condition').fill('asthma');
  await expect(page.getByRole('heading', { name: 'Real studies from ClinicalTrials.gov' })).toBeVisible();
  const link = page.locator('.trial-card a[href*="NCT"]').first();
  await expect(link).toBeVisible({ timeout: 20000 });
  const href = await link.getAttribute('href');
  const id = /NCT\d{8}/.exec(href ?? '')?.[0] as string;
  await page.goto(`/app/signin?role=patient&trial=${id}`);
  await expect(page).toHaveURL(new RegExp(`/patient/trials/${id}`));
  await expect(page.getByText("Find My Trial can't send requests to its study team yet")).toBeVisible({ timeout: 20000 });
  await expect(page.getByText(id)).toBeVisible();
  await page.getByRole('button', { name: 'Save trial' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Saved to your list' })).toBeVisible();
});

test('deep portal URL loads after a hard refresh', async ({ page }) => {
  await page.goto('/app/signin?role=physician');
  await page.getByRole('button', { name: /^Continue as/ }).click();
  await page.goto('/app/physician/referrals/R-1038?tab=messages');
  await expect(page.getByText('Referral conversation')).toBeVisible();
});

test('the website recognizes a signed-in visitor and sends them back to their portal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('link', { name: /^Physicians/ }).click();
  await page.getByLabel('Sample account', { exact: true }).selectOption('user-adler');
  await page.getByRole('button', { name: 'Continue as Dr. Naomi Adler' }).click();
  await expect(page.getByRole('heading', { name: /Dr\. Adler$/ })).toBeVisible();

  await page.getByRole('link', { name: /^FindMyTrial/ }).click();
  await expect(new URL(page.url()).pathname).toBe("/");
  await page.getByRole('button', { name: 'My portal' }).click();
  await expect(page).toHaveURL(/\/app\/physician$/);
  await expect(page.getByRole('heading', { name: /Dr\. Adler$/ })).toBeVisible();

  await page.getByRole('link', { name: 'Sign out' }).click();
  await expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
});

test('a website trial result skips sign-in when the patient is already signed in', async ({ page }) => {
  await page.goto('/app/signin?role=patient');
  await page.getByLabel('Sample account', { exact: true }).selectOption('user-grace');
  await page.getByRole('button', { name: 'Continue as Grace Liu' }).click();
  await expect(page.getByRole('heading', { name: 'Hello, Grace Liu' })).toBeVisible();

  await page.goto('/');
  await page.getByRole('button', { name: 'Search trials' }).first().click();
  await page.getByLabel('Search by condition').fill('asthma');
  await page.keyboard.press('Enter');
  await page.locator('.trial .button--solid').first().click();
  await expect(page).toHaveURL(/\/app\/patient\/trials\/NCT\d{8}/);
  await expect(page.getByText("Find My Trial can't send requests to its study team yet")).toBeVisible({ timeout: 20000 });
});

test('a phone can switch accounts from the portal', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('/app/signin?role=patient');
  await page.getByLabel('Sample account', { exact: true }).selectOption('user-lena');
  await page.getByRole('button', { name: 'Continue as Lena Fischer' }).click();
  await expect(page.getByRole('heading', { name: 'Hello, Lena Fischer' })).toBeVisible();
  await page.getByRole('link', { name: 'Sign out' }).click();
  await expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.getByLabel('Menu')).toBeVisible();
  await context.close();
});

test('both sites serve the brand icons', async ({ request }) => {
  for (const path of ['/icons/favicon-32.png', '/icons/favicon-16.png', '/site.webmanifest', '/app/icons/favicon-32.png', '/app/icons/apple-touch-icon.png', '/app/site.webmanifest']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toMatch(/image\/png|manifest\+json/);
  }
});

test('real studies show their true status, nearest site and contacts', async ({ page }) => {
  await page.goto('/app/signin?role=patient');
  await page.getByRole('button', { name: /^Continue as/ }).click();
  await expect(page).toHaveURL(/\/app\/patient$/);

  await page.goto('/app/patient/trials/NCT03968900');
  await expect(page.locator('.trial-head').getByText('Completed')).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('This study is listed as completed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request screening' })).toHaveCount(0);
  await expect(page.getByText(/Source: ClinicalTrials\.gov, data processed/)).toBeVisible();

  await page.goto('/app/patient/trials?q=asthma&distance=25');
  const cards = page.locator('.trial-card', { hasText: 'more site' });
  await expect(cards.first()).toBeVisible({ timeout: 20000 });
  for (const card of await cards.all()) await expect(card.locator('.meta-line')).toContainText(/Massachusetts/);
});
