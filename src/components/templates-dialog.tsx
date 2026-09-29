import { useState } from 'react'
import { LayoutTemplate, Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { applyTemplate, makeTemplate, occurrences } from '@/domain/planner'
import { addDays, type Planner, type Template } from '@/domain/model'
import { ConfirmDialog } from './confirm-dialog'

export function TemplatesDialog({
  planner,
  day,
  onClose,
  mutate,
  notify,
}: {
  planner: Planner
  day: string
  onClose: () => void
  mutate: (fn: (p: Planner) => Planner) => Promise<void>
  notify: (text: string) => void
}) {
  const [date, setDate] = useState(day)
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<Template | null>(null)
  const blocks = occurrences(planner.blocks, date, addDays(date, 1))
  async function perform(action: () => Promise<void>, message: string) {
    setBusy(true)
    setError('')
    try {
      await action()
      notify(message)
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
        <DialogContent className="templates-dialog">
          <DialogHeader>
            <DialogTitle>Good days, on repeat</DialogTitle>
            <DialogDescription>Save a day's rhythm, then make it your own.</DialogDescription>
          </DialogHeader>
          <div className="field">
            <Label htmlFor="template-date">Day to save or apply to</Label>
            <Input
              id="template-date"
              type="date"
              min="2000-01-01"
              max="2100-12-31"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <form
            className="template-save"
            onSubmit={(event) => {
              event.preventDefault()
              void perform(
                () =>
                  mutate((p) => ({
                    ...p,
                    templates: [...p.templates, makeTemplate(p, date, name)],
                  })),
                'Daily template saved.',
              ).then(() => setName(''))
            }}
          >
            <div className="field">
              <Label htmlFor="template-name">Save this day as a template</Label>
              <Input
                id="template-name"
                value={name}
                maxLength={60}
                placeholder="e.g. A focused workday"
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={busy || !blocks.length || !name.trim()}>
              <Plus size={15} />
              Save {blocks.length} {blocks.length === 1 ? 'block' : 'blocks'}
            </Button>
          </form>
          <div className="template-list">
            {planner.templates.length ? (
              planner.templates.map((template) => (
                <div className="template-row" key={template.id}>
                  <div className="template-icon">
                    <LayoutTemplate size={19} />
                  </div>
                  <div className="template-name">
                    <strong>{template.name}</strong>
                    <span>
                      {template.blocks.length} blocks ·{' '}
                      {Math.round(
                        (template.blocks.reduce((s, b) => s + b.endMinute - b.startMinute, 0) /
                          60) *
                          10,
                      ) / 10}{' '}
                      hours
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || !date}
                    onClick={() =>
                      void perform(
                        () => mutate((p) => applyTemplate(p, template, date)),
                        `${template.name} added to ${date}.`,
                      )
                    }
                  >
                    Apply
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete template ${template.name}`}
                    onClick={() => setDeleting(template)}
                    disabled={busy}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))
            ) : (
              <div className="template-empty">
                <LayoutTemplate size={28} />
                <strong>Your next great day starts here</strong>
                <p>Plan a day on the calendar, then save its blocks above.</p>
              </div>
            )}
          </div>
          <p className="field-help">
            Applying adds independent blocks to the chosen day. Existing blocks stay in place, so
            overlaps are possible.
          </p>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this template?"
        description="Blocks already created from this template will stay on your calendar."
        onConfirm={() =>
          mutate((p) => ({ ...p, templates: p.templates.filter((t) => t.id !== deleting?.id) }))
        }
      />
    </>
  )
}
