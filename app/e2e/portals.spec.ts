import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function signIn(page: Page, role: string, query = '', account?: string) {
  await page.goto(`/app/signin?role=${role}${query}`);
  if (account) await page.getByLabel('Sample account', { exact: true }).selectOption(account);
  await page.getByRole('button', { name: /^Continue as/ }).click();
}

// Tabs in one context share the record but each keeps its own sign-in.
async function portals(browser: Browser): Promise<{ context: BrowserContext; patient: Page; physician: Page }> {
  const context = await browser.newContext();
  const patient = await context.newPage();
  const physician = await context.newPage();
  await signIn(patient, 'patient');
  await signIn(physician, 'physician');
  return { context, patient, physician };
}

test('patient dashboard shows the design content', async ({ page }) => {
  await signIn(page, 'patient');
  await expect(page.getByRole('heading', { name: 'Hello, Alex Morgan' })).toBeVisible();
  await expect(page.getByText('Your next step', { exact: true })).toBeVisible();
  await expect(page.getByText(/^Attend screening visit on/).first()).toBeVisible();
  await expect(page.getByText('Upcoming screening appointment')).toBeVisible();
  await expect(page.getByText('Screening · pending').first()).toBeVisible();
  await page.getByRole('link', { name: 'My referrals' }).click();
  await expect(page.getByRole('heading', { name: 'My referrals' })).toBeVisible();
  await page.getByRole('link', { name: 'Messages' }).click();
  await expect(page.getByText('One conversation per referral')).toBeVisible();
});

test('find trials filters and saves', async ({ page }) => {
  await signIn(page, 'patient');
  await page.getByRole('link', { name: 'Find trials' }).click();
  await expect(page.getByText('6 trials')).toBeVisible();
  await page.getByLabel('Location').selectOption('RI');
  await expect(page.getByText('1 trial', { exact: true })).toBeVisible();
  await page.getByLabel('Location').selectOption('all');
  await page.getByLabel('Recruiting only').check();
  await expect(page.getByText('4 trials')).toBeVisible();
  await page.getByRole('button', { name: /^Save STEADY-BP/ }).click();
  await expect(page.getByText('2 saved')).toBeVisible();

  await page.getByRole('link', { name: 'View trial' }).first().click();
  await page.getByRole('link', { name: 'Back to results' }).click();
  await expect(page.getByText('6 trials')).toBeVisible();
});

test('filters survive opening a trial and going back in history', async ({ page }) => {
  await signIn(page, 'patient');
  await expect(page.getByRole('heading', { name: 'Hello, Alex Morgan' })).toBeVisible();
  await page.goto('/app/patient/trials');
  await page.route('**/app/api/ctgov/**', (route) => route.fulfill({ json: { studies: [] } }));
  await page.getByLabel('Condition').pressSequentially('asthma', { delay: 15 });
  await expect(page.getByLabel('Condition')).toHaveValue('asthma');
  await expect(page).toHaveURL(/q=asthma/);
  await page.getByRole('link', { name: 'View trial' }).click();
  await page.goBack();
  await expect(page.getByLabel('Condition')).toHaveValue('asthma');
  await expect(page.getByText('1 trial', { exact: true })).toBeVisible();
});

test('screening request validates, blocks duplicates and reaches the physician live', async ({ browser }) => {
  const { context, patient, physician } = await portals(browser);
  await physician.getByRole('link', { name: 'Referrals', exact: true }).click();
  await expect(physician.getByText('R-1043')).toHaveCount(0);

  await patient.goto('/app/patient/trials/FMT-2057');
  await patient.getByRole('button', { name: 'Request screening' }).click();
  const dialog = patient.getByRole('dialog');
  await expect(dialog.getByText('Step 1 of 4')).toBeVisible();

  await dialog.getByLabel('Email').fill('not-an-email');
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog.getByText('Enter a valid email')).toBeVisible();
  await dialog.getByLabel('Email').fill('alex.morgan@example.com');
  await dialog.getByRole('button', { name: 'Continue' }).click();

  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog.getByText('Choose an answer').first()).toBeVisible();
  for (const group of await dialog.getByRole('group').all()) await group.getByRole('button', { name: 'Yes' }).click();
  await dialog.getByRole('button', { name: 'Continue' }).click();

  await dialog.getByLabel('Current medications').fill('Daily controller inhaler');
  await dialog.getByRole('button', { name: 'Medication list', exact: true }).click();
  await dialog.getByRole('button', { name: 'Continue' }).click();

  await dialog.getByRole('button', { name: 'Submit request' }).click();
  await expect(dialog.getByText('Please confirm to continue')).toBeVisible();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Submit request' }).click();

  await expect(patient).toHaveURL(/\/patient\/referrals\/R-1043/);
  await expect(patient.getByText('Screening request sent · referral R-1043 created')).toBeVisible();
  await expect(patient.getByText('Daily controller inhaler')).toBeVisible();

  // The other tab updates without a reload.
  await expect(physician.getByText('R-1043')).toBeVisible();

  await patient.goto('/app/patient/trials/FMT-2057');
  await patient.getByRole('button', { name: 'View your screening request' }).click();
  await expect(patient).toHaveURL(/R-1043/);
  await context.close();
});

test('physician refers a patient and messages reach the patient portal live', async ({ browser }) => {
  const { context, patient, physician } = await portals(browser);
  await physician.getByRole('button', { name: 'Refer patient' }).click();
  const dialog = physician.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Send referral' }).click();
  await expect(dialog.getByText("Enter the patient's name")).toBeVisible();
  await expect(dialog.getByText('Choose a trial')).toBeVisible();

  await dialog.getByLabel('Patient name').fill('Alex Morgan');
  await dialog.getByLabel('Condition').fill('Asthma');
  await dialog.getByLabel('Trial').selectOption('FMT-2057');
  await dialog.getByLabel('Note to research team (optional)').fill('Please review soon.');
  await dialog.getByRole('button', { name: 'Send referral' }).click();
  await expect(physician).toHaveURL(/\/physician\/referrals\/R-1043/);

  await expect(patient.getByRole('link', { name: /BREATHE-Forward/ }).first()).toBeVisible();

  await physician.getByRole('tab', { name: /Messages/ }).click();
  await physician.getByLabel('Message').fill('Alex, this looks like a good fit.');
  await physician.getByLabel('Message').press('Enter');
  await expect(physician.getByTestId('thread').getByText('Alex, this looks like a good fit.')).toBeVisible();

  await patient.goto('/app/patient/referrals/R-1043?tab=messages');
  await expect(patient.getByTestId('thread').getByText('Alex, this looks like a good fit.')).toBeVisible();
  await patient.getByRole('button', { name: 'Thank you, that works for me.' }).click();
  await patient.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(physician.getByTestId('thread').getByText('Thank you, that works for me.')).toBeVisible();
  await context.close();
});

test('physician dashboard cards, filters and search work', async ({ page }) => {
  await signIn(page, 'physician');
  await expect(page.getByRole('heading', { name: /Dr\. Park$/ })).toBeVisible();
  await expect(page.getByText('Missing information on 2 referrals')).toBeVisible();
  await page.getByRole('button', { name: /^Decisions/ }).click();
  await expect(page).toHaveURL(/status=decision/);
  await expect(page.getByRole('row')).toHaveCount(2);
  await page.getByRole('button', { name: 'All' }).click();
  await page.getByLabel('Search referrals').fill('ruth');
  await expect(page.getByRole('row')).toHaveCount(2);
  await page.getByRole('row', { name: /Ruth Adeyemi/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/R-1016/);
  await expect(page.getByText(/Assigned to Dr\. Elena Park/)).toContainText('(you)');
  await expect(page.getByText(/by Marcus Oyelaran/)).toBeVisible();

  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fmt-')), 'pft.pdf');
  fs.writeFileSync(file, 'sample');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload document' }).click();
  await (await chooser).setFiles(file);
  await expect(page.getByText('Document uploaded · Pulmonary function test report')).toBeVisible();
});

test('each coordinator works only their own site', async ({ page }) => {
  await signIn(page, 'coordinator');
  await expect(page.getByRole('heading', { name: /Dana/ })).toBeVisible();
  await page.goto('/app/coordinator/referrals/R-1035');
  await expect(page.getByText('This referral is not available')).toBeVisible();

  await page.getByRole('link', { name: 'Sign out' }).click();
  await signIn(page, 'coordinator', '', 'user-hannah');
  await expect(page.getByRole('heading', { name: /Hannah/ })).toBeVisible();
  await expect(page.getByText('Bay State Rheumatology Trials · Research site platform')).toBeVisible();
  await page.goto('/app/coordinator/referrals/R-1035');
  await expect(page.getByText(/Assigned to Hannah Blum/)).toContainText('(you)');
});

test('every sample account signs in to data of its own', async ({ page }) => {
  await page.goto('/app/signin');
  const accounts = page.getByLabel('Sample account', { exact: true }).locator('option');
  for (const [portal, role, count] of [['Patient portal', 'patient', 9], ['Physician portal', 'physician', 2], ['Research site platform', 'coordinator', 5]] as const) {
    for (let index = 0; index < count; index += 1) {
      await page.goto('/app/signin');
      await page.getByRole('radio', { name: new RegExp(portal) }).check();
      await expect(accounts).toHaveCount(count);
      const value = (await accounts.nth(index).getAttribute('value')) as string;
      await page.getByLabel('Sample account', { exact: true }).selectOption(value);
      await page.getByRole('button', { name: /^Continue as/ }).click();
      await expect(page).toHaveURL(new RegExp(`/app/${role}$`));
      if (role === 'patient') await expect(page.locator('.ref-card').first()).toBeVisible();
      else await expect(page.locator('tbody tr').first()).toBeVisible();
      await page.getByRole('link', { name: 'Sign out' }).click();
    }
  }
});

test('a rule failure toast shows above an open dialog', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, 'patient');
  await expect(page.getByRole('heading', { name: 'Hello, Alex Morgan' })).toBeVisible();
  await page.goto('/app/patient/trials/FMT-2057');
  await page.getByRole('button', { name: 'Request screening' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Continue' }).click();
  for (const group of await dialog.getByRole('group').all()) await group.getByRole('button', { name: 'Yes' }).click();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await dialog.getByRole('checkbox').check();

  const physician = await context.newPage();
  await signIn(physician, 'physician');
  await physician.getByRole('button', { name: 'Refer patient' }).click();
  await physician.getByLabel('Patient name').fill('Alex Morgan');
  await physician.getByLabel('Condition').fill('Asthma');
  await physician.getByLabel('Trial', { exact: true }).selectOption('FMT-2057');
  await physician.getByRole('button', { name: 'Send referral' }).click();
  await expect(physician).toHaveURL(/R-1043/);

  await dialog.getByRole('button', { name: 'Submit request' }).click();
  const toast = page.getByRole('status', { includeHidden: true });
  await expect(toast).toContainText('already exists');
  expect(await toast.evaluate((element) => element.matches(':popover-open'))).toBe(true);
  await expect(dialog).toBeVisible();
  await context.close();
});

test('patient uploads a requested document', async ({ page }) => {
  await signIn(page, 'patient');
  await expect(page.getByRole('heading', { name: 'Hello, Alex Morgan' })).toBeVisible();
  await page.evaluate(() => {
    const key = 'findmytrial.record';
    const state = JSON.parse(localStorage.getItem(key) as string);
    const referral = state.referrals.find((r: { id: string }) => r.id === 'R-1042');
    referral.checklist.push({ id: 'open', label: 'Copy of insurance card', requestedAt: new Date().toISOString(), doneAt: null });
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload();
  await page.getByRole('link', { name: 'Upload now' }).click();
  await expect(page).toHaveURL(/tab=documents/);
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fmt-')), 'card.pdf');
  fs.writeFileSync(file, 'sample');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await (await chooser).setFiles(file);
  await expect(page.getByText('Document uploaded · Copy of insurance card')).toBeVisible();
  await expect(page.getByText('Nothing outstanding')).toBeVisible();
  await expect(page.getByRole('tab', { name: /Documents/ })).toContainText('3');
});

test('website deep link opens a registry study after sign-in', async ({ page }) => {
  await page.route('**/app/api/ctgov/**', (route) =>
    route.fulfill({
      json: {
        protocolSection: {
          identificationModule: { nctId: 'NCT01234567', briefTitle: 'A registry study' },
          eligibilityModule: { eligibilityCriteria: 'Inclusion Criteria:\n* Adults' },
        },
      },
    }),
  );
  await signIn(page, 'patient', '&trial=NCT01234567');
  await expect(page).toHaveURL(/\/patient\/trials\/NCT01234567/);
  await expect(page.getByRole('heading', { name: 'A registry study' })).toBeVisible();
  await expect(page.getByText("Find My Trial can't send requests to its study team yet")).toBeVisible();
});

test('a bad trial link and a wrong-portal URL fail safely', async ({ page }) => {
  await page.route('**/app/api/ctgov/**', (route) => route.fulfill({ status: 404, body: '' }));
  await signIn(page, 'patient', '&trial=NCT99999999');
  await expect(page.getByText('This trial could not be found')).toBeVisible();
  await page.goto('/app/physician');
  await expect(page).toHaveURL(/\/app\/patient$/);
  await page.goto('/app/patient/referrals/R-1038');
  await expect(page.getByText('This referral is not available')).toBeVisible();
});

test('reset restores the sample data', async ({ page }) => {
  await signIn(page, 'patient');
  await page.goto('/app/patient/trials');
  await page.getByRole('button', { name: /^Save STEADY-BP/ }).click();
  await expect(page.getByText('2 saved')).toBeVisible();
  await page.getByRole('button', { name: 'Reset sample data' }).click();
  await expect(page.getByText('Sample data reset')).toBeVisible();
  await page.goto('/app/patient/trials');
  await expect(page.getByText('1 saved')).toBeVisible();
});
