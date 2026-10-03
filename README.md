<p align="center">
  <img src="public/dayframe.svg" alt="Dayframe logo" width="96" height="96" />
</p>

<h1 align="center">Dayframe</h1>

<p align="center">
  <a href="https://github.com/joeydano/dayframe/releases">Releases</a> ·
  <a href="docs/user-guide.md">User guide</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

## About

Dayframe is a minimal, open-source time-block planner. Plan directly on a day or week calendar, drag blocks to move or resize them, and organize your time with colored categories, notes, repeating blocks, and daily templates.

The current Fedora desktop app works offline, stores your planner locally, and supports reminders and JSON backups.

## Download

[GitHub Releases](https://github.com/joeydano/dayframe/releases) is the download hub. Packaged downloads have not been published yet; for now, [build and install on Fedora](docs/installation.md).

Fedora is the currently verified platform. [macOS source-build startup](docs/development.md#macos-build-preparation) is confirmed; full feature and installer checks are ongoing. macOS and iOS downloads are not available yet.

## Use

1. Click or drag on the calendar to create a block.
2. Add a title, category, notes, and an optional repeat schedule or reminder.
3. Drag blocks to move or resize them in 15-minute steps.

Keep Dayframe open or minimized for reminders. Export and restore backups under **Settings → Backups**. See the [user guide](docs/user-guide.md) for templates, recurring blocks, and current limits.

## Contribute or fork

Dayframe uses Tauri 2, React, TypeScript, Vite, and SQLite. Start with [contributing](CONTRIBUTING.md) for the fork and PR workflow, or [development setup](docs/development.md) to run it locally.

Architecture decisions, setup, and verification details live in [docs](docs/README.md).

[MIT licensed](LICENSE).
