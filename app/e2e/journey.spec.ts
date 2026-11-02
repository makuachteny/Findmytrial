import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function signIn(page: Page, role: string, account?: string) {
  await page.goto(`/app/signin?role=${role}`);
  if (account) await page.getByLabel('Sample account', { exact: true }).selectOption(account);
  await page.getByRole('button', { name: /^Continue as/ }).click();
  await expect(page).toHaveURL(new RegExp(`/app/${role}$`));
}

test('one referral moves through all seven steps, updating every portal live', async ({ browser }) => {
  const context = await browser.newContext();
  const [patient, physician, site] = [await context.newPage(), await context.newPage(), await context.newPage()];
  await signIn(patient, 'patient');
  await signIn(physician, 'physician');
  // The asthma trial belongs to Marcus's site.
  await signIn(site, 'coordinator', 'user-marcus');
  await physician.goto('/app/physician/referrals');
  await site.goto('/app/coordinator/referrals');
  await expect(site.getByText('Jordan Lee')).toBeVisible();

  // Steps 1 and 2: the patient finds a trial and requests screening.
  await patient.goto('/app/patient/trials');
  await patient.getByLabel('Condition').fill('asthma');
  await patient.getByRole('link', { name: 'View trial' }).first().click();
  await patient.getByRole('button', { name: 'Request screening' }).click();
  const request = patient.getByRole('dialog');
  await request.getByRole('button', { name: 'Continue' }).click();
  for (const group of await request.getByRole('group').all()) await group.getByRole('button', { name: 'Yes' }).click();
  await request.getByRole('button', { name: 'Continue' }).click();
  await request.getByRole('button', { name: 'Continue' }).click();
  await request.getByRole('checkbox').check();
  await request.getByRole('button', { name: 'Submit request' }).click();
  await expect(patient).toHaveURL(/R-1043/);

  // Both other portals show it without a reload.
  await expect(physician.getByText('R-1043')).toBeVisible();
  await expect(site.getByText(/R-1043/)).toBeVisible();

  // Step 3: the research site reviews and requests a document.
  await site.goto('/app/coordinator/referrals/R-1043');
  await site.getByRole('button', { name: 'Move to Initial review' }).click();
  await expect(patient.getByText('Initial review', { exact: true }).first()).toBeVisible();
  await site.getByRole('button', { name: 'Request document' }).click();
  await site.getByRole('dialog').getByRole('button', { name: 'Current medication list' }).click();
  await site.getByRole('dialog').getByRole('button', { name: 'Send request' }).click();

  // Step 4: it becomes the patient's next step, and they upload it.
  await expect(patient.getByText('Upload Current medication list')).toBeVisible();
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fmt-')), 'meds.pdf');
  fs.writeFileSync(file, 'sample');
  const chooser = patient.waitForEvent('filechooser');
  await patient.getByRole('button', { name: 'Upload document' }).click();
  await (await chooser).setFiles(file);
  await expect(site.getByRole('tab', { name: /Documents/ })).toContainText('1');

  // Step 5: the site moves it to screening and schedules the visit.
  await site.getByRole('button', { name: 'Move to Screening' }).click();
  const schedule = site.getByRole('dialog');
  await schedule.getByLabel('Date').fill('2030-03-14');
  await schedule.getByLabel('Time').fill('09:30');
  await schedule.getByRole('button').last().click();
  await expect(patient.getByText(/Attend screening visit on Thu, Mar 14, 2030 at 9:30 AM/)).toBeVisible();

  // Step 6: the physician checks status and replies.
  await physician.goto('/app/physician/referrals/R-1043?tab=messages');
  await physician.getByLabel('Message').fill('Please keep me posted.');
  await physician.getByLabel('Message').press('Enter');
  await patient.getByRole('tab', { name: /Messages/ }).click();
  await expect(patient.getByTestId('thread').getByText('Please keep me posted.')).toBeVisible();

  // Step 7: the site records the final decision.
  await site.getByRole('button', { name: 'Record eligibility decision' }).click();
  await site.getByRole('dialog').getByRole('button', { name: /Eligible to enroll/ }).click();
  await site.getByRole('dialog').getByRole('button', { name: 'Confirm and record' }).click();

  for (const page of [patient, physician, site]) {
    await expect(page.getByText('Decision: eligible to enroll').first()).toBeVisible();
    await expect(page.getByText('Enrollment call to review consent').first()).toBeVisible();
  }
  await expect(site.getByRole('button', { name: /Move to|Record eligibility|Request document/ })).toHaveCount(0);
  await context.close();
});
