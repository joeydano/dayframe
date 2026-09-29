import {
  addDays,
  blockSchema,
  dateKey,
  localDateTime,
  MAX_BACKUP_BYTES,
  plannerSchema,
  type Block,
  type BlockFields,
  type Occurrence,
  type Planner,
  type Scope,
  type Template,
} from './model'
import { z } from 'zod'

export function occursOn(block: Block, day: string): boolean {
  if (day < block.date || (block.until && day > block.until) || block.exceptions.includes(day))
    return false
  const weekday = new Date(`${day}T12:00:00`).getDay()
  switch (block.recurrence) {
    case 'none':
      return day === block.date
    case 'daily':
      return true
    case 'weekdays':
      return weekday > 0 && weekday < 6
    case 'weekly':
      return weekday === new Date(`${block.date}T12:00:00`).getDay()
  }
}

/** End is exclusive; advance by calendar days, never by 24-hour milliseconds. */
export function occurrences(blocks: Block[], start: string, end: string): Occurrence[] {
  const result: Occurrence[] = []
  for (let day = start, count = 0; day < end && count < 370; day = addDays(day, 1), count++) {
    for (const block of blocks)
      if (occursOn(block, day))
        result.push({ ...block, occurrenceDate: day, occurrenceId: `${block.id}:${day}` })
  }
  return result.sort(
    (a, b) =>
      a.occurrenceDate.localeCompare(b.occurrenceDate) ||
      a.startMinute - b.startMinute ||
      a.title.localeCompare(b.title),
  )
}

export function newBlock(
  fields: BlockFields & { date: string; recurrence?: Block['recurrence']; until?: string | null },
): Block {
  const now = new Date().toISOString()
  return blockSchema.parse({
    ...fields,
    id: crypto.randomUUID(),
    recurrence: fields.recurrence ?? 'none',
    until: fields.until ?? null,
    exceptions: [],
    createdAt: now,
    updatedAt: now,
  })
}

export function editOccurrence(
  planner: Planner,
  occurrence: Occurrence,
  replacement: Block,
  scope: Scope,
): Planner {
  const current = planner.blocks.find((b) => b.id === occurrence.id)
  if (!current) throw new Error('This block no longer exists. Reopen the calendar and try again.')
  if (scope === 'series' || current.recurrence === 'none') {
    const updated = blockSchema.parse({
      ...replacement,
      id: current.id,
      createdAt: current.createdAt,
      updatedAt: new Date().toISOString(),
    })
    return { ...planner, blocks: planner.blocks.map((b) => (b.id === current.id ? updated : b)) }
  }
  const detached = newBlock({ ...replacement, recurrence: 'none', until: null })
  return {
    ...planner,
    blocks: [
      ...planner.blocks.map((b) =>
        b.id === current.id
          ? {
              ...b,
              exceptions: [...new Set([...b.exceptions, occurrence.occurrenceDate])],
              updatedAt: new Date().toISOString(),
            }
          : b,
      ),
      detached,
    ],
  }
}

export function removeOccurrence(planner: Planner, occurrence: Occurrence, scope: Scope): Planner {
  if (scope === 'series' || occurrence.recurrence === 'none')
    return { ...planner, blocks: planner.blocks.filter((b) => b.id !== occurrence.id) }
  return {
    ...planner,
    blocks: planner.blocks.map((b) =>
      b.id === occurrence.id
        ? {
            ...b,
            exceptions: [...new Set([...b.exceptions, occurrence.occurrenceDate])],
            updatedAt: new Date().toISOString(),
          }
        : b,
    ),
  }
}

export function findOverlaps(
  blocks: Block[],
  candidate: Block,
  occurrence?: Occurrence,
): Occurrence[] {
  return occurrences(blocks, candidate.date, addDays(candidate.date, 1)).filter(
    (o) =>
      o.occurrenceId !== occurrence?.occurrenceId &&
      o.startMinute < candidate.endMinute &&
      o.endMinute > candidate.startMinute,
  )
}

export function makeTemplate(planner: Planner, day: string, name: string): Template {
  const blocks = occurrences(planner.blocks, day, addDays(day, 1)).map(
    ({ title, notes, categoryId, startMinute, endMinute, reminderMinutes }) => ({
      title,
      notes,
      categoryId,
      startMinute,
      endMinute,
      reminderMinutes,
    }),
  )
  if (!blocks.length) throw new Error('Add a block to this day before saving a template.')
  return { id: crypto.randomUUID(), name: name.trim(), blocks, createdAt: new Date().toISOString() }
}
export function applyTemplate(planner: Planner, template: Template, day: string): Planner {
  return {
    ...planner,
    blocks: [
      ...planner.blocks,
      ...template.blocks.map((fields) => newBlock({ ...fields, date: day })),
    ],
  }
}

const backupSchema = z.object({
  format: z.literal('dayframe-backup'),
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  planner: plannerSchema,
})
export function exportBackup(planner: Planner): string {
  return JSON.stringify(
    {
      format: 'dayframe-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      planner: plannerSchema.parse(planner),
    },
    null,
    2,
  )
}
export function importBackup(text: string): Planner {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error('Backup is too large. The limit is 5 MB.')
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON. Choose a Dayframe backup.')
  }
  const result = backupSchema.safeParse(json)
  if (!result.success)
    throw new Error(
      `This is not a compatible Dayframe v1 backup. ${result.error.issues[0]?.message ?? ''}`,
    )
  return result.data.planner
}

export type ReminderJob = { id: string; at: number; title: string; body: string }
export function reminderJobs(planner: Planner, now = new Date()): ReminderJob[] {
  if (!planner.preferences.remindersEnabled) return []
  const today = dateKey(now)
  return occurrences(planner.blocks, today, addDays(today, 14)).flatMap((block) => {
    if (block.reminderMinutes === null) return []
    const start = localDateTime(block.occurrenceDate, block.startMinute)
    // Do not silently deliver a 02:30 reminder at 03:30 during the spring DST gap.
    if (start.getHours() * 60 + start.getMinutes() !== block.startMinute) return []
    const at = Math.floor(start.valueOf() / 1000) - block.reminderMinutes * 60
    if (at < Math.floor(now.valueOf() / 1000) - 60) return []
    return [
      {
        id: `${block.occurrenceId}:${block.startMinute}:${block.reminderMinutes}`,
        at,
        title: block.title,
        body:
          block.reminderMinutes === 0
            ? 'Your next block starts now.'
            : `Starts in ${block.reminderMinutes} minutes.`,
      },
    ]
  })
}
