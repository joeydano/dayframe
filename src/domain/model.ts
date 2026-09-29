import { z } from 'zod'

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T12:00:00`)
    return (
      !Number.isNaN(date.valueOf()) &&
      dateKey(date) === value &&
      value >= '2000-01-01' &&
      value <= '2100-12-31'
    )
  }, 'Choose a valid date between 2000 and 2100.')
const minuteSchema = z.number().int().min(0).max(1440).multipleOf(15)
const timestampSchema = z.string().datetime()
export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(40),
  color: z.enum(['iris', 'blue', 'sage', 'amber', 'rose']),
})
export const blockFieldsSchema = z.object({
  title: z.string().trim().min(1, 'Give this block a title.').max(120),
  notes: z.string().max(5000),
  categoryId: z.string().uuid(),
  startMinute: minuteSchema.max(1425),
  endMinute: minuteSchema.min(15),
  reminderMinutes: z.union([
    z.literal(0),
    z.literal(5),
    z.literal(10),
    z.literal(15),
    z.literal(30),
    z.null(),
  ]),
})
export const blockSchema = blockFieldsSchema
  .extend({
    id: z.string().uuid(),
    date: dateKeySchema,
    recurrence: z.enum(['none', 'daily', 'weekdays', 'weekly']),
    until: dateKeySchema.nullable(),
    exceptions: z.array(dateKeySchema).max(10000),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .refine(
    (b) => b.endMinute > b.startMinute,
    'End time must be after start time. Split overnight blocks at midnight.',
  )
  .refine((b) => !b.until || b.until >= b.date, 'Repeat end must be on or after the first day.')
export const templateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  createdAt: timestampSchema,
  blocks: z
    .array(
      blockFieldsSchema.refine((b) => b.endMinute > b.startMinute, 'Invalid template time range.'),
    )
    .min(1)
    .max(96),
})
export const plannerSchema = z
  .object({
    schemaVersion: z.literal(1),
    blocks: z.array(blockSchema).max(10000),
    categories: z.array(categorySchema).min(1).max(30),
    templates: z.array(templateSchema).max(100),
    preferences: z.object({
      theme: z.enum(['system', 'light', 'dark']),
      remindersEnabled: z.boolean(),
      weekStartsOn: z.union([z.literal(0), z.literal(1)]),
    }),
  })
  .superRefine((data, ctx) => {
    for (const [key, items] of Object.entries({
      blocks: data.blocks,
      categories: data.categories,
      templates: data.templates,
    })) {
      if (new Set(items.map((item) => item.id)).size !== items.length)
        ctx.addIssue({ code: 'custom', path: [key], message: `Duplicate ${key} IDs.` })
    }
    const categories = new Set(data.categories.map((c) => c.id))
    if (
      [...data.blocks, ...data.templates.flatMap((t) => t.blocks)].some(
        (b) => !categories.has(b.categoryId),
      )
    ) {
      ctx.addIssue({ code: 'custom', message: 'A block refers to an unknown category.' })
    }
  })
export type Planner = z.infer<typeof plannerSchema>
export type Block = z.infer<typeof blockSchema>
export type BlockFields = z.infer<typeof blockFieldsSchema>
export type Category = z.infer<typeof categorySchema>
export type Template = z.infer<typeof templateSchema>
export type Occurrence = Block & { occurrenceDate: string; occurrenceId: string }
export type Scope = 'occurrence' | 'series'

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function addDays(key: string, days: number): string {
  const date = new Date(`${key}T12:00:00`)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}
export function minuteTime(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
}
export function timeMinute(time: string): number {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}
export function localDateTime(key: string, minute: number): Date {
  const date = new Date(`${key}T00:00:00`)
  date.setHours(Math.floor(minute / 60), minute % 60, 0, 0)
  return date
}
export function friendlyTime(minute: number): string {
  if (minute === 1440) return '12:00 AM'
  return localDateTime('2026-01-01', minute).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}
export function emptyPlanner(): Planner {
  return {
    schemaVersion: 1,
    blocks: [],
    templates: [],
    categories: [
      { id: '7c184c6a-864e-4b12-835e-d3ee985f12a1', name: 'Focus', color: 'iris' },
      { id: '7c184c6a-864e-4b12-835e-d3ee985f12a2', name: 'Meetings', color: 'blue' },
      { id: '7c184c6a-864e-4b12-835e-d3ee985f12a3', name: 'Personal', color: 'sage' },
      { id: '7c184c6a-864e-4b12-835e-d3ee985f12a4', name: 'Break', color: 'amber' },
      { id: '7c184c6a-864e-4b12-835e-d3ee985f12a5', name: 'Other', color: 'rose' },
    ],
    preferences: { theme: 'system', remindersEnabled: false, weekStartsOn: 1 },
  }
}
