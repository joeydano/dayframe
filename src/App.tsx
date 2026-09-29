import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventChangeArg } from '@fullcalendar/core'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Settings2,
  LayoutTemplate,
  Check,
  Circle,
  Repeat2,
  Clock3,
  ArrowUpRight,
  X,
  AlertCircle,
} from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { BlockEditor, type EditorSelection } from '@/components/block-editor'
import { MiniCalendar } from '@/components/mini-calendar'
import { TemplatesDialog } from '@/components/templates-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import { usePlanner } from '@/hooks/use-planner'
import { addDays, dateKey, friendlyTime, localDateTime, type Occurrence } from '@/domain/model'
import { editOccurrence, occurrences, reminderJobs, removeOccurrence } from '@/domain/planner'
import { native } from '@/platform/repository'
import { queueReminders } from '@/platform/reminders'

function App() {
  const { planner, mutate, busy, error } = usePlanner()
  const calendar = useRef<FullCalendar>(null)
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()))
  const [month, setMonth] = useState(selectedDay)
  const [range, setRange] = useState({ start: selectedDay, end: addDays(selectedDay, 7) })
  const [title, setTitle] = useState('')
  const [view, setView] = useState('timeGridWeek')
  const [editor, setEditor] = useState<EditorSelection | null>(null)
  const [panel, setPanel] = useState<'templates' | 'settings' | 'categories' | null>(null)
  const [hidden, setHidden] = useState<string[]>([])
  const [notice, setNotice] = useState('')
  const [reminderError, setReminderError] = useState('')
  const [now, setNow] = useState(() => new Date())
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const notify = useCallback((message: string) => {
    setNotice(message)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(''), 5500)
  }, [])
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000)
    return () => {
      clearInterval(timer)
      clearTimeout(noticeTimer.current)
    }
  }, [])
  useEffect(() => {
    if (!planner) return
    const theme = planner.preferences.theme
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () =>
      document.documentElement.classList.toggle(
        'dark',
        theme === 'dark' || (theme === 'system' && media.matches),
      )
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [planner?.preferences.theme, planner])
  useEffect(() => {
    if (!planner || !native) return
    let alive = true
    const refresh = async () => {
      try {
        await queueReminders(reminderJobs(planner))
        const status = await invoke<{ lastError: string | null }>('reminder_status')
        if (alive) setReminderError(status.lastError ?? '')
      } catch (cause) {
        if (alive) setReminderError(String(cause))
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 60000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [planner])

  const visible = useMemo(
    () =>
      planner
        ? occurrences(planner.blocks, range.start, range.end).filter(
            (o) => !hidden.includes(o.categoryId),
          )
        : [],
    [planner, range, hidden],
  )
  const selectedOccurrences = planner
    ? occurrences(planner.blocks, selectedDay, addDays(selectedDay, 1))
    : []
  const todayOccurrences = planner
    ? occurrences(planner.blocks, dateKey(now), addDays(dateKey(now), 1))
    : []
  const currentBlock = todayOccurrences.find(
    (b) =>
      b.startMinute <= now.getHours() * 60 + now.getMinutes() &&
      b.endMinute > now.getHours() * 60 + now.getMinutes(),
  )
  const nextBlock = todayOccurrences.find(
    (b) => b.startMinute > now.getHours() * 60 + now.getMinutes(),
  )

  function goTo(day: string) {
    setSelectedDay(day)
    setMonth(day)
    calendar.current?.getApi().gotoDate(day)
  }
  function navigate(direction: 'prev' | 'next') {
    const api = calendar.current?.getApi()
    if (!api) return
    api[direction]()
    const day = dateKey(api.getDate())
    setSelectedDay(day)
    setMonth(day)
  }
  function openOccurrence(occurrence: Occurrence) {
    setEditor({
      date: occurrence.occurrenceDate,
      startMinute: occurrence.startMinute,
      endMinute: occurrence.endMinute,
      occurrence,
    })
  }
  function newSelection(start: Date, end: Date) {
    const minute = start.getHours() * 60 + start.getMinutes()
    const endMinute =
      dateKey(start) !== dateKey(end) ? 1440 : end.getHours() * 60 + end.getMinutes()
    setSelectedDay(dateKey(start))
    setEditor({
      date: dateKey(start),
      startMinute: minute,
      endMinute: Math.min(1440, Math.max(endMinute, minute + 15)),
    })
    calendar.current?.getApi().unselect()
  }
  async function changeEvent(info: EventChangeArg) {
    const original = info.oldEvent.extendedProps.occurrence as Occurrence
    if (!info.event.start || !info.event.end) {
      info.revert()
      return
    }
    const start = info.event.start,
      end = info.event.end
    const date = dateKey(start)
    const startMinute = start.getHours() * 60 + start.getMinutes()
    const endMinute = dateKey(end) !== date ? 1440 : end.getHours() * 60 + end.getMinutes()
    try {
      await mutate((p) =>
        editOccurrence(p, original, { ...original, date, startMinute, endMinute }, 'occurrence'),
      )
      notify(
        original.recurrence === 'none'
          ? 'Block updated.'
          : 'This occurrence updated. The rest of the series stays in place.',
      )
    } catch {
      info.revert()
    }
  }

  if (!planner)
    return (
      <div className="loading-screen">
        <img src="/dayframe.svg" alt="" />
        <h1>Dayframe</h1>
        {error ? (
          <>
            <p role="alert">{error}</p>
            <Button onClick={() => window.location.reload()}>Try again</Button>
          </>
        ) : (
          <p>Opening your day…</p>
        )}
      </div>
    )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/dayframe.svg" alt="" />
          <span>
            dayframe<span className="brand-dot">.</span>
          </span>
        </div>
        <Button
          className="sidebar-new"
          onClick={() => setEditor({ date: selectedDay, startMinute: 540, endMinute: 600 })}
        >
          <Plus size={17} /> New block
        </Button>
        <div className="nav-item">
          <CalendarDays size={18} />
          <span>My calendar</span>
          <span className="nav-indicator" />
        </div>
        <MiniCalendar
          selected={selectedDay}
          month={month}
          weekStartsOn={planner.preferences.weekStartsOn}
          onMonth={setMonth}
          onSelect={goTo}
        />
        <section className="category-section">
          <div className="section-label">
            MY CATEGORIES
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Manage categories"
              onClick={() => setPanel('categories')}
            >
              <Settings2 size={13} />
            </Button>
          </div>
          {planner.categories.map((category) => (
            <Button
              key={category.id}
              variant="ghost"
              className="category-toggle"
              aria-pressed={!hidden.includes(category.id)}
              onClick={() =>
                setHidden((previous) =>
                  previous.includes(category.id)
                    ? previous.filter((id) => id !== category.id)
                    : [...previous, category.id],
                )
              }
            >
              <span
                className={`category-check ${category.color} ${hidden.includes(category.id) ? 'unchecked' : ''}`}
              >
                {hidden.includes(category.id) ? null : <Check size={11} />}
              </span>
              {category.name}
            </Button>
          ))}
        </section>
        <Button variant="ghost" className="templates-nav" onClick={() => setPanel('templates')}>
          <LayoutTemplate size={17} />
          <span>Daily templates</span>
          <span className="count-pill">{planner.templates.length}</span>
        </Button>
        <div className="sidebar-bottom">
          <div className="local-label">
            <span className="status-dot" />
            {native ? 'On this device' : 'Browser preview'}
            <span className="version-label">v0.1</span>
          </div>
          <Button variant="ghost" className="settings-nav" onClick={() => setPanel('settings')}>
            <Settings2 size={17} /> Settings & backups
          </Button>
        </div>
      </aside>
      <main className="workspace">
        <header className="workspace-heading">
          <h1>Your calendar</h1>
          <div className="save-state" aria-live="polite">
            {error ? (
              <>
                <AlertCircle size={14} /> Change not saved
              </>
            ) : busy ? (
              <>
                <Circle size={13} /> Saving…
              </>
            ) : (
              <>
                <Check size={14} /> All changes saved
              </>
            )}
          </div>
        </header>
        {error || reminderError ? (
          <div className="error-banner" role="alert">
            <AlertCircle size={17} />
            {error || `Reminders need attention: ${reminderError}`}
          </div>
        ) : null}
        <div className="calendar-toolbar">
          <div className="calendar-navigation">
            <Button variant="outline" size="sm" onClick={() => goTo(dateKey(new Date()))}>
              Today
            </Button>
            <div className="period-arrows">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous period"
                onClick={() => navigate('prev')}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next period"
                onClick={() => navigate('next')}
              >
                <ChevronRight />
              </Button>
            </div>
            <h2>{title}</h2>
          </div>
          <div className="view-switch" aria-label="Calendar view">
            {[
              ['timeGridDay', 'Day'],
              ['timeGridWeek', 'Week'],
            ].map(([id, label]) => (
              <Button
                key={id}
                variant="ghost"
                size="sm"
                aria-pressed={view === id}
                onClick={() => {
                  setView(id)
                  calendar.current?.getApi().changeView(id, selectedDay)
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        <div className="calendar-meta">
          <span>{Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ')}</span>
          <span>
            <span className="tiny-line" />
            Click or drag to create a block · 15-minute intervals
          </span>
        </div>
        <div className={`calendar-container ${view === 'timeGridDay' ? 'day-view' : ''}`}>
          <FullCalendar
            ref={calendar}
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            initialDate={selectedDay}
            headerToolbar={false}
            firstDay={planner.preferences.weekStartsOn}
            allDaySlot={false}
            nowIndicator
            height="100%"
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            scrollTime="07:00:00"
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            slotLabelInterval="01:00"
            slotLabelFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
            eventTimeFormat={{ hour: 'numeric', minute: '2-digit', hour12: true }}
            selectable
            selectMirror
            editable={!busy}
            eventResizableFromStart
            eventMinHeight={24}
            eventShortHeight={44}
            eventDisplay="block"
            eventOverlap
            slotEventOverlap={false}
            selectOverlap
            selectLongPressDelay={250}
            datesSet={(info) => {
              setRange({ start: dateKey(info.start), end: dateKey(info.end) })
              setTitle(info.view.title)
            }}
            dayHeaderContent={(info) => (
              <div className={`day-heading ${dateKey(info.date) === dateKey(now) ? 'today' : ''}`}>
                <span>{info.date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span>{info.date.getDate()}</span>
              </div>
            )}
            events={visible.map((o) => {
              const category = planner.categories.find((c) => c.id === o.categoryId)!
              return {
                id: o.occurrenceId,
                title: o.title,
                start: localDateTime(o.occurrenceDate, o.startMinute),
                end: localDateTime(o.occurrenceDate, o.endMinute),
                backgroundColor: `var(--cat-${category.color}-bg)`,
                borderColor: `var(--cat-${category.color})`,
                textColor: `var(--cat-${category.color}-text)`,
                extendedProps: { occurrence: o },
                classNames: [`event-${category.color}`],
              }
            })}
            eventContent={(info) => (
              <div className="block-content">
                <div className="block-name">
                  {info.event.title}
                  {info.event.extendedProps.occurrence &&
                  info.event.extendedProps.occurrence.recurrence !== 'none' ? (
                    <Repeat2 size={11} />
                  ) : null}
                </div>
                <div className="block-time">{info.timeText}</div>
              </div>
            )}
            eventDidMount={(info) => {
              info.el.setAttribute('aria-label', `${info.event.title}, ${info.timeText}`)
              info.el.setAttribute('data-block-id', info.event.id)
              info.el.setAttribute('tabindex', '0')
            }}
            eventClick={(info) => openOccurrence(info.event.extendedProps.occurrence as Occurrence)}
            select={(info) => newSelection(info.start, info.end)}
            selectAllow={(info) =>
              dateKey(info.start) === dateKey(new Date(info.end.valueOf() - 1))
            }
            eventAllow={(info) => dateKey(info.start) === dateKey(new Date(info.end.valueOf() - 1))}
            eventChange={(info) => void changeEvent(info)}
          />
          {planner.blocks.length === 0 ? (
            <div className="calendar-welcome">
              <div className="welcome-symbol">
                <CalendarDays size={24} />
              </div>
              <strong>A fresh page for your day</strong>
              <p>Click a time on the calendar, or drag to make a little room.</p>
              <Button
                size="sm"
                onClick={() => setEditor({ date: selectedDay, startMinute: 540, endMinute: 600 })}
              >
                <Plus size={14} /> Create your first block
              </Button>
            </div>
          ) : null}
        </div>
        <footer className="day-summary">
          <div>
            <span className="summary-icon">
              <Clock3 size={16} />
            </span>
            <strong>
              {selectedDay === dateKey(now)
                ? 'Today'
                : new Date(`${selectedDay}T12:00:00`).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
            </strong>
            <span>
              {selectedOccurrences.length} {selectedOccurrences.length === 1 ? 'block' : 'blocks'}
            </span>
            <span className="summary-divider" />
            <span>
              {Number(
                (
                  selectedOccurrences.reduce((s, b) => s + b.endMinute - b.startMinute, 0) / 60
                ).toFixed(1),
              )}
              h scheduled
            </span>
          </div>
          {currentBlock || nextBlock ? (
            <Button
              variant="ghost"
              size="sm"
              className="next-block"
              onClick={() => openOccurrence((currentBlock ?? nextBlock)!)}
            >
              <span className="status-dot" />
              {currentBlock ? 'Now' : `Up next at ${friendlyTime(nextBlock!.startMinute)}`}
              <strong>{(currentBlock ?? nextBlock)!.title}</strong>
              <ArrowUpRight size={13} />
            </Button>
          ) : null}
        </footer>
      </main>
      {editor ? (
        <BlockEditor
          key={`${editor.occurrence?.occurrenceId ?? 'new'}:${editor.date}:${editor.startMinute}`}
          selection={editor}
          planner={planner}
          onClose={() => setEditor(null)}
          onSave={async (block, scope) => {
            await mutate((p) =>
              editor.occurrence
                ? editOccurrence(p, editor.occurrence, block, scope)
                : { ...p, blocks: [...p.blocks, block] },
            )
            notify(editor.occurrence ? 'Block updated.' : 'A little time, well planned.')
          }}
          onDelete={async (scope) => {
            if (editor.occurrence)
              await mutate((p) => removeOccurrence(p, editor.occurrence!, scope))
            notify('Block deleted.')
          }}
        />
      ) : null}
      {panel === 'templates' ? (
        <TemplatesDialog
          planner={planner}
          day={selectedDay}
          mutate={mutate}
          onClose={() => setPanel(null)}
          notify={notify}
        />
      ) : null}
      {panel === 'settings' || panel === 'categories' ? (
        <SettingsDialog
          initialTab={panel === 'categories' ? 'categories' : 'general'}
          planner={planner}
          mutate={mutate}
          onClose={() => setPanel(null)}
          notify={notify}
        />
      ) : null}
      {notice ? (
        <div className="toast" role="status">
          <span className="toast-check">
            <Check size={14} />
          </span>
          {notice}
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss message"
            onClick={() => setNotice('')}
          >
            <X size={14} />
          </Button>
        </div>
      ) : null}
    </div>
  )
}
export default App
