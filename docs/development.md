# Development

## Platform status

These instructions are for building Dayframe from source. Packaged-app users will not need Node.js, Rust, or Xcode; see [installation](installation.md) for download availability.

| Platform             | Verified so far                                                                                                  | Still to verify                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Fedora/Linux         | Native app, storage/migration tests, and Linux CI                                                                | Release installer/upgrade checks and declared distro coverage                          |
| macOS, Apple Silicon | macOS CI build/tests; maintainer confirmed a source-build launch on 2026-10-02 after selecting Rust/Cargo 1.98.1 | Full feature checks, exact macOS/chip versions, DMG installation, signing/notarization |
| macOS, Intel         | Build configuration only; no hands-on result recorded                                                            | Build, launch, feature, and installer checks                                           |
| iOS                  | Next: personal offline prototype                                                                                 | Simulator/device build, touch layout, storage, native capabilities, and distribution   |

The successful Mac launch does not establish a minimum supported macOS version or complete feature parity. Record platform results in [0.2 progress](plans/0.2-progress.md).

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

### Shared toolchains

Use Node.js 24 (the version selected by `.nvmrc` and CI); the minimum supported version is 24. The project enables npm's `engine-strict` setting so an unsupported Node version stops installation rather than leaving a partially usable dependency tree. If you use [nvm](https://github.com/nvm-sh/nvm), run `nvm install` and `nvm use` from the repository root. Otherwise install Node.js 24 from [nodejs.org](https://nodejs.org/en/download), open a new terminal, and verify `node --version` before continuing.

Rust/Cargo 1.98.1 is the supported build baseline, selected by `rust-toolchain.toml` and CI. Install [rustup](https://rustup.rs/) once; its command proxies read the repository's toolchain file and install/select the required compiler when needed. An explicit `rustup toolchain install 1.98.1 --profile minimal` can download it ahead of the first build. A system-packaged Rust installation must also meet the version declared in `src-tauri/Cargo.toml`; it does not process the rustup toolchain file. The manifest's `rust-version` declares a requirement, not an installation command. See [rustup's toolchain selection documentation](https://rust-lang.github.io/rustup/overrides.html#the-toolchain-file).

Commit both dependency lockfiles. Change toolchain versions deliberately, updating `.nvmrc`, `rust-toolchain.toml`, the package engine/Rust requirements, and CI consistently, then verify the supported hosts. Do not copy `node_modules` or native build outputs between operating systems.

### Fedora setup

On Fedora, install the native prerequisites:

```bash
sudo dnf install -y rust cargo gcc gcc-c++ make pkgconf-pkg-config \
  webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel librsvg2-devel patchelf
```

From the repository root:

```bash
npm ci --include=optional
npm run desktop
```

`npm run desktop` runs Vite and the Tauri shell together. `npm run desktop:build` creates an optimized RPM in `src-tauri/target/release/bundle/rpm/`; see [installation](installation.md) to launch it from the desktop app menu. The first Rust build downloads and compiles the native dependencies and takes longer than subsequent builds.

### Browser preview and local data

For UI development, `npm run dev` serves a browser preview at `http://127.0.0.1:1420`. The preview uses separate localStorage, cannot read native SQLite data, and does not deliver native reminders. Export/import a backup to move data between the two.

SQLite is stored at `$XDG_DATA_HOME/com.joeydano.dayframe/dayframe.db`, or `~/.local/share/com.joeydano.dayframe/dayframe.db` when `XDG_DATA_HOME` is unset. Use app export for a portable backup; copying only a live `.db` file can miss SQLite WAL data.

The 0.2 branch uses SQLite schema version 2. Blocks, categories, and templates are separate ordered JSON records; preferences/document fields are stored in `planner_state`. A single transaction applies each logical save or restore. Unchanged records retain their local revision; deletion markers keep identity/revision without active record content. These are local records, not a cloud sync protocol. Rust owns the connection and the frontend cannot run arbitrary SQL. TypeScript retains full domain validation; native storage checks sizes, document shape, entity IDs/counts, and category references.

Opening a version 1 database migrates it transactionally and retains its original table as `planner_v1_backup`. That snapshot remains in the same database, so export an external JSON backup before trying a development build. The JSON planner/backup formats remain version 1 and preserve existing date/time behavior. Old app binaries reject SQLite schema version 2. Restoring an exported backup into a separate old-version data directory is safer than attempting to downgrade the migrated database in place.

The snapshot is historical recovery data and may include content subsequently deleted from the active planner. It is not encryption or a separate disaster-recovery backup. Its retention and future encrypted backup behavior will be addressed with the 0.3 design.

## macOS build preparation

The maintainer confirmed that the source-build app launches on an Apple Silicon MacBook Air on 2026-10-02. Use the shared toolchain versions above; the Mac's exact macOS version remains to be recorded.

### First-time setup

For desktop development, install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/#macos): Apple's Command Line Tools, Rust through [rustup](https://rustup.rs/), and Node.js 24. Install the project's Rust toolchain with `rustup toolchain install 1.98.1 --profile minimal`. `xcode-select --install` saying that the tools are already installed is informational; do not reinstall them for a JavaScript dependency error. Full Xcode is needed for the later iOS work.

Check the selected tools and runtime from the repository root:

```bash
xcode-select -p
xcrun --find clang
rustc --version
cargo --version
rustup show active-toolchain
node --version
node -p "process.platform + ' ' + process.arch"
```

Rust and Cargo should report 1.98.1 with the selected project toolchain. Run these checks inside the repository so rustup can find its toolchain file. A channel named `stable` may still contain an old installation; the version output is what matters.

On Apple Silicon with native Node, the last command should print `darwin arm64`; on an Intel Mac it should print `darwin x64`. If Node is older than 24, select Node 24 before installing dependencies. With an existing nvm installation:

```bash
nvm install
nvm use
```

Without nvm, use the Node.js installer linked above and reopen Terminal. Once `node --version` reports 24 or newer:

```bash
npm ci --include=optional
npm run desktop
```

After setup, the normal development command is `npm run desktop`. Use `nvm use` when opening a new shell if your Node manager does not switch automatically. Repeat `npm ci --include=optional` when installing a fresh checkout or after dependency changes.

### Troubleshooting

If Vite reports `Cannot find native binding` or a missing `@rolldown/binding-darwin-arm64` / `binding-darwin-x64`, first verify Node's version and architecture, then repeat `npm ci --include=optional`. The lockfile already contains both Mac bindings. `npm ci` replaces `node_modules` while preserving `package-lock.json`; do not delete the lockfile or copy `node_modules` between platforms. If it still fails, capture the install output plus `npm --version`, `npm config get omit`, and `npm ls rolldown @rolldown/binding-darwin-arm64 @rolldown/binding-darwin-x64` (one architecture's package will normally be absent).

If Cargo reports a `js-sys` / `futures-util` feature conflict after Vite starts, check `rustc --version`, `cargo --version`, `which -a rustc cargo`, and `rustup show active-toolchain`. Older Cargo versions have a known resolver issue with namespaced optional dependencies ([Cargo issue #10788](https://github.com/rust-lang/cargo/issues/10788)); the error alone does not prove which toolchain is active. Keep `src-tauri/Cargo.lock` and use the tested toolchain explicitly:

```bash
rustup toolchain install 1.98.1 --profile minimal
rustup run 1.98.1 cargo check --locked --manifest-path src-tauri/Cargo.toml
rustup run 1.98.1 npm run desktop
```

`rustup run` selects the toolchain and puts rustup's command proxies on PATH, including for Cargo launched by npm/Tauri. This also works before the toolchain file has been pulled. If it still fails, preserve the full error and report `rustup run 1.98.1 cargo --version` and `rustup run 1.98.1 rustc --version`. Do not remove the lockfile or add a direct `js-sys` dependency as a workaround.

### Build and verify the Mac app

`npm run desktop:build` selects the platform configuration: RPM on Linux and DMG on macOS. Explicit scripts are also available: `npm run desktop:build:linux` and `npm run desktop:build:macos`. Build each on its corresponding host.

On the Mac, run `npm run desktop:build:macos` and find the DMG under `src-tauri/target/release/bundle/dmg/`. This creates a local test package; Developer ID signing/notarization and public release downloads are separate work.

Before reporting the Mac target as verified, record the macOS version (`sw_vers`), chip, application commit, and tool versions, then check:

- Create, edit, drag, and resize a block; quit and reopen to confirm persistence.
- Exercise categories, recurrence/exceptions, and daily templates.
- Export and import a test backup using native file dialogs.
- Grant notification permission and check a reminder while Dayframe is open or minimized.
- Build the DMG, install the app into Applications, and launch it from its icon.
- Verify an upgrade against a backed-up test planner and record any Gatekeeper/signing prompts.

The macOS config currently declares macOS 12.0 as its minimum; this is a build setting, not a tested support claim. The `macOS native` CI job runs Rust tests and builds the app without bundling. It does not sign, notarize, publish, or replace testing the actual installer on the Mac. See [the 0.2 progress checklist](plans/0.2-progress.md).

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

macOS source startup is confirmed; the checks above remain necessary for release support. iOS is not implemented or verified yet. The next development milestone is the [personal iPhone prototype](plans/iphone-prototype.md), ahead of sync: use the Mac with full Xcode and [Tauri's iOS prerequisites](https://v2.tauri.app/start/prerequisites/#ios), then demonstrate an installed offline planner on the iPhone 16. Its bundled frontend must work without the Mac or a development server. Keep implementation in focused follow-up PRs; desktop startup does not establish mobile compatibility.

Keep the public release numbers: 0.2 desktop delivery, 0.3 encrypted desktop sync, and 0.4 the complete iPhone app with three-platform sync and its selected distribution channel. The interim personal phone prototype comes before sync work and does not wait for published desktop installers. TODOs and widgets remain deferred. [ADR 002](adr/0002-storage-sync-and-distribution.md) and the [implementation plan](plans/mvp-2.md) track these boundaries; later architectural questions are not implemented capabilities.
