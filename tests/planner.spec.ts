import { test, expect, type Page } from '@playwright/test'
import { emptyPlanner } from '../src/domain/model'
import { exportBackup } from '../src/domain/planner'

async function createBlock(page: Page, title = 'Write the first draft', repeat = false) {
  await page.getByRole('button', { name: 'New block', exact: true }).click()
  await page.getByLabel('Title', { exact: true }).fill(title)
  await page.getByLabel('Date', { exact: true }).fill('2026-09-29')
  if (repeat) {
    await page.getByRole('combobox', { name: 'Repeat', exact: true }).click()
    await page.getByRole('option', { name: 'Every weekday' }).click()
  }
  await page.getByRole('button', { name: 'Create block', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
async function state(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem('dayframe.browser-preview.v1') ?? '{}'),
  )
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-29T12:00:00-04:00') })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Your calendar' })).toBeVisible()
})

test('creates, edits, persists, and deletes a block through the UI', async ({ page }) => {
  await createBlock(page)
  const event = page.locator('.fc-event').filter({ hasText: 'Write the first draft' })
  await expect(event).toBeVisible()
  await event.click()
  await page.getByLabel('Notes').fill('Leave enough time to review.')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.reload()
  await expect(event).toBeVisible()
  expect((await state(page)).blocks[0].notes).toBe('Leave enough time to review.')
  await event.click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(event).toHaveCount(0)
  expect((await state(page)).blocks).toHaveLength(0)
})

test('single-occurrence edit preserves the weekday series', async ({ page }) => {
  await createBlock(page, 'Morning focus', true)
  const events = page.locator('.fc-event').filter({ hasText: 'Morning focus' })
  await expect(events).toHaveCount(4)
  await events.first().click()
  await page.getByLabel('Title', { exact: true }).fill('One different morning')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(events).toHaveCount(3)
  await expect(page.locator('.fc-event').filter({ hasText: 'One different morning' })).toHaveCount(
    1,
  )
  const saved = await state(page)
  expect(saved.blocks).toHaveLength(2)
  expect(saved.blocks[0].exceptions).toEqual(['2026-09-29'])
})

test('dragging and resizing snap to 15 minutes and persist', async ({ page }) => {
  await createBlock(page, 'Move me')
  const event = page.locator('.fc-event').filter({ hasText: 'Move me' })
  const box = (await event.boundingBox())!
  const slot = (await page.locator('.fc-timegrid-slot-lane[data-time="09:00:00"]').boundingBox())!
  await page.mouse.move(box.x + 30, box.y + 25)
  await page.mouse.down()
  await page.mouse.move(box.x + 30, box.y + 25 + slot.height * 1.5, { steps: 20 })
  await page.mouse.up()
  await expect.poll(async () => (await state(page)).blocks[0].startMinute).toBe(585)
  const handle = event.locator('.fc-event-resizer-end')
  const resize = (await handle.boundingBox())!
  await page.mouse.move(resize.x + resize.width / 2, resize.y + resize.height / 2)
  await page.mouse.down()
  await page.mouse.move(resize.x + resize.width / 2, resize.y + resize.height / 2 + slot.height, {
    steps: 20,
  })
  await page.mouse.up()
  await expect.poll(async () => (await state(page)).blocks[0].endMinute).toBe(675)
})

test('creates directly by dragging on a calendar day', async ({ page }) => {
  // Dismiss the welcome card by creating one block, then use free calendar space.
  await createBlock(page, 'First block')
  const column = (await page.locator('.fc-timegrid-col[data-date="2026-09-30"]').boundingBox())!
  const lane = (await page.locator('.fc-timegrid-slot-lane[data-time="10:00:00"]').boundingBox())!
  await page.mouse.move(column.x + column.width / 2, lane.y + 3)
  await page.mouse.down()
  await page.mouse.move(column.x + column.width / 2, lane.y + lane.height * 2 - 3, { steps: 12 })
  await page.mouse.up()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByLabel('Start', { exact: true })).toHaveValue('10:00')
  await expect(page.getByLabel('End', { exact: true })).toHaveValue('11:00')
  await page.getByLabel('Title', { exact: true }).fill('Created on the calendar')
  await page.getByRole('button', { name: 'Create block', exact: true }).click()
  expect((await state(page)).blocks[1].date).toBe('2026-09-30')
})

test('saves a daily template and applies it without replacing existing blocks', async ({
  page,
}) => {
  await createBlock(page, 'A good rhythm')
  await page.getByRole('button', { name: 'Daily templates 0' }).click()
  await page.getByLabel('Save this day as a template').fill('Focused day')
  await page.getByRole('button', { name: 'Save 1 block' }).click()
  await expect(page.getByText('Focused day', { exact: true })).toBeVisible()
  await page.getByLabel('Day to save or apply to').fill('2026-09-30')
  await page.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect.poll(async () => (await state(page)).blocks.length).toBe(2)
  expect((await state(page)).blocks[1].date).toBe('2026-09-30')
})

test('exports a backup and restores only after confirmation; rejects malformed files', async ({
  page,
}) => {
  await createBlock(page, 'Keep a backup')
  await page.getByRole('button', { name: 'Settings & backups' }).click()
  await page.getByRole('tab', { name: 'Backups' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export backup' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^dayframe-.*\.json$/)
  const chooser = page.getByLabel('Import backup file')
  await chooser.setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{no'),
  })
  await expect(page.getByRole('alert')).toContainText('not valid JSON')
  expect((await state(page)).blocks).toHaveLength(1)
  await chooser.setInputFiles({
    name: 'empty.json',
    mimeType: 'application/json',
    buffer: Buffer.from(exportBackup(emptyPlanner())),
  })
  await expect(page.getByRole('alertdialog')).toBeVisible()
  expect((await state(page)).blocks).toHaveLength(1)
  await page.getByRole('button', { name: 'Restore backup', exact: true }).click()
  await expect.poll(async () => (await state(page)).blocks.length).toBe(0)
})

test('day/week navigation, category filtering, and theme selection work', async ({ page }) => {
  await createBlock(page)
  await page.getByRole('button', { name: 'Day', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'September 29, 2026' })).toBeVisible()
  await page.getByRole('button', { name: 'Focus', exact: true }).click()
  await expect(page.locator('.fc-event')).toHaveCount(0)
  await page.getByRole('button', { name: 'Focus', exact: true }).click()
  await expect(page.locator('.fc-event')).toHaveCount(1)
  await page.getByRole('button', { name: 'Settings & backups' }).click()
  await page.getByRole('combobox', { name: 'Appearance' }).click()
  await page.getByRole('option', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveClass('dark')
})

test('a corrupt saved planner is reported without overwriting it', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('dayframe.browser-preview.v1', '{bad'))
  await page.reload()
  await expect(page.getByRole('alert')).toContainText('saved data has not been changed')
  expect(await page.evaluate(() => localStorage.getItem('dayframe.browser-preview.v1'))).toBe(
    '{bad',
  )
})
