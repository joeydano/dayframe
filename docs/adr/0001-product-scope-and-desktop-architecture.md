# ADR 001: Product scope and desktop architecture

- Status: Accepted for MVP 0.1; implementation details open to review
- Date: 2026-09-29
- Product: Dayframe

## Context and requirements

Dayframe is a personal time-block planner, initially for the owner's Fedora workstation. Planning happens directly on a calendar, like Teams or Outlook. The interface should borrow the restraint and component language of shadcn/ui, with minimal visual noise. This repository is the source of truth for code and documentation.

The owner chose Tauri, React, and TypeScript and asked whether Next.js belongs in the stack. Future targets are macOS and iOS, with synchronization across Fedora, macOS, and iOS. The first release must work entirely offline without an account, remote service, or cloud deployment.

## Decision

### MVP 0.1

- Day and week calendar views; click or drag empty space to create a block.
- Move and resize blocks with 15-minute snapping.
- Titles, notes, and colored categories.
- Daily, weekday, and weekly recurrence with an optional inclusive end date.
- Edit/delete either a single occurrence or an entire series. Moving/resizing a recurring occurrence detaches that occurrence; it does not silently move the series.
- Save a day's visible blocks as a reusable daily template; apply a template additively to another day.
- Desktop reminders while the app is running, including when minimized. Closing the window quits the app. Delivery while closed, at OS suspend, or despite Do Not Disturb is not promised.
- Local persistence and validated, versioned JSON export/import backups. Restore replaces current data only after review and confirmation. Export is offered before restore.
- Overlaps are allowed, displayed side by side, and called out in the editor. This is an implementation default because the owner did not specify an overlap policy.
- System theme by default with light/dark overrides. Both day and week views are implementation defaults.
- No block completion tracking or application keyboard shortcuts. Standard accessible keyboard operation of controls remains available.

### MVP 0.2: daily checklist

Add a per-day TODO list with checkable items, independent of calendar blocks. A drawer or compact panel attached to the selected day is the preferred direction. Hovering a day may reveal a preview or entry point, but clicking/tapping and keyboard access must also work. Tasks should remain associated with their day without requiring scheduled time. The exact interaction and data model will be decided in a follow-up ADR. This is explicitly deferred from MVP 0.1 and does not imply completion tracking for calendar blocks.

### Later

- macOS and iOS builds and platform-specific verification.
- A remotely hosted synchronization service and authentication once cross-device use begins; provider selection is deferred.
- A current-block display when the desktop is at rest and, much later, a mobile widget. No idle monitoring, overlay, lock-screen integration, or widget is included now.
- External calendar integration, richer recurrence, and travel/time-zone behavior require separate decisions.

### Technology and boundaries

- **Tauri 2** provides the native shell and a small Rust backend.
- **React + TypeScript + Vite** produces static frontend assets. Next.js is not selected: this offline app does not need a server, SSR, API routes, or Next.js routing conventions. A future sync API is a separate service; adding one does not require replacing Vite.
- **shadcn/ui primitives** provide accessible dialogs and controls; **FullCalendar 6 standard plugins** provide mature calendar selection, dragging, resizing, and overlap layout. Only MIT-licensed standard plugins are used. Version 6 is pinned deliberately; version 7 changes its plugin APIs and is a separate upgrade.
- A pure TypeScript domain layer owns validation, local-date recurrence expansion, occurrence exceptions, templates, and backup formats. React components do not call SQLite directly.
- A narrow repository adapter calls Rust commands in Tauri. SQLite stores one versioned planner document atomically for this small personal dataset. This avoids partial multi-table restores. Stable entity UUIDs and timestamps are included. Migrating to per-entity tables and tombstones will be needed before synchronization; timestamps alone are not a conflict resolution design.
- The Rust backend owns the database and the in-process reminder queue. Native timers avoid relying on minimized-webview timers for already queued reminders.
- A browser-only adapter uses a separately named localStorage key for UI development/testing. Browser preview data is independent from native data and the UI labels this mode. It is not a cloud/web release.
- Reminder jobs are refreshed on edits and while the frontend is active, with a rolling 14-day horizon. A native timer sends due notifications. No daemon, autostart, or tray behavior is included in this pass.

### Time semantics

Blocks use local calendar dates and wall-clock minutes, not UTC strings. Recurrence expansion preserves the local time through daylight-saving changes. For MVP 0.1, schedules follow the workstation's current time zone; this is intentionally a single-workstation assumption. Nonexistent local reminder times during a DST jump are skipped. Overnight blocks must be split at midnight. Synchronization must first introduce explicit zone/travel semantics and a versioned migration.

### Security and data ownership

No analytics, remote fonts, accounts, or network requests are needed at runtime. SQLite is stored in Tauri's application-data directory; backups include blocks, categories, templates, and preferences. The app loads bundled assets under a content security policy and grants only required plugin capabilities. Backup files contain personal schedule data in plain JSON. Import validates sizes, types, IDs, references, and schema version before changing storage. Local file dialogs scope access to the selected file.

## Alternatives considered

| Alternative                   | Reason not selected                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| Electron                      | Owner chose Tauri; bundling Chromium/Node is unnecessary for this scope.                               |
| Next.js static export         | Compatible in principle, but adds conventions and constraints without serving an offline planner need. |
| Cloud database from day one   | Adds account, connectivity, provider, and conflict-handling decisions before there is a second device. |
| Browser-only/PWA              | Does not meet the requested native desktop delivery. Browser preview is only a development tool.       |
| Handwritten calendar geometry | Adds avoidable drag/resize, scrolling, and overlap edge cases.                                         |
| JSON file as primary store    | SQLite gives atomic replacement and room for migrations with little native complexity.                 |

## Consequences

The UI/domain code can be reused across Tauri targets, but an iOS application still needs macOS/Xcode, signing, touch layout work, notification behavior, and native widget work. Cross-platform compatibility is a direction, not a claim that those platforms have been tested. Fedora requires Rust, a C/C++ toolchain, GTK, and WebKitGTK development packages. The document repository deliberately favors a small maintainable first release over premature distributed-system machinery.

## References

- [Tauri frontend configuration](https://v2.tauri.app/start/frontend-config/)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Tauri notifications](https://v2.tauri.app/plugin/notification/)
- [FullCalendar v6 React integration](https://fullcalendar.io/docs/v6/react)
- [shadcn/ui](https://ui.shadcn.com/docs)
