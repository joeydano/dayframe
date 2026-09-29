import { useCallback, useEffect, useRef, useState } from 'react'
import { plannerSchema, type Planner } from '@/domain/model'
import { repository } from '@/platform/repository'

export function usePlanner() {
  const [planner, setPlanner] = useState<Planner | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const current = useRef<Planner | null>(null)
  const tail = useRef<Promise<void>>(Promise.resolve())
  const pending = useRef(0)
  useEffect(() => {
    let alive = true
    repository
      .load()
      .then((data) => {
        if (alive) {
          current.current = data
          setPlanner(data)
        }
      })
      .catch((cause) => {
        if (alive)
          setError(
            `Could not open your planner. Your saved data has not been changed. ${String(cause)}`,
          )
      })
    return () => {
      alive = false
    }
  }, [])

  const mutate = useCallback((change: (latest: Planner) => Planner): Promise<void> => {
    pending.current++
    setBusy(true)
    // Serialize changes and compute against the last successful write, never a stale render.
    const next = tail.current.then(async () => {
      if (!current.current) throw new Error('The planner has not loaded yet.')
      const updated = plannerSchema.parse(change(current.current))
      await repository.save(updated)
      current.current = updated
      setPlanner(updated)
      setError(null)
    })
    tail.current = next.catch(() => {})
    return next
      .catch((cause) => {
        setError(`Your change could not be saved. ${String(cause)}`)
        throw cause
      })
      .finally(() => {
        pending.current--
        setBusy(pending.current > 0)
      })
  }, [])
  return { planner, mutate, error, busy }
}
