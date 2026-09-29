import { dateKey, MAX_BACKUP_BYTES, type Planner } from '@/domain/model'
import { exportBackup } from '@/domain/planner'
import { native } from './repository'

export async function saveBackup(planner: Planner): Promise<boolean> {
  const text = exportBackup(planner)
  const filename = `dayframe-${dateKey(new Date())}.json`
  if (native) {
    const [{ save }, { writeTextFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ])
    const path = await save({
      defaultPath: filename,
      filters: [{ name: 'Dayframe backup', extensions: ['json'] }],
    })
    if (!path) return false
    await writeTextFile(path, text)
  } else {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return true
}

export async function readNativeBackup(): Promise<string | null> {
  const [{ open }, { readTextFile, stat }] = await Promise.all([
    import('@tauri-apps/plugin-dialog'),
    import('@tauri-apps/plugin-fs'),
  ])
  const path = await open({
    multiple: false,
    filters: [{ name: 'Dayframe backup', extensions: ['json'] }],
  })
  if (!path) return null
  if ((await stat(path)).size > MAX_BACKUP_BYTES)
    throw new Error('Backup is too large. The limit is 5 MB.')
  return readTextFile(path)
}
