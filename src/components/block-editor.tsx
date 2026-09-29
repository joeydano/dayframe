import { useState } from 'react'
import { AlertTriangle, Bell, Repeat2, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  blockSchema,
  minuteTime,
  timeMinute,
  type Block,
  type Occurrence,
  type Planner,
  type Scope,
} from '@/domain/model'
import { findOverlaps, newBlock } from '@/domain/planner'
import { ConfirmDialog } from './confirm-dialog'

export type EditorSelection = {
  date: string
  startMinute: number
  endMinute: number
  occurrence?: Occurrence
}
export function BlockEditor({
  selection,
  planner,
  onClose,
  onSave,
  onDelete,
}: {
  selection: EditorSelection
  planner: Planner
  onClose: () => void
  onSave: (block: Block, scope: Scope) => Promise<void>
  onDelete: (scope: Scope) => Promise<void>
}) {
  const existing = selection.occurrence
  const recurring = existing && existing.recurrence !== 'none'
  const [scope, setScope] = useState<Scope>('occurrence')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [date, setDate] = useState(selection.date)
  const [start, setStart] = useState(minuteTime(selection.startMinute))
  const [end, setEnd] = useState(
    selection.endMinute === 1440 ? '00:00' : minuteTime(selection.endMinute),
  )
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? planner.categories[0].id)
  const [recurrence, setRecurrence] = useState<Block['recurrence']>(existing?.recurrence ?? 'none')
  const [until, setUntil] = useState(existing?.until ?? '')
  const [reminder, setReminder] = useState(existing?.reminderMinutes?.toString() ?? 'none')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const candidate = {
    ...(existing ?? {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      exceptions: [],
    }),
    title,
    notes,
    date,
    categoryId,
    startMinute: timeMinute(start),
    endMinute: end === '00:00' ? 1440 : timeMinute(end),
    recurrence: recurring && scope === 'occurrence' ? ('none' as const) : recurrence,
    until: (!recurring || scope === 'series') && recurrence !== 'none' && until ? until : null,
    reminderMinutes: reminder === 'none' ? null : (Number(reminder) as Block['reminderMinutes']),
  }
  const overlaps = findOverlaps(
    recurring && scope === 'series'
      ? planner.blocks.filter((block) => block.id !== existing.id)
      : planner.blocks,
    candidate,
    existing,
  )

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    const parsed = blockSchema.safeParse(candidate)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the block details.')
      return
    }
    setBusy(true)
    try {
      await onSave(existing ? parsed.data : newBlock(parsed.data), scope)
      onClose()
    } catch (cause) {
      setError(String(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose()
        }}
      >
        <DialogContent
          className="block-dialog"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{existing ? 'Edit block' : 'Make room for what matters'}</DialogTitle>
            <DialogDescription>
              {existing
                ? 'Adjust the details of your time block.'
                : 'Give this part of your day a purpose.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="editor-form">
            {recurring ? (
              <div className="recurrence-scope">
                <Repeat2 size={16} />
                <Select
                  value={scope}
                  onValueChange={(value) => {
                    const next = value as Scope
                    setScope(next)
                    setDate(next === 'series' ? existing.date : selection.date)
                  }}
                >
                  <SelectTrigger aria-label="Edit scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="occurrence">This occurrence only</SelectItem>
                    <SelectItem value="series">Entire series</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="field">
              <Label htmlFor="block-title">Title</Label>
              <Input
                id="block-title"
                autoFocus
                placeholder="What are you making time for?"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <Label htmlFor="block-date">
                {scope === 'series' && recurring ? 'Series starts on' : 'Date'}
              </Label>
              <Input
                id="block-date"
                type="date"
                min="2000-01-01"
                max="2100-12-31"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="field-row">
              <div className="field">
                <Label htmlFor="block-start">Start</Label>
                <Input
                  id="block-start"
                  type="time"
                  step={900}
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <Label htmlFor="block-end">End</Label>
                <Input
                  id="block-end"
                  type="time"
                  step={900}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  required
                />
              </div>
            </div>
            {end === '00:00' ? (
              <p className="field-help">Ends at midnight at the end of this day.</p>
            ) : null}
            <div className="field">
              <Label htmlFor="block-category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="block-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {planner.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className={`category-dot ${c.color}`} />
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="field-row">
              <div className="field">
                <Label htmlFor="block-repeat">
                  <Repeat2 size={13} /> Repeat
                </Label>
                <Select
                  value={recurrence}
                  onValueChange={(value) => setRecurrence(value as Block['recurrence'])}
                  disabled={!!recurring && scope === 'occurrence'}
                >
                  <SelectTrigger id="block-repeat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Does not repeat</SelectItem>
                    <SelectItem value="daily">Every day</SelectItem>
                    <SelectItem value="weekdays">Every weekday</SelectItem>
                    <SelectItem value="weekly">Every week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="field">
                <Label htmlFor="block-reminder">
                  <Bell size={13} /> Reminder
                </Label>
                <Select value={reminder} onValueChange={setReminder}>
                  <SelectTrigger id="block-reminder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="0">At start time</SelectItem>
                    {[5, 10, 15, 30].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} minutes before
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {recurrence !== 'none' && (!recurring || scope === 'series') ? (
              <div className="field">
                <Label htmlFor="block-until">
                  Repeat through <span className="muted">(optional)</span>
                </Label>
                <Input
                  id="block-until"
                  type="date"
                  min={date}
                  max="2100-12-31"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                />
              </div>
            ) : null}
            {reminder !== 'none' && !planner.preferences.remindersEnabled ? (
              <p className="field-help">
                Turn on desktop reminders in Settings to receive this reminder.
              </p>
            ) : null}
            <div className="field">
              <Label htmlFor="block-notes">
                Notes <span className="muted">(optional)</span>
              </Label>
              <Textarea
                id="block-notes"
                value={notes}
                maxLength={5000}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="A little context for later…"
                rows={3}
              />
            </div>
            {overlaps.length ? (
              <p className="overlap-note">
                <AlertTriangle size={15} />
                Overlaps {overlaps.length} other {overlaps.length === 1 ? 'block' : 'blocks'} on
                this day. You can still save.
              </p>
            ) : null}
            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}
            <DialogFooter className="editor-footer">
              {existing ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="delete-button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy}
                >
                  <Trash2 size={15} /> Delete
                </Button>
              ) : (
                <span />
              )}
              <div>
                <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                  Cancel
                </Button>
                <Button type="submit" disabled={busy}>
                  {busy ? 'Saving…' : existing ? 'Save changes' : 'Create block'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={
          scope === 'series' && recurring ? 'Delete this entire series?' : 'Delete this block?'
        }
        description={
          scope === 'series' && recurring
            ? 'All occurrences in this series will be removed. Previously detached blocks will remain.'
            : 'This removes only the selected occurrence. Other recurring occurrences will remain.'
        }
        onConfirm={async () => {
          await onDelete(scope)
          onClose()
        }}
      />
    </>
  )
}
