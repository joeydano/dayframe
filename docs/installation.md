# Install Dayframe

## Availability

[GitHub Releases](https://github.com/joeydano/dayframe/releases) is the download hub. No packaged releases have been published yet. The current app can be built and installed on Fedora using the steps below.

Fedora is the verified desktop target. macOS and iOS installation paths are being planned in [ADR 002](adr/0002-storage-sync-and-distribution.md); there are no published builds or App Store listings for those platforms yet.

## Build and install on Fedora

1. Clone the repository and install the prerequisites in [development setup](development.md#native-development).
2. From the repository root, install dependencies and build the RPM:

   ```bash
   npm ci
   npm run desktop:build
   ```

3. Find the resulting `.rpm` in `src-tauri/target/release/bundle/rpm/`. Open it with your software installer, or install that specific file with `sudo dnf install /path/to/Dayframe.rpm`, substituting its actual path.
4. Launch **Dayframe** from your desktop's app menu. You can pin its icon using your desktop's normal controls.

See the [user guide](user-guide.md) to start planning. Native reminders require Dayframe to remain open or minimized.

## Updates and backups

There is no automatic updater in MVP 0.1. Install a newer RPM when one is available. Export a backup under **Settings → Backups** before changing app versions or moving to another machine.

Planner data lives separately from the application in the user's application-data directory. Details and backup precautions are in [development](development.md#native-development). The browser preview has separate storage; use export/import to transfer a planner between preview and desktop.
