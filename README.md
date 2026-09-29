# Dayframe

A minimal, local-first desktop calendar for giving your day structure.

Dayframe MVP 0.1 targets Fedora/RHEL with **Tauri 2, React, TypeScript, Vite, and SQLite**. It works offline and starts with an empty calendar. The interface includes a sidebar, simple day/week views, and colored time blocks.

## What's included

- Create blocks directly on the calendar; drag to move or resize with 15-minute snapping.
- Titles, notes, customizable category names/colors, and overlap warnings.
- Daily, weekday, and weekly recurrence, with single-occurrence or whole-series editing.
- Reusable daily templates, applied without replacing existing blocks.
- Native desktop reminders while Dayframe is running, including when minimized.
- SQLite persistence, JSON backup export, and validated restore with confirmation.
- Light, dark, and system themes.

## Run on Fedora

Install the native prerequisites once:

```bash
sudo dnf install -y rust cargo gcc gcc-c++ make pkgconf-pkg-config \
  webkit2gtk4.1-devel openssl-devel libappindicator-gtk3-devel librsvg2-devel patchelf
```

With Node.js 24+ installed, run from the repository root:

```bash
npm ci
npm run desktop
```

Build a Fedora RPM with `npm run desktop:build`. The result is in `src-tauri/target/release/bundle/rpm/`.

For UI development only, `npm run dev` opens a browser preview at `http://127.0.0.1:1420`. The browser uses separate local storage; it does not read the native SQLite database and cannot deliver native reminders. Export/import a backup to move data between the two.

## Documentation

Start with [the documentation index](docs/README.md).

- [ADR 001 — requirements and architecture](docs/adr/0001-product-scope-and-desktop-architecture.md)
- [Development, verification commands, and project structure](docs/development.md)
- [User guide and current limits](docs/user-guide.md)
- [Initial review notes and verification](docs/verification.md)

**Next:** MVP 0.2 adds a per-day checklist drawer/panel. Later milestones cover macOS/iOS, remote sync, and current-block desktop/mobile displays. Those are recorded in ADR 001 and are not part of this release.

## Checks

```bash
npm run check
npx playwright install chromium
npm run test:e2e
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

GitHub Actions runs frontend checks, browser tests, Rust tests, and a Linux native build. Nothing is deployed or published automatically.

## License

[MIT](LICENSE). FullCalendar uses its standard MIT-licensed plugins; no premium calendar license is required.
