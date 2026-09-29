# Initial review: MVP 0.1

## What to review first

1. [ADR 001](adr/0001-product-scope-and-desktop-architecture.md) records the agreed scope, Vite/React choice, local storage, recurrence semantics, reminder lifecycle, and future platform/sync direction.
2. Run `npm run desktop` and plan a day directly on the calendar. Drag blocks and resize their edges. Try a weekday recurring block and edit just one occurrence.
3. Save the day as a template, apply it to another day, and try exporting/restoring a backup.
4. Confirm that the minimal Teams/shadcn-inspired layout and category colors feel right for daily use.

The per-day TODO list is recorded for **MVP 0.2**, not implemented as part of this calendar milestone. macOS/iOS, sync, idle display, and mobile widgets are also deferred.

## Verification performed on Fedora 44

| Check                     | Result                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ESLint and TypeScript     | Passed                                                                                                                                                                   |
| Production frontend build | Passed                                                                                                                                                                   |
| Domain tests              | 18 passed: recurrence, exceptions, template copying, validation, backups, wall-clock dates, reminder lead times                                                          |
| Browser tests             | 8 passed: CRUD/reload/delete, recurring edits, 15-minute drag/resize, drag selection, templates, backup export/restore, navigation/filter/theme, corrupt-data protection |
| Rust tests                | 3 passed: SQLite atomic replacement/rejection, newer-database protection, reminder due/deduplication logic                                                               |
| Native bundled app        | Launched in the Fedora WebKitGTK webview                                                                                                                                 |
| Native integration        | Passed: UI-created block saved to SQLite, app restart/reload, denied unscoped filesystem access, and one queued notification accepted by the OS                          |

The native integration test uses an isolated data directory. Browser tests use isolated browser contexts. Test/example blocks are not installed in the owner's planner. The first normal launch is empty.

A drag-selection test caught an event-renderer assumption about unsaved preview blocks; the fix is covered by that end-to-end test. The browser harness checks actual saved minutes after drag and resize.

## Remaining manual/platform checks

- Interact with Fedora's native open/save dialogs and choose your preferred backup location. Browser backup round trips and native filesystem access restrictions were automated separately.
- Confirm notification presentation with your own desktop settings. OS acceptance was verified; Do Not Disturb, sleep, and a closed application can suppress delivery as described in the user guide.
- macOS and iOS have not been built or tested. CI configuration is included but its hosted run is pending the first push.

Vite emits a non-failing bundle-size advisory for the calendar/UI bundle (about 756 KB uncompressed). It is shipped locally and does not require a network download at runtime. Bundle splitting can be considered if startup profiling shows a need.
