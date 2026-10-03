# Install Dayframe

## Availability

[GitHub Releases](https://github.com/joeydano/dayframe/releases) is the download hub. No packaged releases have been published yet. The current app can be built and installed on Fedora using the steps below.

Fedora is the verified desktop target. macOS compilation has passed CI, and the maintainer confirmed source-build startup on an Apple Silicon Mac on 2026-10-02. Full Mac feature and installer checks remain outstanding. Developers can follow the [Mac source-build instructions and troubleshooting](development.md#macos-build-preparation). There are no published Mac builds or App Store listings yet; [ADR 002](adr/0002-storage-sync-and-distribution.md) tracks distribution work.

The build instructions require developer tools. Users of future packaged downloads will not need Node.js, Rust, or Xcode.

## Build and install on Fedora

1. Clone the repository and install the prerequisites in [development setup](development.md#native-development).
2. From the repository root, install dependencies and build the RPM:

   ```bash
   npm ci --include=optional
   npm run desktop:build
   ```

3. Find the resulting `.rpm` in `src-tauri/target/release/bundle/rpm/`. Open it with your software installer, or install that specific file with `sudo dnf install /path/to/Dayframe.rpm`, substituting its actual path.
4. Launch **Dayframe** from your desktop's app menu. You can pin its icon using your desktop's normal controls.

See the [user guide](user-guide.md) to start planning. Native reminders require Dayframe to remain open or minimized.

## Build a Mac test installer

After completing [macOS developer setup](development.md#macos-build-preparation), run `npm run desktop:build:macos` on the Mac. The resulting DMG belongs in `src-tauri/target/release/bundle/dmg/`; open it and drag Dayframe into Applications, then test launch from its icon.

This packaging path still needs hands-on verification. The confirmed source launch is not an installer/signing result. Public Developer ID signing/notarization is not configured, and no iPhone installer is available yet.

## Updates and backups

There is no automatic updater in MVP 0.1. Install a newer RPM when one is available. Export a backup under **Settings → Backups** before changing app versions or moving to another machine.

Planner data lives separately from the application in the user's application-data directory. Details and backup precautions are in [development](development.md#native-development). The browser preview has separate storage; use export/import to transfer a planner between preview and desktop.
