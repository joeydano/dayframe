// Linux integration test: bundled webview -> Tauri commands -> SQLite -> restart.
// Uses an isolated XDG_DATA_HOME. Never opens the owner's real planner database.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { setTimeout as delay } from 'node:timers/promises'

const root = resolve(import.meta.dirname, '..')
await mkdir(resolve(root, 'work'), { recursive: true })
const dataDirectory = await mkdtemp(resolve(root, 'work/native-test-'))
const testIdentifier = 'com.joeydano.dayframe.native-test'
const databasePath = resolve(dataDirectory, testIdentifier, 'dayframe.db')
const invalidMode = process.argv.includes('--invalid-legacy')
const legacyMode = process.argv.includes('--legacy') || invalidMode
const fixtureText = invalidMode
  ? 'invalid JSON'
  : await readFile(resolve(root, 'tests/fixtures/planner-v1.json'), 'utf8')
if (legacyMode) {
  await mkdir(resolve(dataDirectory, testIdentifier), { recursive: true })
  const database = new DatabaseSync(databasePath)
  database.exec(
    'CREATE TABLE planner(id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL); PRAGMA user_version=1;',
  )
  database.prepare('INSERT INTO planner VALUES(1, ?)').run(fixtureText)
  database.close()
}
const driver = spawn(
  process.env.TAURI_DRIVER ?? 'tauri-driver',
  ['--port', '4446', '--native-port', '4447'],
  {
    env: { ...process.env, XDG_DATA_HOME: dataDirectory },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
)
let driverError
driver.on('error', (error) => {
  driverError = error
})
driver.stderr.on('data', (data) => process.stderr.write(data))
let session
const base = 'http://127.0.0.1:4446'
async function call(route, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  })
  const result = await response.json()
  if (!response.ok || result.value?.error) throw new Error(JSON.stringify(result))
  return result.value
}
async function waitFor(check, label, timeout = 20000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (driverError) throw driverError
    try {
      const result = await check()
      if (result) return result
    } catch (error) {
      if (Date.now() + 200 >= deadline) throw error
    }
    await delay(150)
  }
  throw new Error(`Timed out: ${label}`)
}
async function script(source, args = []) {
  return call(`/session/${session}/execute/sync`, { script: source, args })
}
async function invoke(command, args = {}) {
  const result = await call(`/session/${session}/execute/async`, {
    script:
      'const done = arguments[arguments.length - 1]; window.__TAURI_INTERNALS__.invoke(arguments[0], arguments[1]).then(value => done({value})).catch(error => done({error:String(error)}))',
    args: [command, args],
  })
  if (result.error) throw new Error(result.error)
  return result.value
}
async function openApp() {
  const result = await call('/session', {
    capabilities: {
      alwaysMatch: {
        'tauri:options': {
          application:
            process.env.DAYFRAME_BINARY ?? resolve(root, 'src-tauri/target/debug/dayframe'),
        },
      },
    },
  })
  session = result.sessionId
  await waitFor(
    () =>
      script(
        `return document.body.innerText.includes(${JSON.stringify(invalidMode ? 'Could not open your planner' : 'Your calendar')})`,
      ),
    'native UI',
  )
  assert.equal(await script('return !!window.__TAURI_INTERNALS__'), true)
}
try {
  await waitFor(async () => (await fetch(`${base}/status`)).ok, 'tauri-driver startup')
  await openApp()
  if (invalidMode) {
    const database = new DatabaseSync(databasePath, { readOnly: true })
    try {
      assert.equal(database.prepare('PRAGMA user_version').get().user_version, 1)
      assert.equal(
        database.prepare('SELECT payload FROM planner WHERE id=1').get().payload,
        fixtureText,
      )
    } finally {
      database.close()
    }
    await assert.rejects(() => invoke('load_planner'))
    console.log('PASS: invalid legacy data produces a visible error and is not changed.')
  } else {
    if (legacyMode) {
      assert.deepEqual(JSON.parse(await invoke('load_planner')), JSON.parse(fixtureText))
    } else {
      assert.equal(await invoke('load_planner'), null)
    }
    await script('document.querySelector(".sidebar-new").click()')
    const input = await waitFor(
      () => call(`/session/${session}/element`, { using: 'css selector', value: '#block-title' }),
      'editor',
    )
    const elementId = input['element-6066-11e4-a52e-4f735466cecf']
    await call(`/session/${session}/element/${elementId}/value`, {
      text: 'Native persistence check',
    })
    await script('document.querySelector(".editor-form").requestSubmit()')
    const saved = await waitFor(async () => {
      const raw = await invoke('load_planner')
      const data = raw ? JSON.parse(raw) : null
      return data?.blocks.some((block) => block.title === 'Native persistence check') ? data : null
    }, 'SQLite save')
    assert.ok(saved.blocks.some((block) => block.title === 'Native persistence check'))
    await call(`/session/${session}`, undefined, 'DELETE')
    session = undefined
    await openApp()
    assert.ok(
      JSON.parse(await invoke('load_planner')).blocks.some(
        (block) => block.title === 'Native persistence check',
      ),
    )
    assert.equal(
      await script('return document.body.innerText.includes("Native persistence check")'),
      true,
    )
    await assert.rejects(
      () => invoke('plugin:fs|read_text_file', { path: '/etc/hostname' }),
      /not allowed|forbidden|scope/i,
    )

    // Test a single native notification. This checks OS acceptance, not DND visibility.
    await invoke('replace_reminders', {
      jobs: [
        {
          id: 'native-smoke-test',
          at: Math.floor(Date.now() / 1000),
          title: 'Dayframe reminder check',
          body: 'Native reminder delivery is working.',
        },
      ],
    })
    await waitFor(
      async () => {
        const status = await invoke('reminder_status')
        if (status.lastError) throw new Error(status.lastError)
        return status.delivered === 1
      },
      'OS notification delivery',
      25000,
    )
    const database = new DatabaseSync(databasePath, { readOnly: true })
    try {
      assert.equal(database.prepare('PRAGMA user_version').get().user_version, 2)
      assert.equal(
        database
          .prepare(
            "SELECT COUNT(*) AS count FROM planner_entities WHERE kind='blocks' AND deleted=0",
          )
          .get().count,
        legacyMode ? 2 : 1,
      )
      if (legacyMode) {
        assert.equal(
          database.prepare('SELECT payload FROM planner_v1_backup WHERE id=1').get().payload,
          fixtureText,
        )
      }
    } finally {
      database.close()
    }
    console.log(
      `PASS: ${legacyMode ? 'v1 migration/snapshot, ' : ''}native UI creation, entity storage, restart/reload, file scope enforcement, and OS notification acceptance.`,
    )
    console.log(`Test data: ${dataDirectory}`)
  }
} finally {
  if (session) await call(`/session/${session}`, undefined, 'DELETE').catch(() => {})
  driver.kill('SIGTERM')
}
