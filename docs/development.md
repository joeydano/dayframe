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

Install Node.js 24 or newer, then install the Fedora native prerequisites:

```bash
sudo dnf install -y rust cargo gcc gcc-c++ make pkgconf-pkg-config \
  webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel librsvg2-devel patchelf
```

From the repository root:

```bash
npm ci
npm run desktop
```

`npm run desktop` runs Vite and the Tauri shell together. `npm run desktop:build` creates an optimized RPM in `src-tauri/target/release/bundle/rpm/`; see [installation](installation.md) to launch it from the desktop app menu. The first Rust build downloads and compiles the native dependencies and takes longer than subsequent builds.

For UI development, `npm run dev` serves a browser preview at `http://127.0.0.1:1420`. The preview uses separate localStorage, cannot read native SQLite data, and does not deliver native reminders. Export/import a backup to move data between the two.

SQLite is stored at `$XDG_DATA_HOME/com.joeydano.dayframe/dayframe.db`, or `~/.local/share/com.joeydano.dayframe/dayframe.db` when `XDG_DATA_HOME` is unset. Use app export for a portable backup; copying only a live `.db` file can miss SQLite WAL data.

The 0.2 branch uses SQLite schema version 2. Blocks, categories, and templates are separate ordered JSON records; preferences/document fields are stored in `planner_state`. A single transaction applies each logical save or restore. Unchanged records retain their local revision; deletion markers keep identity/revision without active record content. These are local records, not a cloud sync protocol. Rust owns the connection and the frontend cannot run arbitrary SQL. TypeScript retains full domain validation; native storage checks sizes, document shape, entity IDs/counts, and category references.

Opening a version 1 database migrates it transactionally and retains its original table as `planner_v1_backup`. That snapshot remains in the same database, so export an external JSON backup before trying a development build. The JSON planner/backup formats remain version 1 and preserve existing date/time behavior. Old app binaries reject SQLite schema version 2. Restoring an exported backup into a separate old-version data directory is safer than attempting to downgrade the migrated database in place.

The snapshot is historical recovery data and may include content subsequently deleted from the active planner. It is not encryption or a separate disaster-recovery backup. Its retention and future encrypted backup behavior will be addressed with the 0.3 design.

## macOS build preparation

On the Mac, install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) and Node.js 24+, then use the same `npm ci` and `npm run desktop` commands. `npm run desktop:build` selects the platform configuration: RPM on Linux and DMG on macOS. Explicit scripts are also available: `npm run desktop:build:linux` and `npm run desktop:build:macos`. Build each on its corresponding host.

The macOS config currently declares macOS 12.0 as its minimum; this is a build setting, not a tested support claim. Confirm the owner's Mac architecture and OS before publishing a support matrix. The added `macOS native` CI job runs Rust tests and builds the app without bundling. It does not sign, notarize, publish, or replace testing the actual installer on the Mac. See [the 0.2 progress checklist](plans/0.2-progress.md).

## Testing

- `npm run check`: ESLint, domain tests, TypeScript, and production frontend build.
- `npm run test:e2e`: isolated Chromium browser flows; install with `npx playwright install chromium` first.
- `cargo test --locked --manifest-path src-tauri/Cargo.toml`: SQLite and native reminder-queue tests.
- `npm run format`: format frontend, tests, config, and docs.

Vitest pins `America/New_York` in its configuration so DST tests behave consistently on every workstation, including when the shell uses UTC. Browser tests also use this timezone and default to two workers to avoid browser startup timeouts on constrained machines.

On Fedora, an additional native integration test exercises the actual bundled WebKitGTK app:

```bash
cargo install tauri-driver --locked
npm run test:native:build
npm run test:native
npm run test:native:migration
npm run test:native -- --invalid-legacy
```

`WebKitWebDriver` must be available (provided with this workstation's WebKitGTK packages). Run in a graphical session. The test build uses the separate `com.joeydano.dayframe.native-test` identifier so the single-instance plugin does not redirect it to an already-open normal Dayframe app. The test starts its own driver on ports 4446/4447, uses a new `work/native-test-*` data directory, and sends one local test notification. `TAURI_DRIVER` and `DAYFRAME_BINARY` can point to alternative driver/app binaries; the binary must use the test configuration above. No test writes to your normal planner. Rebuild with the normal desktop command when you want a regular development app again.

The migration variant creates an isolated MVP 0.1 SQLite database from `tests/fixtures/planner-v1.json`, opens it in the real app, verifies migration, creates a block through the UI, restarts, and checks both entity storage and the unchanged migration snapshot. The same fixture is used by Rust storage tests. The `--invalid-legacy` variant seeds damaged data and verifies that the app displays a load error without changing the original database. Run all native variants sequentially because they share driver ports.

The native test verifies OS acceptance of a notification; Do Not Disturb can still suppress its visible banner. Native file picker interaction is a manual check; browser backup flows and native filesystem scope enforcement are tested separately.

## Future platforms

The frontend is static Vite output. It needs no Node server at runtime. Next.js would add static-export constraints without a benefit here. A later sync API can run separately and use the same domain contracts.

macOS/iOS are not verified targets yet. iOS needs a macOS/Xcode build environment, signing, touch layouts, notification lifecycle design, and a separate widget implementation. Do not interpret shared Tauri support as a finished mobile app.

[ADR 002](adr/0002-storage-sync-and-distribution.md) tracks the proposed storage, synchronization, and distribution work for MVP 2. Its open questions are not implemented capabilities.
