# Contributing to Dayframe

Dayframe is a personal-first, open-source planner. Bug fixes and focused improvements are welcome. For larger features, open an issue to discuss scope before building.

## Get started

Fork the repository on GitHub, then clone your fork. Replace `YOUR_USERNAME` below:

```bash
git clone https://github.com/YOUR_USERNAME/dayframe.git
cd dayframe
git switch -c feat/your-change
```

Follow [development setup](docs/development.md) for Fedora prerequisites, running the app, and building an installer. The [user guide](docs/user-guide.md) describes current behavior; the [documentation index](docs/README.md) links the architecture decisions.

## Make a change

- Keep PRs focused and describe the user-visible problem and result.
- Add regression coverage for changed behavior, especially recurrence, dates, backups, and persistence.
- Update the relevant guide when behavior changes. Record architectural decisions in `docs/adr/`; preserve earlier ADRs as history.
- Keep personal planner data, backups, credentials, and signing material out of the repository.

Before opening a PR, run the checks relevant to your change:

```bash
npm run check
npx playwright install chromium
npm run test:e2e
cargo test --locked --manifest-path src-tauri/Cargo.toml
```

For documentation-only changes, check formatting and links. Native changes also need an appropriate native test; see [testing](docs/development.md#testing). State what you verified and any platform you could not test in the PR description.

Push your branch to your fork and open a pull request against `joeydano/dayframe`'s `main` branch. GitHub Actions runs frontend checks, browser tests, Rust tests, and a Linux native build. CI does not currently publish releases.

## Maintain your own fork

Dayframe is [MIT licensed](LICENSE); retain the license and copyright notice when redistributing it. If distributing a separately branded app, choose your own application name and bundle identifier so it can coexist with Dayframe. Configure any future cloud services and signing credentials for your own fork.

The calendar uses FullCalendar's standard MIT-licensed plugins; no premium calendar license is required.
