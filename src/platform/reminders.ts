import { invoke } from '@tauri-apps/api/core'
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'
import { native } from './repository'
import type { ReminderJob } from '@/domain/planner'

export async function enableNotifications(): Promise<boolean> {
  if (!native) return false
  if (await isPermissionGranted()) return true
  return (await requestPermission()) === 'granted'
}
export async function queueReminders(jobs: ReminderJob[]): Promise<void> {
  if (native) await invoke('replace_reminders', { jobs })
}
