# MVP 2 and follow-up implementation plan

- Status: Three public releases retained; personal iPhone prototype prioritized next on 2026-10-02; later architecture choices remain open
- Date: 2026-09-29
- Decision record: [ADR 002](../adr/0002-storage-sync-and-distribution.md)
- Planning branch: `feat/dayframe-mvp-2`

## Outcome and boundaries

The product goal is usable Linux, macOS, and iPhone applications with public cloud sync of each user's encrypted planner. Preserve conflicting versions for user resolution, support a recovery key and trusted-device enrollment, and enforce a USD 20 maximum monthly service budget. GitHub is the desktop download hub; the iPhone distribution route remains to be selected. The daily TODO drawer is deferred.

The owner approved the narrower 0.2 / 0.3 / 0.4 release split and GitHub milestone organization. This supersedes the earlier requirement to ship all three platforms and sync in MVP 2. The current branch is limited to 0.2 implementation; later scope is retained here as a roadmap. Package versions will be advanced when preparing the corresponding release.

Recommend retaining Tauri, React, TypeScript, and SQLite, subject to an early iPhone feasibility test. Keep cloud service details behind a narrow sync interface. Initial product scope should remain private personal planners, with no shared calendars or collaborative editing. That last boundary, account-optional operation, phone feature parity, and reminder behavior still need confirmation.

Build in small increments and release each milestone on its own completion criteria. The original combined-release approach is retained below only as a considered alternative.

## Approved release split

| Milestone                                        | Ship                                                                                                                       | Deliberately outside that release                              | Completion boundary                                                                                          |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **0.2 — Local foundations and desktop delivery** | Safe entity-storage migration, backup compatibility, usable Fedora/macOS apps, verified installers, GitHub download portal | Accounts, hosted sync, production E2E flows, public iPhone app | Existing planner survives upgrade; both desktop apps install and work offline; download links work           |
| **0.3 — Encrypted desktop sync**                 | Accounts, device enrollment/recovery, encrypted Linux↔macOS sync, conflict handling, cloud limits and operating procedures | Public iPhone app, shared calendars, widgets                   | Both desktop apps pass offline/conflict/recovery tests; public sync stays within the agreed operating limits |
| **0.4 — iPhone and three-platform sync**         | Phone UI, native integrations/reminders, full three-platform verification, selected iPhone distribution channel            | TODO drawer and unrelated product expansion                    | The complete original Linux/macOS/iPhone sync goal works on real devices                                     |

Priority update (2026-10-02): the owner wants a usable iPhone prototype for personal demos and UI feedback before sync work. Add the interim milestone **iPhone prototype — personal demo**, keeping the three public release numbers above. Its [focused plan](iphone-prototype.md) covers offline day planning, touch-friendly block editing, local persistence, and launching an installed app independently of the Mac. This replaces the earlier placement of a minimal iPhone feasibility check inside 0.2.

Current checkpoint (2026-10-02): the owner confirmed the source-build app launches on the Apple Silicon Mac after selecting the tested Rust toolchain. Finish the current desktop storage/setup PR, then prioritize the personal iPhone prototype in a separate branch. Desktop installer/download work can continue separately; publishing 0.2 is not a prerequisite for the prototype. Full synchronized iPhone delivery remains 0.4. See [0.2 progress](0.2-progress.md) for evidence and remaining desktop checks.

Release infrastructure is incremental: establish the Linux/macOS build and download path in 0.2, extend it with sync-service operations in 0.3, and add iPhone distribution in 0.4. An early desktop release does not require completing later cloud or phone work.

This split gives each release an independently useful outcome and keeps cloud operating costs out of 0.2. Buying Apple membership remains a separate decision; signed/notarized Mac distribution may require it before the iPhone release.

## Recommended order

Immediate development priority: **finish the current desktop PR → personal iPhone prototype → encrypted desktop sync → complete iPhone/three-platform release**. Complete the remaining 0.2 installer work independently before claiming a public desktop release. The numbered chunks below describe the broader technical work; the phone demo takes the platform subset of chunks 1 and 6 ahead of chunk 3. It does not depend on backend selection, encryption, or full phone feature parity.

| Chunk                             | Result                                                                   | Depends on                       | Completion evidence                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1. Resolve risks and contracts    | Verified Apple build path, agreed behavior, and a viable cost model      | Existing MVP 0.1                 | App runs and persists data on the Mac and iPhone; key platform capabilities and provider constraints are documented      |
| 2. Evolve local storage           | Safe migration and durable entity-level changes                          | 1: data/time rules               | Existing planner survives migration, interrupted writes, and restart; old backups remain importable                      |
| 3. Build the encrypted vault      | Encryption, device keys, recovery, and versioned encrypted records       | 1: privacy rules; 2: entities    | Two isolated clients can exchange and unlock a record; recovery and tamper tests pass without server-held plaintext keys |
| 4. Connect a small sync path      | Accounts and one encrypted block synced between desktop clients          | 1–3                              | Create/edit offline, reconnect, and see the block on the other desktop; another account cannot access it                 |
| 5. Complete sync semantics        | All planner entities, conflicts, deletions, recurrence, and safe restore | 4                                | Multi-device failure scenarios converge without silent data loss or duplicate reminders                                  |
| 6. Complete platform behavior     | Usable phone UI and verified lifecycle/reminders on all platforms        | 1, with final validation after 5 | Real-device planning, permissions, background/foreground transitions, and reminders meet the agreed behavior             |
| 7. Prepare each release candidate | Reproducible installers and the operations needed for that release       | Its assigned feature chunks      | Clean install/upgrade succeeds; cloud recovery and cost controls pass before the first public sync release               |
| 8. Publish the milestone          | Verified downloads and release notes for the completed scope             | 7                                | All platforms claimed by that release pass; the complete three-platform goal is reached in 0.4 under the approved split  |

Under the updated plan, 0.2 takes chunk 2 and the desktop portions of 1 and 6–8; the interim personal iPhone prototype takes the bounded mobile portions of 1 and 6; 0.3 takes chunks 3–5, backend decisions from 1, and cloud portions of 7–8; 0.4 completes the phone portions of 4 and 6–8. Final service selection waits until 0.3. The first 0.2 implementation changes SQLite's internal schema while retaining the version 1 planner/backup contract and existing local wall-clock behavior; it does not decide future cross-device time semantics.

### Chunk 1 — resolve risks and contracts

Prove the assumptions most likely to change the rest of the plan. Confirm the Mac's chip and OS, the iPhone's OS, and a supported build environment. Run the existing app on macOS and a minimal Tauri build on the iPhone. Exercise SQLite persistence, a calendar touch interaction, the system file picker/share path, notification scheduling, and the intended secure key-storage mechanism. Prototype a desktop/mobile authentication callback when evaluating the sign-in method.

Settle time-zone behavior before defining schema version 2. Agree on offline operation, synced versus device-local preferences, minimum phone features, and reminders while closed. Select an initial iPhone installation path. Personal Xcode testing can validate feasibility; the public release still needs an agreed distribution channel. Tauri's Apple packaging requires a macOS build environment and signing; see [its distribution guide](https://v2.tauri.app/distribute/app-store/).

Evaluate the backend using a small encrypted-record prototype and a written total-cost calculation. Include authentication/email, retained history, encrypted backups, monitoring, and abuse traffic. Verify what actually happens at service limits. A usage alert or an API response rejecting work does not necessarily stop billable requests at the provider.

**Reviewable pieces:** platform prototype and compatibility findings; ADR decisions and service-budget proposal. Provisioning or purchasing a service is separate from this planning work.

**Exit by milestone:** the personal phone prototype passes its own offline/demo checklist; backend and encryption decisions are not blockers for it. Before 0.3 integration, record data-affecting decisions and demonstrate a backend operating model that fits the ceiling. If a platform or budget assumption fails, revise the affected choice before building on it.

### Chunk 2 — evolve local storage

Migrate the version 1 JSON document into versioned SQLite entity records for blocks, categories, templates, and the agreed settings. Preserve stable IDs and all recurrence exceptions. Add deletion/revision metadata and a transaction boundary that can support a durable pending-change queue. For enrolled sync clients in 0.3, save a user's edit and its pending operation in the same transaction, so a crash cannot leave a visible edit that sync will never discover. Local-only 0.2 clients should not accumulate an unbounded network queue; enrollment will establish an initial sync baseline.

Keep local editing and export available during development. Version the repository/backup contracts, retain import of valid version 1 backups, and preserve a recoverable pre-migration snapshot. Detect unsupported newer schemas without overwriting them. Do not allow an old client to rewrite migrated storage blindly.

**Reviewable pieces:** migration and compatibility tests; entity repository plus durable pending-change operations. Maintain existing calendar behavior before enabling any network path.

**Exit:** fixture planners retain their data and behavior after upgrade; interrupted migration/write tests recover; existing backup imports still work. When sync is enabled in 0.3, restarting also preserves unsent operations.

### Chunk 3 — build the encrypted vault

Define the encryption and key lifecycle before real planner content leaves a device. Use maintained cryptographic libraries and a reviewed design. Specify the versioned encrypted-record envelope, authenticated identity/revision context, nonce handling, and the metadata visible to the server. Encrypt planner content on the client and validate it again after authenticated decryption.

Store device secrets using the verified platform mechanism. Implement initial vault creation, recovery-key confirmation, and trusted-device enrollment using a local/test transport first. Document the difference between signing into an account and unlocking its planner. A password reset alone cannot recreate a lost decryption key.

Decide the scope of encryption at rest and exported backups explicitly: cloud E2E does not automatically encrypt SQLite or existing JSON exports. Define key rotation and device revocation behavior; revocation can stop future authorized access but cannot erase content already downloaded by that device.

**Reviewable pieces:** encrypted-record format and crypto tests; secure key persistence plus recovery/enrollment flows.

**Exit:** two isolated clients decrypt the same authorized record; altered ciphertext fails safely; key/recovery material is absent from logs and server fixtures; restart and recovery flows work on the selected platform adapters. Lost-device and forgotten-password behavior matches ADR 002.

### Chunk 4 — connect one block across devices

Integrate the selected authentication service with signup/sign-in, session refresh, sign-out, and account isolation. Establish bounded test accounts and basic request/storage limits before accepting remote writes. Connect enrollment and recovery to the authenticated account without giving the service plaintext keys.

Implement a narrow encrypted push/pull protocol with stable operation IDs, server-assigned revisions, a durable sync cursor, and retry handling. Never use device clocks to decide which edit wins. Only acknowledge locally queued work after durable remote acceptance. Keep test and production data separate.

Start with one non-recurring block and its necessary category. Demonstrate it between Fedora and the Mac, then apply the same protocol to iPhone during its milestone. Include a simple sync status indicator and a retry action. Concurrent versions must already be retained, even if the full conflict-resolution UI arrives in chunk 5. Do not ship a temporary last-write-wins path that can discard real edits.

**Reviewable pieces:** account/session isolation; encrypted push/pull with one-block UI integration.

**Exit:** edit offline on both desktops, restart, reconnect, and retry the same operation without losing or duplicating it. Repeat the same checks on iPhone before its release. A second account cannot read or mutate the first account's records. Server inspections show ciphertext for planner content. No open public enrollment yet.

### Chunk 5 — complete sync semantics and recovery

Extend the proven path to categories, templates, recurrence rules/exceptions, and agreed shared preferences. Treat edits that detach an occurrence and exclude it from a series as one logical operation. Prevent partially applied changes from leaving missing categories or broken recurrence references.

Add the conflict-resolution interface. Preserve both versions, identify unresolved changes clearly, and make resolution itself a versioned operation. Define a consistent displayed version while a conflict is pending; retaining alternatives must not automatically schedule duplicate blocks or reminders. Exercise edit-versus-delete, concurrent series edits, and two devices trying to resolve the same conflict.

Define initial local/remote reconciliation and restore behavior. Prefer a preview and explicit choice over an implicit whole-account replacement. A restore that is intended to remain local must stay isolated from automatic upload. Specify history/deletion retention and a full resync procedure for devices whose cursor is too old, preserving their unsubmitted edits first.

**Reviewable pieces:** complete entity/recurrence operations; conflicts and resolution; initial reconciliation, backup restore, and long-offline recovery.

**Exit:** test both reconnection orders, repeated requests, dropped responses, crashes during apply, stale clients, restored backups, and expired cursors. Each accepted scenario converges to the agreed state with no silent content loss.

### Chunk 6 — complete the platform experience

Start the bounded mobile layout in the personal iPhone prototype before sync work; extend it to the agreed complete feature set and verify it against sync behavior in 0.4. Preserve common domain logic while adapting navigation, editing, scrolling, touch targets, safe areas, and keyboard behavior to the phone. Every required calendar action must have a practical touch interaction; dragging should not be the only way to edit times.

Implement the agreed lifecycle and reminder behavior with platform adapters. Distinguish local reminders already scheduled on a device from newly received remote edits: a device that has not synced cannot reliably reflect the latest schedule. Where reminders while closed are required, test an OS-supported scheduling mechanism instead of depending on an in-process timer. [Apple documents local notification scheduling](https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app).

Validate consent/denial of notification permissions, account switching, locked key storage, file export/import, local time changes, DST, suspend/resume, and minimized/closed behavior. Keep device reminder preferences separate from synced block reminder settings if that proposal is accepted.

**Reviewable pieces:** phone navigation/editing layouts; platform file/key/notification and lifecycle adapters.

**Exit:** a full planning session works on all three real platforms, including offline editing and later reconnection. Unsupported background behavior is described accurately rather than presented as guaranteed delivery.

### Chunk 7 — prepare release candidates and operational controls

Build release artifacts in a dedicated workflow from an identified commit/tag, with testing separate from publication. Initial proposal: Fedora RPM and signed/notarized macOS DMG in 0.2, extended with the selected iPhone channel in 0.4. Keep unsupported architectures and untested Linux formats out of the download claims. Test signing/configuration early in chunk 1; complete release automation as each milestone reaches this step.

For 0.3, implement the remaining public-service controls: signup admission limits, per-account quotas, abuse throttling, account deletion, session/device revocation, retention cleanup, encrypted server backups, and restore procedures. Confirm which account metadata is retained and what backup deletion timing means. Keep logs free of planner content and keys. Run a focused review of authentication boundaries, the encryption protocol, and recovery flows before public registration.

Test the chosen cost enforcement under exhausted quotas and abnormal traffic, including charges incurred before an application request can be rejected. Disable automatic paid upgrades. If a hard ceiling cannot be substantiated, this chunk does not pass; change hosting or agree on a different budget before public launch. Preserve local edits when sync is suspended.

Produce a concise privacy statement, recovery instructions, support guidance, and release notes. Verify upgrade from the installed MVP 0.1 and a fresh install, then restore the service from a backup. Document recovery/forward-fix procedures; do not assume downgrading an app can safely read a newer local schema.

**Reviewable pieces:** release workflow/artifacts; public-service limits and lifecycle controls; operational and user documentation.

**Exit:** every platform included in the milestone passes device verification and its distribution route is ready. Before 0.3 public sync, the total recurring cost is bounded and service recovery works. Apple enrollment/signing must be complete if the chosen channel requires it.

### Chunk 8 — publish each completed milestone

Finish a beta cycle on the milestone's target devices, resolve release-blocking findings, and publish the tested artifacts. Release local desktop apps in 0.2, encrypted desktop sync in 0.3, and the verified iPhone client in 0.4 under the approved split. Distinguish an iOS beta from an App Store release. Do not call a personal Xcode installation a generally available iPhone download.

Update the README with actual download links, supported versions/architectures, and the account/sync limits. Start public registration within the tested capacity; show a clear capacity message when registration or sync is limited. Avoid collecting planner content in diagnostics.

**Exit:** each milestone delivers its stated outcome; the final milestone meets the original Linux/macOS/iPhone sync goal. The download portal describes the actual supported release. Once cloud sync is available, the operator can restore service or suspend sync while preserving local data.

## Decisions to freeze at the relevant boundary

| Decision                 | Proposed direction or unresolved point                                                                                                                                                   | Needed before                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Offline/account behavior | Recommend full local use without an account; optional sync; pending owner answer                                                                                                         | 1: contracts                           |
| Time zones               | Owner choice pending: floating wall-clock time, preserved instant, or per-block zones. Do not encode an implicit device-zone assumption in sync                                          | 2: schema                              |
| Synced preferences       | Recommend content/categories/templates sync; theme and notification enablement stay per-device                                                                                           | 2: schema                              |
| Phone scope              | Recommend existing planner features with a dedicated touch layout; no TODOs/widgets/collaboration                                                                                        | 1: platform acceptance criteria        |
| Closed-app reminders     | Owner answer pending; separate desktop and iOS guarantees                                                                                                                                | 1: lifecycle prototype                 |
| Account method           | Recommend one email-based sign-in method initially; evaluate recovery, delivery cost, and native callbacks                                                                               | 4: authentication                      |
| Encryption details       | Recovery key/trusted devices confirmed; key hierarchy, metadata exposure, local storage and backup protection still need design                                                          | 3: vault                               |
| Conflict presentation    | Keep both confirmed; calendar display and reminder behavior while unresolved still need definition                                                                                       | 4: initial conflict retention; 5: UI   |
| Restore and retention    | Agree on initial merge/replace choices, recoverable history period, deletion retention, and stale-device recovery                                                                        | 5: complete sync                       |
| Provider and hard cap    | Choose only after total-cost/limit evidence; no automatic upgrade above USD 20                                                                                                           | 1: selection; 4: integration           |
| Apple distribution       | Mac/iPhone available; membership considered. Propose GitHub DMG plus TestFlight beta, then App Store when ready                                                                          | 1: feasibility; 7: release preparation |
| Other targets/features   | Recommend Intel Mac, iPad-specific layouts, additional Linux formats, automatic desktop updates, and external calendars stay outside the initial tested scope unless explicitly included | 1: scope                               |

## Alternative build orders

| Order                                                                                                          | When it is useful                                                  | Tradeoff                                                                                                             |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Selected: current storage/setup → personal phone demo → encryption → desktop sync → complete phone release** | Balances Apple feasibility, data safety, and demonstrable progress | First milestones are foundational; a complete synchronized planner arrives later                                     |
| Storage and sync first, Apple apps later                                                                       | Prioritizes backend progress while Apple access is delayed         | Mobile plugin/key storage/auth constraints may force rework; all-platform release still waits for Apple verification |
| Complete the local Mac/iPhone apps first, then add sync                                                        | Prioritizes hands-on UI feedback across devices                    | Storage migration may happen after platform polish; the hardest distributed-data risks stay unresolved longer        |

The owner selected earlier hands-on phone feedback. Keep the prototype bounded so it produces a useful offline demo without absorbing the full iPhone release. This deliberately postpones sync implementation until after that demo; encryption, conflict handling, and final integrated tests retain their acceptance criteria.

## Backend alternatives

The initial recommendation is to evaluate managed authentication/storage first, keeping a small encrypted sync protocol under our control. This reduces operating work for a personal project. Provider selection remains conditional on the hard ceiling and recovery requirements; no provider supplies Dayframe's E2E conflict behavior automatically.

| Approach                                                      | Why consider it                                             | Budget and maintenance tradeoff                                                                                                                                                                                         |
| ------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase Free with client E2E and explicit sync operations    | Integrated auth/database can shorten initial implementation | Free tier has finite storage/egress, inactivity pausing, and no automatic database backups. Pro starts at USD 25/month, beyond the agreed ceiling; growth must stop or trigger a new decision, not an automatic upgrade |
| Cloudflare Workers/D1 with an established auth integration    | A small encrypted API can be economical and flexible        | Free limits or paid usage must be evaluated across the entire service. Paid Workers starts at USD 5/month plus usage; this is not a USD 20 spending guarantee. More auth/sync integration work                          |
| Fixed-price hosting with an established auth/database service | Potentially predictable capacity and a portable deployment  | Must verify a total quote including backups/traffic; maintenance, patching, availability, and restore become our responsibility. Fixed base rent alone does not prove bounded total cost                                |

Pricing checked 2026-09-29: [Supabase](https://supabase.com/pricing), [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/pricing/), [Cloudflare D1](https://developers.cloudflare.com/d1/platform/pricing/). Recheck before provisioning.

Do not buy a paid stack during planning. A capacity-limited service available to public users can satisfy the current direction; unlimited public sync cannot be promised within a fixed budget.

## Client and distribution alternatives

- **Shared Tauri app — recommended initial direction:** reuse the current React/domain code with a phone-specific layout and native adapters. The early device prototype decides whether this remains practical.
- **Tauri desktop plus SwiftUI iPhone app:** consider if the prototype reveals unacceptable mobile behavior or native Apple UI is a product requirement. It adds a second presentation layer and requires shared protocol fixtures to keep client behavior consistent.
- **GitHub desktop downloads plus TestFlight:** practical initial beta proposal, subject to paid enrollment. It preserves all three platforms without making store approval a prerequisite for testing. A beta channel needs ongoing maintenance and is not the same as a permanent App Store release.
- **GitHub desktop downloads plus iOS App Store at the iPhone milestone:** choose if stable public iPhone availability is a release requirement. Add listing/privacy materials, enrollment, submission, and Apple review to the release dependency chain.

The narrower proposal defers the iPhone release to its own milestone while preserving the native three-platform product goal. A browser-only phone replacement would be a different product decision.

## Review and integration workflow

The [GitHub milestone/epic draft](github-milestones.md) contains the three public release milestones, the interim personal iPhone prototype milestone, and their tracking-issue descriptions with dependencies and completion checklists. The owner is adding them on GitHub; these local files do not claim remote creation.

Use the current branch for this planning change. Recommend opening a documentation PR first, then implementing the reviewable pieces above in short-lived branches from updated `main`. Keep unfinished cloud features disabled until they meet their tests; merge verified foundations without publishing the release or enabling public signup.

Each PR should state the behavior it introduces, the migration/compatibility impact, and the evidence for its completion criteria. Add regression tests with each behavior change. Use isolated databases and test accounts throughout; never use the owner's real planner as migration or sync test data. Keep signing credentials and production service access out of pull-request workflows.

The largest uncertainties are encryption/recovery and complete sync semantics, followed by mobile lifecycle behavior. Estimate calendar time after chunk 1 demonstrates the platform path and resolves the remaining requirements. The prototype priority is approved; detailed technical choices remain proposals, not claims that these capabilities have already been implemented.
