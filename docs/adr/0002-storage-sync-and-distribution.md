# ADR 002: Storage, synchronization, and distribution

- Status: Accepted for 0.2 scope and local storage; 0.3–0.4 implementation decisions remain open
- Date: 2026-09-29
- Product: Dayframe
- Milestones: 0.2 local foundations/desktop delivery; interim personal iPhone prototype before 0.3 encrypted desktop sync; 0.4 full iPhone release
- Builds on: [ADR 001](0001-product-scope-and-desktop-architecture.md)

## Context

MVP 0.1 provides an offline Fedora planner. PR #1 was merged into `main` as `ffb067e`. The next milestone shifts attention to durable storage, cross-device synchronization, macOS and iOS apps, and a practical way to install them. Dayframe remains a personal-first, public open-source project.

The MVP 0.1 implementation used Tauri 2, React, TypeScript, Vite, and Rust-owned SQLite. Its SQLite database held one versioned JSON planner document. Blocks have stable IDs and creation/update timestamps; categories and templates do not yet have a complete synchronization metadata model. Deletions remove entities rather than recording deletion history. Repository saves replace the document atomically. Backups are validated JSON exports, and restore replaces the local planner.

Dates are local calendar dates plus wall-clock minutes, interpreted in the workstation's time zone. Reminders use an in-process native queue and require the app to be running. These single-device assumptions need explicit decisions before introducing synchronization and mobile lifecycle behavior.

## Confirmed direction

- Plan storage and synchronization across Linux, macOS, and iOS.
- Deliver the native Linux/macOS/iPhone product goal in approved stages: 0.2 local desktop foundations, 0.3 encrypted desktop sync, and 0.4 iPhone. Prioritize an interim personal iPhone prototype before sync work. The current branch implements only 0.2.
- Defer the daily TODO drawer beyond MVP 2.
- Offer cloud sync to anyone using Dayframe, rather than restricting it to the owner's devices.
- Protect planner content with end-to-end encryption; the hosted service must not be able to read calendar titles or notes.
- Work within a monthly service budget of USD 10–20 maximum, with a hard USD 20 ceiling. Limit signups or suspend sync before exceeding it; local planning must remain usable. Provider selection must support this operating model rather than relying only on billing alerts.
- Use a recovery key and trusted-device enrollment for encrypted data. If all devices and recovery material are lost, the existing encrypted planner is unrecoverable; a password reset does not recover its content.
- Preserve conflicting versions and let the user choose how to resolve them. Do not silently use last-write-wins for concurrent changes to the same block.
- Use GitHub downloads for initial desktop distribution. The owner has no Apple Developer membership but would consider USD 99/year to get an app onto the App Store. Enrollment and the iPhone installation channel are not yet selected.
- Available hardware: an Apple Silicon MacBook Air described as from 2021, and an iPhone 16. Confirm the exact Mac chip and both OS versions before defining the build/test matrix.
- Keep the README concise: logo, about, download/use, and contribution/fork entry points. Detailed guides and ADRs belong in `docs/`, with contributor workflow in `CONTRIBUTING.md`.
- Work on a separate branch, `feat/dayframe-mvp-2`, based on merged MVP 0.1.

ADR 001 placed a daily checkable TODO drawer in MVP 0.2. The owner prioritized cross-platform foundations and synchronization instead, and postponed the checklist. ADR 001 is preserved as the historical decision.

During implementation planning, the owner approved narrowing MVP 2 to 0.2 local foundations/desktop delivery, followed by 0.3 encrypted desktop sync and 0.4 iPhone/three-platform sync. This supersedes the earlier all-three-at-once release requirement. The product goal, encryption, conflict policy, and hard service budget remain unchanged. See the [implementation plan](../plans/mvp-2.md) and [milestone/epic descriptions](../plans/github-milestones.md).

Platform evidence update (2026-10-02): macOS CI compiled/tested the native app, and the owner subsequently confirmed source startup on the Apple Silicon Mac after selecting Rust/Cargo 1.98.1. Full Mac feature and installer verification remains open. This supports continuing the Tauri feasibility work; it does not establish iOS compatibility. At this checkpoint the early phone feasibility check was still assigned to 0.2.

Priority decision (2026-10-02): the owner subsequently prioritized an iOS prototype as the next milestone for testing and demoing on their own iPhone. Promote the earlier feasibility check into **iPhone prototype — personal demo**, a dedicated interim milestone ahead of encrypted desktop sync. Keep the 0.2/0.3/0.4 public release numbers. Finish the current desktop storage/setup PR, then build the prototype in focused follow-up PRs; desktop installer publication does not block it. The proposed boundary is offline day planning, basic touch editing, SQLite persistence, and an installed app that launches from the phone icon without the Mac or a development server. Accounts, cloud sync, full phone feature parity, and public store distribution remain later work. See the [prototype plan and completion checklist](../plans/iphone-prototype.md).

The tradeoff is delaying sync implementation to get real-device usability feedback sooner. Start by evaluating shared Tauri/React and personal Xcode installation; the prototype must establish their suitability. Paid membership and TestFlight remain optional decisions, not approved purchases.

## 0.2 branch boundary and storage decision

This branch covers local persistence, compatible backups, Fedora/macOS build and installation support, the download/documentation portal, and preparation for Apple feasibility checks. It does not implement accounts, cloud services, E2E encryption, sync, phone UI, the TODO drawer, or widgets.

SQLite database version 2 stores blocks, categories, and templates as individual ordered JSON records, with local revisions and content-free deletion markers. Preferences and the document-level fields remain in a singleton metadata row. These are local persistence mechanics, not a synchronization or conflict protocol. No network outbox is accumulated for local-only users.

Migration runs in one SQLite transaction, retaining the original version 1 table as `planner_v1_backup` before committing the new database version. This snapshot is preserved by subsequent saves; it is recovery material inside the same database, not protection against loss of the database file. Saves update changed entities and replace the logical planner atomically, including backup restores. Old binaries refuse the newer database version instead of modifying it.

The public planner JSON and backup formats remain version 1. The calendar keeps its existing local wall-clock time rules. Cross-device time zones, encrypted formats, and account/sync metadata are separate 0.3 decisions; this migration does not choose them implicitly. TypeScript retains full domain validation; native storage additionally checks document shape, entity counts/IDs, and category references.

## Scope impact

This milestone expands a single-workstation app into a distributed application delivered on three platforms. It adds five connected areas of work:

1. **Storage evolution:** versioned migration, entity-level persistence, pending changes, and deletion history.
2. **Synchronization:** reconnect/retry behavior, conflict rules, recurrence consistency, and safe restore across devices.
3. **Identity and access:** accounts, authentication, authorization, secure device sessions, and recovery appropriate to the intended audience.
4. **Apple applications:** macOS validation and a usable iPhone layout, platform adapters, device testing, and lifecycle/reminder behavior.
5. **Distribution:** builds, signing, install/upgrade testing, and the selected public download or store channels.

A managed service may reduce infrastructure operation, but does not remove synchronization or platform verification work. Public sync and end-to-end encryption add user isolation, abuse controls, device enrollment, and encryption-key recovery to the milestone. The proposed product boundary is each user's private planner across their own devices, without shared calendars or collaborative editing. Cost and delivery estimates depend on the encryption/recovery design, usage limits, Apple tooling access, and mobile feature parity. The operating budget cannot be treated as a promise of unlimited free public sync.

## Requirements to settle

### Release scope and platform access

1. **Answered, revised:** ship 0.2 local desktop foundations, 0.3 encrypted desktop sync, and 0.4 iPhone. The complete three-platform goal spans these releases. An interim personal iPhone prototype is the next development priority, before 0.3 sync.
2. **Answered:** the daily TODO drawer is deferred beyond MVP 2.
3. **Partly answered:** an Apple Silicon MacBook Air (described as 2021) and iPhone 16 are available; Mac source startup is confirmed. Confirm the exact chip/OS versions, minimum supported versions, additional Mac architectures, and whether iPad is in scope.
4. **Partly answered:** no current Apple Developer membership; willing to consider USD 99/year for App Store access. GitHub desktop downloads are sufficient initially. Agree on personal testing versus TestFlight/App Store for iPhone and when enrollment becomes necessary.
5. Does Linux distribution stay Fedora RPM initially, or include an AppImage or Flatpak/Flathub? Broader distro support needs a tested compatibility baseline.

### Sync ownership, accounts, cost, and privacy

6. **Partly answered:** hosted sync should be available to anyone with Dayframe. Confirm that local-only mode remains usable indefinitely without an account, and whether collaboration is excluded.
7. **Partly answered:** monthly services must stay within USD 10–20, with signups/sync limited before exceeding the hard ceiling. Settle acceptable maintenance effort, per-user quotas, and whether forks can configure their own backend. Annual Apple membership is a separate potential expense, not an agreed purchase.
8. What sign-in experience is wanted, and how should account recovery, device revocation, and account deletion work?
9. **Partly answered:** end-to-end encryption, a recovery key, and trusted-device enrollment are accepted, including loss of access if all devices and recovery material are lost. Specify the enrollment/recovery flows and which metadata may remain visible to the service.
10. Which entities sync: blocks, recurrence exceptions, templates, categories, and which preferences? Appearance and reminder enablement may need to remain device-specific. TODOs are deferred.

### Offline edits, conflicts, and recovery

11. Must all planning features work offline for days? What sync delay is acceptable while both apps are open, and what status/retry controls should users see?
12. **Partly answered:** keep both conflicting versions and let the user choose. Define the conflict UI, which version appears on the calendar pending resolution, and what happens with deletion versus edit or a recurring series. Preserving both versions must not automatically schedule duplicate blocks/reminders.
13. On first sign-in, how should an existing local planner meet an existing remote planner: merge with a preview, choose one, or keep separate?
14. When restoring a backup on a connected device, should it replace the shared planner, import copies, or restore locally with sync paused? A local restore must not silently become an unintended multi-device replacement.
15. Is a trash/history period needed, and for how long? Define how long a device may remain offline and how it reconciles after deletion records expire.

### Calendar and device behavior

16. When traveling, should a 9 AM block remain at 9 AM locally or represent the same instant in its original time zone? Should routines and appointments behave differently? Recurrence must follow an explicit rule.
17. Should reminders fire on every enabled device or a preferred device? Must they work with the app closed, and what is acceptable when a device has not received a remote change yet?
18. **Partly answered:** prioritize a smaller personal iPhone prototype for demos before sync. Propose day navigation and basic block editing/persistence for that milestone; full recurrence/template/backup parity remains a 0.4 scope decision. Evaluate shared Tauri/React on the real device before deciding whether a separate SwiftUI client is needed.
19. Is a manual download/install update sufficient initially? Should automatic desktop updates, store updates, or Linux package-manager updates be supported, and which channel takes priority?

## Architecture candidates — not accepted decisions

### Storage and synchronization

The starting recommendation is to retain offline local storage and evolve SQLite to per-entity records, with a transactional migration from the version 1 planner document. A pending-operation log can make locally saved edits retryable; deletion records can prevent offline devices from resurrecting removed data. Concrete schema, revisions, retry protocol, retention, and conflict handling depend on the answers above.

Sync should exchange encrypted entity changes through an authenticated boundary. Clients validate decrypted content; the service enforces ownership, envelope format, quotas, and protocol rules without reading planner content. Copying the live SQLite file between devices or using a whole-planner last-write-wins upload risks overwriting unrelated edits. Device wall-clock timestamps alone are not a sufficient conflict policy. Recurring-series changes and detached occurrences need atomic operations so retries cannot duplicate blocks or lose exceptions.

Provider evaluation follows the account, cost, privacy, and offline requirements. Compare a managed database/auth service with an explicit sync protocol, a managed synchronization engine, and a self-hosted service. Do not choose a provider solely because it offers realtime subscriptions; those do not by themselves define offline conflict resolution.

End-to-end encryption is required. Provider evaluation must account for encrypted backup behavior, device key storage/recovery, metadata exposure, schema upgrades, and the loss of server-side content validation. Account authentication and access to decryption keys are distinct: a password reset must not imply that the service can recover plaintext. Trusted-device enrollment and a recovery key are accepted directions. Select a reviewed cryptographic design and maintained libraries rather than inventing encryption primitives. The specific key hierarchy, recovery implementation, and local-at-rest/backup encryption requirements remain open.

Initial provider screening, checked on 2026-09-29:

- [Supabase](https://supabase.com/pricing) combines managed database/auth services and has a free tier, but its USD 25/month Pro starting price exceeds the budget. A free-tier option would need explicit capacity limits, a backup strategy, and acceptance of its inactivity-pause behavior. It is not an agreed selection or a guaranteed cost-free growth path.
- [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/pricing/) and [D1](https://developers.cloudflare.com/d1/platform/pricing/) have free allowances and a USD 5/month Workers paid baseline with usage charges. This is a candidate for a small API and encrypted record store, but authentication, sync, and recovery still need implementation/integration. The paid baseline is not a hard spending cap.

A provider's no-overage tier or a demonstrably bounded hosting arrangement fits the hard ceiling better than uncapped usage billing. Include authentication email, backups, monitoring, and any other recurring services in the total. Billing alerts alone do not enforce the requirement. No service has been provisioned.

### Native applications

Retaining Tauri/React across targets is the initial candidate because it can reuse the existing app and domain code. Compare that with a dedicated SwiftUI iOS client if native interaction requirements justify a second UI implementation. A mobile prototype should verify touch calendar gestures, storage, file export/import, authentication callbacks, and notification behavior on an actual device before committing to feature parity.

Tauri documents macOS and iOS App Store packaging, with a macOS build environment and signing required. Shared framework support does not establish that Dayframe's existing plugins, layout, reminder loop, and capabilities work on iOS. See [Tauri's App Store guide](https://v2.tauri.app/distribute/app-store/) and [iOS signing guide](https://v2.tauri.app/distribute/sign/ios/).

### Distribution

| Target       | Candidate initial channel                                 | Decision still needed                                                             |
| ------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Fedora/Linux | RPM assets on GitHub Releases                             | Fedora baseline, additional formats/distros, package signing and update path      |
| macOS        | Direct download on GitHub Releases                        | Hardware coverage, signing/notarization access and installation experience        |
| iOS          | Personal Xcode installation or TestFlight; choice pending | Mac/iPhone access, free provisioning limits versus paid enrollment, feature scope |

For direct macOS downloads, Developer ID signing and notarization provide the preferred installation experience, but require enrollment. Without membership, a build must be described accurately as unnotarized and its installation experience tested; distributing through GitHub does not supply notarization. See [Tauri's macOS signing documentation](https://v2.tauri.app/distribute/sign/macos/).

Apple permits free personal-device testing through Xcode, with provisioning profiles expiring after seven days. This requires recurring provisioning and is not equivalent to a general public iPhone installer; see [Apple's developer account guide](https://developer.apple.com/help/account/basics/about-your-developer-account). The paid program provides TestFlight and App Store distribution and currently lists USD 99 annual membership; see [Apple Developer Program](https://developer.apple.com/programs/). [TestFlight](https://developer.apple.com/testflight/) is a beta channel. The owner is open to paid membership for App Store access, but enrollment, submission timing, and the initial public iPhone distribution path remain unresolved.

GitHub Releases can serve as the download hub without adding a separate website. The README should link only to real releases and tested platforms. No release assets were published when this ADR was started. A release workflow, supported artifact matrix, checksums, signing, and upgrade verification remain implementation work after channel selection.

## Alternatives and tradeoffs to evaluate

| Option                               | Benefit                                                     | Cost or limitation                                                            |
| ------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Ship in stages — selected            | Useful desktop, sync, and phone milestones with focused PRs | Full three-platform experience arrives in 0.4                                 |
| Ship all three together — superseded | One complete cross-device release                           | Larger milestone and delayed desktop improvements                             |
| Managed backend                      | Less infrastructure to operate                              | Provider limits, cost, data model, and portability constraints                |
| Self-hosted backend                  | Deployment control and fork flexibility                     | Maintenance, backups, availability, and recovery become our responsibility    |
| End-to-end encryption — required     | Service cannot read protected planner content               | Key recovery, device pairing, migrations, and conflict handling become harder |
| Shared Tauri UI                      | Reuse application and domain code                           | Mobile UX and platform capabilities still need dedicated work                 |
| Separate SwiftUI client              | Direct access to Apple UI conventions                       | Additional UI implementation and cross-client behavior testing                |

## Proposed acceptance evidence

These scenarios apply to their corresponding approved release milestones; sync and encryption checks belong to 0.3–0.4:

- Upgrade an existing MVP 0.1 planner without losing blocks, recurrence exceptions, templates, preferences, or the ability to export data. Recover safely from an interrupted migration.
- Make independent offline edits on two devices, reconnect in both orders, retry requests, and verify no duplicates or silently discarded changes.
- Exercise concurrent edits, deletion versus edit, series changes, backup restoration, and a device returning after a long absence.
- Verify sync authorization between separate users, and ensure account changes cannot mix local data unintentionally.
- Verify device enrollment and the agreed encrypted-data recovery flow. Confirm that server data and logs contain no plaintext planner content or decryption keys, and that tampered ciphertext is rejected safely.
- Exercise abuse controls and the selected budget-limit behavior without losing local edits.
- Verify selected time-zone/travel rules, DST transitions, and notification behavior on each supported platform.
- Install and upgrade actual release artifacts on the declared platforms. Verify persistence, permissions, backups, and launch from the OS app icon.

## Decision and consequences

The approved release split in the [implementation plan](../plans/mvp-2.md) separates local desktop foundations (0.2), encrypted desktop sync (0.3), and iPhone (0.4). It includes completion criteria and considered alternatives. [0.2 progress](../plans/0.2-progress.md) records implemented work and checks still needed. Later architectural choices remain proposed.

The three-release scope with a personal iPhone prototype prioritized before sync, 0.2 local storage design, public-sync direction, end-to-end encryption with recovery material/trusted devices, user-resolved conflicts, hard USD 20 monthly ceiling, initial GitHub desktop distribution, and deferral of TODOs are settled. The 0.3 sync provider/protocol, concrete encryption/recovery design, budget-enforcement mechanism, mobile implementation, and iPhone distribution path remain open. They are outside this branch's implementation scope.

Until then, MVP 0.1 behavior and supported-platform claims remain the baseline. No account, paid service, Apple enrollment, store submission, or public release is created by this ADR.
