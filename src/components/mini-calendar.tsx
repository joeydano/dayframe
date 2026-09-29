import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addDays, dateKey } from '@/domain/model'

export function MiniCalendar({
  selected,
  month,
  weekStartsOn,
  onMonth,
  onSelect,
}: {
  selected: string
  month: string
  weekStartsOn: 0 | 1
  onMonth: (day: string) => void
  onSelect: (day: string) => void
}) {
  const first = new Date(`${month.slice(0, 7)}-01T12:00:00`)
  const start = addDays(dateKey(first), -((first.getDay() - weekStartsOn + 7) % 7))
  const today = dateKey(new Date())
  const weekdays =
    weekStartsOn === 1 ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  function shift(amount: number) {
    const next = new Date(first)
    next.setMonth(next.getMonth() + amount)
    onMonth(dateKey(next))
  }
  return (
    <section className="mini-calendar" aria-label="Choose a date">
      <div className="mini-heading">
        <span>{first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => shift(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="mini-grid">
        {weekdays.map((d, i) => (
          <span key={i} className="mini-weekday">
            {d}
          </span>
        ))}
        {Array.from({ length: 42 }, (_, i) => {
          const day = addDays(start, i)
          return (
            <Button
              key={day}
              variant="ghost"
              size="icon-sm"
              className={`mini-date ${day.slice(0, 7) !== month.slice(0, 7) ? 'outside' : ''} ${day === today ? 'is-today' : ''} ${day === selected ? 'selected' : ''}`}
              aria-label={new Date(`${day}T12:00:00`).toLocaleDateString('en-US', {
                dateStyle: 'full',
              })}
              aria-pressed={day === selected}
              onClick={() => onSelect(day)}
            >
              {Number(day.slice(-2))}
            </Button>
          )
        })}
      </div>
    </section>
  )
}
