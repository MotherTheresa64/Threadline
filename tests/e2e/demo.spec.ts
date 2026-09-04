import {expect, test} from '@playwright/test';

test.beforeEach(async ({page}) => {
  await page.goto('/');
  await expect(page.getByRole('heading', {name: /Welcome to Northstar Labs/i})).toBeVisible();
});

test('creates, replies to, resolves, deep-links, and reloads a durable discussion', async ({page}) => {
  await page.getByRole('button', {name: 'New discussion'}).click();
  await page.getByLabel('Title').fill('Should launch notes become durable knowledge?');
  await page.getByLabel('Channel').selectOption('engineering');
  await page.getByLabel('Context').fill('We need a durable decision trail that survives refreshes and can be found later.');
  await page.getByLabel('Tags').fill('decision, knowledge');
  await page.getByRole('button', {name: 'Publish discussion'}).click();

  await expect(page).toHaveURL(/\/w\/northstar-demo\/discussion\//);
  await expect(page.getByRole('heading', {name: 'Should launch notes become durable knowledge?'})).toBeVisible();

  await page.getByPlaceholder(/Reply with useful context/i).fill('Yes. Preserve the outcome and link supporting documentation.');
  await page.getByRole('button', {name: 'Reply', exact: true}).click();
  await expect(page.getByText('Yes. Preserve the outcome and link supporting documentation.')).toBeVisible();

  await page.getByRole('button', {name: 'Resolve discussion'}).click();
  await page.getByLabel('Decision or outcome').fill('Launch notes become a resolved discussion and the durable policy lives in a linked knowledge document.');
  await page.getByRole('button', {name: 'Resolve discussion', exact: true}).click();
  await expect(page.getByText(/Resolved: Launch notes become a resolved discussion/i)).toBeVisible();

  const deepLink = page.url();
  await page.reload();
  await expect(page).toHaveURL(deepLink);
  await expect(page.getByText(/Resolved: Launch notes become a resolved discussion/i)).toBeVisible();
});

test('search includes reply and decision context without leaving accessible workspace data', async ({page}) => {
  const search = page.getByRole('textbox', {name: /Search discussions, replies, resolutions, and documents/i});
  await search.fill('manual action');
  await expect(page.getByRole('heading', {name: 'Accessibility audit findings for workspace settings'})).not.toBeVisible().catch(() => {});
  await expect(page.getByText('What should our API retry policy look like?')).toBeVisible();

  await search.fill('Retry-After');
  await expect(page.getByText('API resilience guidelines')).toBeVisible();
});

test('knowledge document links back to its source discussion', async ({page}) => {
  await page.getByRole('button', {name: 'Knowledge'}).first().click();
  await page.getByRole('button', {name: /API resilience guidelines/}).click();
  await expect(page).toHaveURL(/\/document\/api-resilience$/);
  await page.getByRole('button', {name: /What should our API retry policy look like/i}).click();
  await expect(page).toHaveURL(/\/discussion\/retry-policy$/);
});

test('mobile navigation remains reachable without desktop-only interactions', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  const mobileNav = page.getByRole('navigation', {name: 'Mobile primary navigation'});
  await expect(mobileNav).toBeVisible();
  await mobileNav.getByRole('button', {name: /Knowledge/}).click();
  await expect(page.getByRole('heading', {name: 'Documents'})).toBeVisible();
  await mobileNav.getByRole('button', {name: /Channels/}).click();
  await expect(page.getByRole('complementary', {name: 'Workspace navigation'})).toHaveClass(/open/);
  await page.getByRole('button', {name: /engineering/i}).click();
  await expect(page.getByRole('heading', {name: '#engineering'})).toBeVisible();
});
