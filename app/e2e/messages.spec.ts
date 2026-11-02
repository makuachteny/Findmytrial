import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page, role: string) {
  await page.goto(`/app/signin?role=${role}`);
  await page.getByRole('button', { name: /^Continue as/ }).click();
  await expect(page).toHaveURL(new RegExp(`/app/${role}$`));
}

async function expectInMessages(page: Page) {
  await expect(page).toHaveURL(/\/app\/patient\/messages\/R-1042$/);
  await expect(page.getByRole('link', { name: 'Messages', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'My referrals' })).not.toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('thread')).toBeVisible();
}

test('a patient conversation opens and stays in Messages', async ({ page }) => {
  await signIn(page, 'patient');
  await page.getByRole('link', { name: 'Messages', exact: true }).click();
  await page.getByRole('link', { name: /STEADY-BP/ }).click();
  await expectInMessages(page);
  await expect(page.getByRole('heading', { name: /STEADY-BP/ })).toBeVisible();

  await page.getByLabel('Message').fill('What should I bring?');
  await page.getByLabel('Message').press('Enter');
  await expect(page.getByTestId('thread').getByText('What should I bring?')).toBeVisible();
  await expectInMessages(page);

  await page.getByRole('link', { name: 'Back to messages' }).click();
  await expect(page.getByText('You: What should I bring?').or(page.getByText('Alex: What should I bring?'))).toBeVisible();
});

test('every way into a patient chat lands in Messages', async ({ page }) => {
  await signIn(page, 'patient');
  await page.getByRole('link', { name: /Dana Whitfield/ }).first().click();
  await expectInMessages(page);

  await page.goto('/app/patient/referrals/R-1042');
  await page.getByRole('tab', { name: /Messages/ }).click();
  await expectInMessages(page);

  await page.goto('/app/patient/referrals/R-1042?tab=messages');
  await expectInMessages(page);

  await page.goto('/app/patient/referrals/R-1042?tab=coverage');
  await page.getByRole('button', { name: 'Ask the coordinator' }).click();
  await expectInMessages(page);
  await expect(page.getByLabel('Message')).toHaveValue('Coverage question: ');
});

test('a patient cannot open someone else’s conversation', async ({ page }) => {
  await signIn(page, 'patient');
  await page.goto('/app/patient/messages/R-1038');
  await expect(page.getByText('This conversation is not available')).toBeVisible();
});

test('physicians keep the conversation on the referral', async ({ page }) => {
  await signIn(page, 'physician');
  await page.goto('/app/physician/referrals/R-1042?tab=messages');
  await expect(page).toHaveURL(/\/physician\/referrals\/R-1042\?tab=messages/);
  await expect(page.getByTestId('thread')).toBeVisible();
});
