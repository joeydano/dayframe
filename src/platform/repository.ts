import { exportBackup } from '@/domain/planner'
import { isTauri, invoke } from '@tauri-apps/api/core'
import { emptyPlanner, MAX_BACKUP_BYTES, plannerSchema, type Planner } from '@/domain/model'

export const native = isTauri()
export const PREVIEW_KEY = 'dayframe.browser-preview.v1'
export interface PlannerRepository {
  load(): Promise<Planner>
  save(planner: Planner): Promise<void>
}

export const repository: PlannerRepository = {
  async load() {
    const raw = native
      ? await invoke<string | null>('load_planner')
      : localStorage.getItem(PREVIEW_KEY)
    if (!raw) return emptyPlanner()
    // Never overwrite corrupt or newer data with an empty planner.
    return plannerSchema.parse(JSON.parse(raw))
  },
  async save(planner) {
    const payload = JSON.stringify(plannerSchema.parse(planner))
    if (new TextEncoder().encode(exportBackup(planner)).length > MAX_BACKUP_BYTES)
      throw new Error(
        'Your planner exceeds the 5 MB limit. Export a backup before removing old blocks.',
      )
    if (native) await invoke('save_planner', { payload })
    else localStorage.setItem(PREVIEW_KEY, payload)
  },
}
