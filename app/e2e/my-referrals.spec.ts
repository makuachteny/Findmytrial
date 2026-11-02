import { expect, test } from '@playwright/test';

test('my referrals is a table whose rows open the referral', async ({ page }) => {
  await page.goto('/app/signin?role=patient');
  await page.getByRole('button', { name: /^Continue as/ }).click();
  await page.getByRole('link', { name: 'My referrals' }).click();

  for (const column of ['Trial', 'Research site', 'Status', 'Next action', 'Submitted']) {
    await expect(page.getByRole('columnheader', { name: column })).toBeVisible();
  }
  const row = page.getByRole('row', { name: /STEADY-BP/ });
  await expect(row).toContainText('Beacon Clinical Research Center');
  await expect(row).toContainText('Screening · pending');

  await row.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/patient\/referrals\/R-1042$/);
  await page.goBack();
  await page.getByRole('row', { name: /STEADY-BP/ }).click();
  await expect(page).toHaveURL(/\/patient\/referrals\/R-1042$/);
});
