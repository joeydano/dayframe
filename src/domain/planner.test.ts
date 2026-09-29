import { describe, expect, it } from 'vitest'
import { addDays, dateKey, emptyPlanner, localDateTime, plannerSchema, type Block } from './model'
import {
  applyTemplate,
  editOccurrence,
  exportBackup,
  findOverlaps,
  importBackup,
  makeTemplate,
  newBlock,
  occurrences,
  reminderJobs,
  removeOccurrence,
} from './planner'

function block(patch: Partial<Block> = {}): Block {
  return newBlock({
    title: 'Deep work',
    notes: '',
    categoryId: emptyPlanner().categories[0].id,
    date: '2026-09-28',
    startMinute: 540,
    endMinute: 600,
    reminderMinutes: 5,
    ...patch,
  })
}
describe('recurring calendar blocks', () => {
  it('expands weekdays across a weekend and respects an inclusive end', () => {
    const series = block({ recurrence: 'weekdays', until: '2026-10-05' })
    expect(occurrences([series], '2026-10-02', '2026-10-07').map((o) => o.occurrenceDate)).toEqual([
      '2026-10-02',
      '2026-10-05',
    ])
  })
  it('keeps a weekly series anchored to its weekday across month boundaries', () => {
    expect(
      occurrences([block({ recurrence: 'weekly' })], '2026-09-28', '2026-10-15').map(
        (o) => o.occurrenceDate,
      ),
    ).toEqual(['2026-09-28', '2026-10-05', '2026-10-12'])
  })
  it('does not invent occurrences before the start or include the exclusive range end', () => {
    expect(occurrences([block({ recurrence: 'daily' })], '2026-09-26', '2026-09-29')).toHaveLength(
      1,
    )
  })
  it('detaches a moved occurrence without moving or duplicating the rest of the series', () => {
    const series = block({ recurrence: 'daily' }),
      state = { ...emptyPlanner(), blocks: [series] }
    const original = occurrences(state.blocks, '2026-09-29', '2026-09-30')[0]
    const updated = editOccurrence(
      state,
      original,
      { ...series, date: '2026-09-30', startMinute: 660, endMinute: 720 },
      'occurrence',
    )
    expect(occurrences(updated.blocks, '2026-09-29', '2026-09-30')).toHaveLength(0)
    expect(
      occurrences(updated.blocks, '2026-09-30', '2026-10-01').map((o) => o.startMinute),
    ).toEqual([540, 660])
    expect(updated.blocks[1].id).not.toBe(series.id)
    expect(updated.blocks[1].recurrence).toBe('none')
  })
  it('changes the full series only when explicitly requested', () => {
    const series = block({ recurrence: 'daily' }),
      state = { ...emptyPlanner(), blocks: [series] }
    const original = occurrences(state.blocks, '2026-09-29', '2026-09-30')[0]
    const updated = editOccurrence(
      state,
      original,
      { ...series, title: 'Revised', startMinute: 600, endMinute: 660 },
      'series',
    )
    expect(updated.blocks).toHaveLength(1)
    expect(
      occurrences(updated.blocks, '2026-09-28', '2026-10-01').every(
        (o) => o.title === 'Revised' && o.startMinute === 600,
      ),
    ).toBe(true)
  })
  it('deletes one occurrence or the whole series according to scope', () => {
    const state = { ...emptyPlanner(), blocks: [block({ recurrence: 'daily' })] }
    const original = occurrences(state.blocks, '2026-09-29', '2026-09-30')[0]
    expect(
      occurrences(
        removeOccurrence(state, original, 'occurrence').blocks,
        '2026-09-28',
        '2026-10-01',
      ),
    ).toHaveLength(2)
    expect(removeOccurrence(state, original, 'series').blocks).toHaveLength(0)
  })
  it('flags true overlaps but allows back-to-back blocks', () => {
    const original = block()
    expect(findOverlaps([original], block({ startMinute: 600, endMinute: 660 }))).toHaveLength(0)
    expect(findOverlaps([original], block({ startMinute: 585, endMinute: 645 }))).toHaveLength(1)
  })
  it('advances by local dates across DST and preserves clock times', () => {
    expect(localDateTime('2026-03-07', 540).getTimezoneOffset()).toBe(300)
    expect(localDateTime('2026-03-08', 540).getTimezoneOffset()).toBe(240)
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
    const events = occurrences(
      [block({ date: '2026-03-07', recurrence: 'daily' })],
      '2026-03-07',
      '2026-03-10',
    )
    expect(events.map((o) => localDateTime(o.occurrenceDate, o.startMinute).getHours())).toEqual([
      9, 9, 9,
    ])
  })
  it('supports midnight as the exclusive end of a day', () => {
    expect(dateKey(localDateTime('2026-09-28', 1440))).toBe('2026-09-29')
    expect(() => block({ startMinute: 1425, endMinute: 1440 })).not.toThrow()
  })
})
describe('templates and backups', () => {
  it('captures occurrences as independent template blocks and applies additively', () => {
    const state = { ...emptyPlanner(), blocks: [block({ recurrence: 'daily' })] }
    const template = makeTemplate(state, '2026-09-29', 'Workday')
    const result = applyTemplate(state, template, '2026-10-01')
    expect(result.blocks).toHaveLength(2)
    expect(result.blocks[1].recurrence).toBe('none')
    expect(result.blocks[1].date).toBe('2026-10-01')
    expect(result.blocks[1].id).not.toBe(state.blocks[0].id)
  })
  it('round trips all supported data without losing exceptions or templates', () => {
    const state = { ...emptyPlanner(), blocks: [block({ recurrence: 'daily' })] }
    state.blocks[0].exceptions = ['2026-09-30']
    state.templates = [makeTemplate(state, '2026-09-28', 'Workday')]
    expect(importBackup(exportBackup(state))).toEqual(state)
  })
  it('rejects invalid JSON, future versions, and oversized backups', () => {
    expect(() => importBackup('{bad')).toThrow('not valid JSON')
    expect(() =>
      importBackup(exportBackup(emptyPlanner()).replace('"version": 1', '"version": 2')),
    ).toThrow('compatible')
    expect(() => importBackup(' '.repeat(5 * 1024 * 1024 + 1))).toThrow('too large')
  })
  it('rejects duplicate IDs and unknown category references', () => {
    const item = block()
    expect(plannerSchema.safeParse({ ...emptyPlanner(), blocks: [item, item] }).success).toBe(false)
    expect(
      plannerSchema.safeParse({
        ...emptyPlanner(),
        blocks: [{ ...item, categoryId: crypto.randomUUID() }],
      }).success,
    ).toBe(false)
  })
  it('rejects impossible dates, backwards durations, non-snapped times, and invalid template times', () => {
    for (const patch of [
      { date: '2026-02-30' },
      { startMinute: 601 },
      { endMinute: 500 },
      { until: '2020-01-01' },
    ])
      expect(() => block(patch)).toThrow()
    const state = { ...emptyPlanner(), blocks: [block()] }
    const template = makeTemplate(state, '2026-09-28', 'Workday')
    template.blocks[0].endMinute = 500
    expect(plannerSchema.safeParse({ ...state, templates: [template] }).success).toBe(false)
  })
  it('does not save an empty daily template', () =>
    expect(() => makeTemplate(emptyPlanner(), '2026-09-28', 'Empty')).toThrow('Add a block'))
})
describe('reminders', () => {
  it('skips reminders for a nonexistent time during the spring DST gap', () => {
    const state = {
      ...emptyPlanner(),
      blocks: [
        block({ date: '2026-03-08', startMinute: 150, endMinute: 180, reminderMinutes: 15 }),
      ],
    }
    state.preferences.remindersEnabled = true
    expect(reminderJobs(state, localDateTime('2026-03-08', 0))).toEqual([])
  })
  it('queues lead-time notifications only when globally enabled', () => {
    const state = { ...emptyPlanner(), blocks: [block()] }
    const now = localDateTime('2026-09-28', 530)
    expect(reminderJobs(state, now)).toEqual([])
    state.preferences.remindersEnabled = true
    const jobs = reminderJobs(state, now)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].at).toBe(localDateTime('2026-09-28', 535).valueOf() / 1000)
  })
  it('includes tomorrow reminders whose lead time lands tonight', () => {
    const state = {
      ...emptyPlanner(),
      blocks: [block({ date: '2026-09-29', startMinute: 0, endMinute: 60, reminderMinutes: 15 })],
    }
    state.preferences.remindersEnabled = true
    expect(reminderJobs(state, localDateTime('2026-09-28', 1420))[0].at).toBe(
      localDateTime('2026-09-28', 1425).valueOf() / 1000,
    )
  })
  it('does not replay stale or excluded occurrences', () => {
    const item = block({ recurrence: 'daily' })
    item.exceptions = ['2026-09-29']
    const state = { ...emptyPlanner(), blocks: [item] }
    state.preferences.remindersEnabled = true
    const jobs = reminderJobs(state, localDateTime('2026-09-28', 700))
    expect(jobs.every((j) => !j.id.includes('2026-09-28') && !j.id.includes('2026-09-29'))).toBe(
      true,
    )
  })
})
