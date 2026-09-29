import { useRef, useState } from 'react'
import { Download, Upload, Palette, Bell, HardDrive } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MAX_BACKUP_BYTES, type Category, type Planner } from '@/domain/model'
import { importBackup } from '@/domain/planner'
import { native } from '@/platform/repository'
import { readNativeBackup, saveBackup } from '@/platform/backups'
import { enableNotifications } from '@/platform/reminders'
import { ConfirmDialog } from './confirm-dialog'

export function SettingsDialog({
  planner,
  mutate,
  onClose,
  notify,
  initialTab = 'general',
}: {
  planner: Planner
  initialTab?: 'general' | 'categories'
  mutate: (fn: (p: Planner) => Planner) => Promise<void>
  onClose: () => void
  notify: (text: string) => void
}) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [pendingImport, setPendingImport] = useState<Planner | null>(null)
  const [categories, setCategories] = useState(planner.categories)
  const file = useRef<HTMLInputElement>(null)
  async function perform(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (cause) {
      setError(String(cause))
    } finally {
      setBusy(false)
    }
  }
  async function exportCurrent() {
    if (await saveBackup(planner)) notify('Backup exported.')
  }
  function patchCategory(id: string, patch: Partial<Category>) {
    setCategories((previous) => previous.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !busy) onClose()
        }}
      >
        <DialogContent className="settings-dialog">
          <DialogHeader>
            <DialogTitle>Make yourself at home</DialogTitle>
            <DialogDescription>Your preferences, your calendar, your data.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue={initialTab}>
            <TabsList className="settings-tabs">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="categories">Categories</TabsTrigger>
              <TabsTrigger value="backups">Backups</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="settings-content">
              <div className="setting-row">
                <div>
                  <Label htmlFor="theme">
                    <Palette size={17} /> Appearance
                  </Label>
                  <p>Choose the light that suits you.</p>
                </div>
                <Select
                  value={planner.preferences.theme}
                  disabled={busy}
                  onValueChange={(theme) =>
                    void perform(() =>
                      mutate((p) => ({
                        ...p,
                        preferences: {
                          ...p.preferences,
                          theme: theme as Planner['preferences']['theme'],
                        },
                      })),
                    )
                  }
                >
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="setting-row">
                <div>
                  <Label htmlFor="week-start">Week starts on</Label>
                  <p>A small change to your point of view.</p>
                </div>
                <Select
                  value={String(planner.preferences.weekStartsOn)}
                  disabled={busy}
                  onValueChange={(value) =>
                    void perform(() =>
                      mutate((p) => ({
                        ...p,
                        preferences: { ...p.preferences, weekStartsOn: Number(value) as 0 | 1 },
                      })),
                    )
                  }
                >
                  <SelectTrigger id="week-start">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="0">Sunday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="setting-row">
                <div>
                  <Label htmlFor="reminders">
                    <Bell size={17} /> Desktop reminders
                  </Label>
                  <p>
                    {native
                      ? 'A gentle nudge before your next block.'
                      : 'Available in the native desktop app.'}
                  </p>
                </div>
                <Switch
                  id="reminders"
                  checked={planner.preferences.remindersEnabled}
                  disabled={busy || !native}
                  onCheckedChange={(enabled) =>
                    void perform(async () => {
                      if (enabled && !(await enableNotifications()))
                        throw new Error(
                          'Notifications were not allowed. Check your desktop notification permissions.',
                        )
                      await mutate((p) => ({
                        ...p,
                        preferences: { ...p.preferences, remindersEnabled: enabled },
                      }))
                    })
                  }
                />
              </div>
              <div className="settings-note">
                <Bell size={17} />
                <p>
                  Keep Dayframe open or minimized for reminders. Closing the window stops them. Your
                  desktop's Do Not Disturb setting still applies.
                </p>
              </div>
              <p className="field-help">
                Times follow this workstation's time zone:{' '}
                {Intl.DateTimeFormat().resolvedOptions().timeZone}.
              </p>
            </TabsContent>
            <TabsContent value="categories" className="settings-content">
              <p className="field-help">
                Give your five categories names and colors that fit your day.
              </p>
              <div className="category-edit-list">
                {categories.map((category) => (
                  <div key={category.id} className="category-edit-row">
                    <Input
                      aria-label={`Name for ${category.name}`}
                      value={category.name}
                      maxLength={40}
                      onChange={(e) => patchCategory(category.id, { name: e.target.value })}
                    />
                    <Select
                      value={category.color}
                      onValueChange={(color) =>
                        patchCategory(category.id, { color: color as Category['color'] })
                      }
                    >
                      <SelectTrigger aria-label={`Color for ${category.name}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['iris', 'blue', 'sage', 'amber', 'rose'] as const).map((color) => (
                          <SelectItem key={color} value={color}>
                            <span className={`category-dot ${color}`} />
                            {color[0].toUpperCase() + color.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <Button
                disabled={busy || categories.some((c) => !c.name.trim())}
                onClick={() =>
                  void perform(async () => {
                    await mutate((p) => ({ ...p, categories }))
                    notify('Categories updated.')
                  })
                }
              >
                Save categories
              </Button>
            </TabsContent>
            <TabsContent value="backups" className="settings-content">
              <div className="backup-summary">
                <HardDrive size={25} />
                <div>
                  <strong>Your calendar stays with you</strong>
                  <p>
                    {planner.blocks.length} blocks / series · {planner.templates.length} templates
                  </p>
                </div>
              </div>
              <p className="field-help">
                Export a JSON backup you can keep anywhere. It contains your blocks, notes,
                categories, templates, and preferences.
              </p>
              <Button variant="outline" disabled={busy} onClick={() => void perform(exportCurrent)}>
                <Download size={16} /> Export backup
              </Button>
              <div className="restore-section">
                <strong>Restore a backup</strong>
                <p>
                  Restoring replaces this planner. Export your current data first if you want to
                  keep it.
                </p>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (native)
                      void perform(async () => {
                        const text = await readNativeBackup()
                        if (text) setPendingImport(importBackup(text))
                      })
                    else file.current?.click()
                  }}
                >
                  <Upload size={16} /> Choose backup
                </Button>
                <Input
                  ref={file}
                  className="sr-only"
                  type="file"
                  accept=".json,application/json"
                  aria-label="Import backup file"
                  onChange={(event) => {
                    const chosen = event.target.files?.[0]
                    event.target.value = ''
                    if (chosen)
                      void perform(async () => {
                        if (chosen.size > MAX_BACKUP_BYTES)
                          throw new Error('Backup is too large. The limit is 5 MB.')
                        setPendingImport(importBackup(await chosen.text()))
                      })
                  }}
                />
              </div>
              <p className="field-help">
                {native
                  ? 'Stored locally in your application-data directory using SQLite.'
                  : 'Browser preview uses separate browser storage. Export to transfer data to the native app.'}
              </p>
            </TabsContent>
          </Tabs>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!pendingImport}
        onClose={() => setPendingImport(null)}
        title="Replace your current planner?"
        description={`This backup contains ${pendingImport?.blocks.length ?? 0} blocks / series and ${pendingImport?.templates.length ?? 0} templates. Your existing planner will be replaced. Cancel and export first if you need a copy.`}
        action="Restore backup"
        onConfirm={async () => {
          if (pendingImport) {
            await mutate(() => pendingImport)
            notify('Backup restored.')
            onClose()
          }
        }}
      />
    </>
  )
}
