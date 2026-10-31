import { expect, test } from '@playwright/test';

test('picture-in-picture layout switches between office and board', async ({ page }) => {
  await page.goto('/?pip=1#/island');
  await expect(page.locator('.pip-bar')).toBeVisible();
  await expect(page.getByLabel('Agent status')).toBeVisible();
  await expect(page.locator('.island-stage canvas')).toBeVisible();
  await page.getByRole('tab', { name: 'Board' }).click();
  await expect(page.getByRole('heading', { name: /Needs you/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add task' })).toHaveCount(0);
  await page.getByRole('tab', { name: 'My world' }).click();
  await expect(page.locator('.island-stage canvas')).toBeVisible();
});
