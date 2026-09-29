# Development

## Architecture

```text
React UI + shadcn/ui + FullCalendar
                 |
       Pure TypeScript domain
       (recurrence, validation, backups)
                 |
       PlannerRepository adapter
           /             \
  Tauri commands       Browser preview
       |               localStorage
  Rust + SQLite
       |
  Native reminder queue -> OS notifications
```

The browser adapter is only a development/testing convenience. The desktop app always uses SQLite. Reads and writes fail visibly; loading corrupt data never resets it to an empty planner. Writes are serialized and UI success is shown only after persistence succeeds.

## Directory map

| Location             | Purpose                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `src/domain/`        | Data schemas, recurrence expansion, templates, backup format, reminder calculation, tests |
| `src/platform/`      | Tauri/browser storage boundary, native reminders and file dialogs                         |
| `src/components/`    | Calendar editors, settings, templates, date navigation                                    |
| `src/components/ui/` | Owned shadcn/ui primitive source                                                          |
| `src/hooks/`         | Serialized persistent planner state                                                       |
| `src-tauri/`         | Rust backend, capabilities, desktop configuration, icons                                  |
| `tests/`             | Browser user-flow tests and isolated Fedora native smoke test                             |
| `docs/adr/`          | Numbered architecture decisions                                                           |
| `.github/workflows/` | CI checks; no deployment or publishing                                                    |

## Native development

Use the Fedora prerequisite command in the root README. `npm run desktop` runs Vite and the Tauri shell together. `npm run desktop:build` creates an optimized RPM. The first Rust build downloads and compiles the native dependencies and takes longer than subsequent builds.

SQLite is stored at `$XDG_DATA_HOME/com.joeydano.dayframe/dayframe.db`, or `~/.local/share/com.joeydano.dayframe/dayframe.db` when `XDG_DATA_HOME` is unset. Use app export for a portable backup; copying only a live `.db` file can miss SQLite WAL data.

The database stores one versioned JSON document, updated in a single atomic statement. Rust owns the connection; the frontend cannot run arbitrary SQL. Domain and backup validation live in TypeScript; the native write boundary also enforces JSON, schema version, document shape, and size. See ADR 001 for the deliberate tradeoff and future migration to synchronization.

## Testing

- `npm run check`: ESLint, domain tests, TypeScript, and production frontend build.
- `npm run test:e2e`: isolated Chromium browser flows; install with `npx playwright install chromium` first.
- `cargo test --locked --manifest-path src-tauri/Cargo.toml`: SQLite and native reminder-queue tests.
- `npm run format`: format frontend, tests, config, and docs.

Vitest pins `America/New_York` in its configuration so DST tests behave consistently on every workstation, including when the shell uses UTC. Browser tests also use this timezone and default to two workers to avoid browser startup timeouts on constrained machines.

On Fedora, an additional native integration test exercises the actual bundled WebKitGTK app:

```bash
cargo install tauri-driver --locked
npx tauri build --debug --no-bundle
npm run test:native
```

`WebKitWebDriver` must be available (provided with this workstation's WebKitGTK packages). Run in a graphical session with Dayframe closed. The test starts its own driver on ports 4446/4447, uses a new `work/native-test-*` data directory, and sends one local test notification. `TAURI_DRIVER` and `DAYFRAME_BINARY` can point to alternative driver/app binaries. No test writes to your normal planner.

The native test verifies OS acceptance of a notification; Do Not Disturb can still suppress its visible banner. Native file picker interaction is a manual check; browser backup flows and native filesystem scope enforcement are tested separately.

## Future platforms

The frontend is static Vite output. It needs no Node server at runtime. Next.js would add static-export constraints without a benefit here. A later sync API can run separately and use the same domain contracts.

macOS/iOS are not verified targets yet. iOS needs a macOS/Xcode build environment, signing, touch layouts, notification lifecycle design, and a separate widget implementation. Do not interpret shared Tauri support as a finished mobile app.
