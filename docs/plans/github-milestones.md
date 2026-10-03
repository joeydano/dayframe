# GitHub milestones and epics

These are ready-to-use milestone descriptions and tracking-issue bodies for the approved three-release [implementation plan](mvp-2.md), plus the personal iPhone prototype prioritized before sync on 2026-10-02. The owner is creating them on GitHub. See [copyable milestone templates and instructions](milestone-templates.md). These files do not assert that remote milestones or issues have already been created.

Use one GitHub milestone per release plus the interim prototype milestone, one tracking issue per epic, and small linked implementation issues/PRs underneath. An epic groups outcomes; it does not need a long-lived branch. Leave due dates unset until the platform prototype and key design decisions are complete.

## Milestone: 0.2 — Local foundations and desktop delivery

**Description:** Deliver reliable offline Fedora and macOS applications, a safe migration from the MVP 0.1 planner, compatible backups, and verified GitHub installer downloads. The personal iPhone prototype now has a separate milestone below. Accounts, cloud sync, production encryption flows, and a public iPhone app are outside this release.

### Epic: Verify the Mac and record desktop behavior

**Goal:** Demonstrate that the existing app works on the target Mac and document the desktop support boundary.

- [ ] Confirm Mac architecture/OS and document the initial desktop support matrix.
- [ ] Verify planning, persistence, native files, and notification behavior on macOS.
- [ ] Record current local time/account/reminder behavior and identify decisions needed before 0.3 sync.
- [ ] Record desktop signing/distribution prerequisites. Phone feasibility belongs to the next prototype milestone; backend selection belongs to 0.3.

**Dependencies:** none. **Plan:** desktop portion of chunk 1 and platform verification.

### Epic: Migrate planner storage safely

**Goal:** Replace whole-document persistence with an entity-based local model while retaining existing behavior and recoverability.

- [ ] Version the schema and migrate IDs, blocks, exceptions, categories, templates, and preferences transactionally.
- [ ] Keep old backups importable and preserve a recoverable migration snapshot.
- [ ] Define revision/deletion metadata and a transaction boundary for later sync, without an unbounded queue for local-only users.
- [ ] Verify interrupted migration, restart, invalid/newer schemas, and representative existing planners.

**Dependencies:** preserve the existing local planner/time contract; cross-device time rules remain a 0.3 decision. **Plan:** chunk 2.

### Epic: Publish installable desktop apps

**Goal:** Let users download and install verified Fedora and macOS builds without a development toolchain.

- [ ] Produce RPM and the selected macOS installer with documented signing/notarization status.
- [ ] Verify clean install, app-menu launch, upgrade, persistence, reminders, and backup flows on both desktops.
- [ ] Add release automation with test/build separated from publication.
- [ ] Publish actual assets and update the concise README/download guide with supported targets and release notes.

**Dependencies:** platform verification and storage migration. **Plan:** desktop portions of chunks 6–8.

## Milestone: iPhone prototype — personal demo

**Description:** The next development priority is an installed offline app the owner can use and demo on their iPhone 16, away from the Mac. Keep the 0.2/0.3/0.4 release numbers unchanged. See the [prototype plan](iphone-prototype.md) for its bounded scope and acceptance checklist.

### Epic: Build and install the personal phone prototype

**Goal:** Establish a repeatable native iPhone installation and local persistence path.

- [ ] Confirm Mac chip/macOS, iOS, and Xcode versions and install the required mobile tooling.
- [ ] Initialize the Tauri iOS target, review generated project files, and adapt desktop-only startup/plugins as needed.
- [ ] Install a build with bundled frontend assets; launch from the icon with the Mac disconnected and development server stopped.
- [ ] Save/reopen isolated demo data in SQLite and document personal provisioning/update steps and limitations.
- [ ] Record native file, notification, and secure-key capability findings where practical; file follow-up issues for capabilities outside the demo's acceptance criteria.

**Dependencies:** current desktop storage/setup PR merged; compatible Mac/Xcode/iPhone environment. Published 0.2 installers, backend selection, and paid Apple membership are not prerequisites. **Plan:** platform subset of chunk 1.

### Epic: Make a day-planning demo usable on iPhone

**Goal:** Gather real-device UI feedback from a small but useful offline planning session.

- [ ] Add today/previous/next day navigation and touch-friendly create/edit/delete for individual blocks.
- [ ] Support title, notes, existing category colors, and 15-minute start/end controls without requiring dragging.
- [ ] Check scrolling, touch targets, safe areas, and forms with the keyboard open.
- [ ] In airplane mode, create three blocks, edit their fields/times, delete one, and force-quit/reopen with changes intact.
- [ ] Record the tested build/device versions, known limitations, and observations from an actual demo session.

**Dependencies:** installed phone build and local persistence from the previous epic. **Plan:** bounded phone subset of chunk 6, completed before sync implementation. Full feature parity, accounts, sync, guaranteed closed-app reminders, and public distribution are deferred.

## Milestone: 0.3 — Encrypted desktop sync

**Description:** Add public, capacity-limited accounts and end-to-end encrypted synchronization between Fedora and macOS. Include trusted-device enrollment, a recovery key, user-resolved conflicts, safe restore, and a service operating model bounded by USD 20/month. The iPhone release is a follow-up milestone.

### Epic: Build accounts, encrypted vaults, and device recovery

**Goal:** Authenticate users and enroll devices without letting the service read planner content or recover decryption keys independently.

- [ ] Select the backend/auth method and document the encrypted-record/key design, visible metadata, and local backup/storage protection.
- [ ] Implement isolated accounts, sessions, secure device key persistence, and versioned authenticated encryption.
- [ ] Implement recovery-key confirmation, trusted-device enrollment, and the agreed device-revocation behavior.
- [ ] Verify tamper rejection, cross-account isolation, restart/recovery, and password reset without unintended key recovery.

**Dependencies:** 0.2 storage/contracts and verified platform key-storage access. **Plan:** chunk 3 and authentication/enrollment from chunk 4.

### Epic: Synchronize planners and resolve conflicts safely

**Goal:** Preserve offline edits and support the complete planner model across desktop devices.

- [ ] Deliver one encrypted block end to end with durable pending operations, cursors, acknowledgments, and idempotent retries.
- [ ] Extend sync to categories, templates, recurrence/exception operations, and agreed shared settings.
- [ ] Retain concurrent versions and offer explicit resolution without duplicating active blocks or reminders.
- [ ] Handle edit/delete conflicts, first sign-in reconciliation, backup restore, retention, and stale-device resync.
- [ ] Exercise crashes, dropped responses, both reconnection orders, and concurrent resolutions in isolated multi-client tests.

**Dependencies:** encrypted vault/accounts epic. **Plan:** chunks 4–5.

### Epic: Operate and release bounded public sync

**Goal:** Make sync available to Dayframe users within a tested capacity and the hard monthly budget.

- [ ] Enforce admission/storage/request limits and verify provider-level cost behavior; alerts alone are insufficient.
- [ ] Add account deletion, retention cleanup, encrypted service backups, and a tested restore procedure.
- [ ] Verify that sync suspension preserves local operation and queued edits.
- [ ] Review authentication, encryption, enrollment, and recovery; exclude content/keys from logs and diagnostics.
- [ ] Publish privacy/recovery guidance and the tested desktop sync release; enable public registration only within capacity.

**Dependencies:** both other 0.3 epics. **Plan:** cloud operations and desktop release portions of chunks 7–8.

## Milestone: 0.4 — iPhone and three-platform sync

**Description:** Finish a usable native iPhone app, integrate the proven encrypted sync protocol, and verify the complete Linux/macOS/iPhone experience. Distribute through the selected Apple channel. The TODO drawer, widgets, and collaboration remain outside this milestone unless separately agreed.

### Epic: Complete the iPhone planner and native behavior

**Goal:** Make the agreed calendar features practical on a phone while sharing the existing domain/sync behavior.

- [ ] Deliver phone navigation, touch editing, accessible controls, and the agreed recurrence/template/backup features.
- [ ] Integrate native file access, device key storage, authentication callbacks, and account/recovery flows.
- [ ] Implement and verify agreed local reminder and background/foreground behavior.
- [ ] Run the same encrypted sync/conflict fixtures as the desktop clients, plus real-device offline and lifecycle checks.

**Dependencies:** personal iPhone prototype; UI work may start independently, but complete sync acceptance depends on 0.3. **Plan:** iPhone portions of chunks 4 and 6.

### Epic: Distribute and verify the three-platform release

**Goal:** Make the iPhone client available through the agreed channel and demonstrate the complete original cross-device goal.

- [ ] Complete required enrollment/signing and build/distribution automation for the chosen Apple channel.
- [ ] Test create/edit/delete, recurrence, conflict resolution, device enrollment, and recovery across Fedora, macOS, and iPhone together.
- [ ] Verify fresh installs, upgrades, supported versions, and release artifact traceability.
- [ ] Publish the selected TestFlight/App Store link with accurate beta/release labeling and update the GitHub portal.

**Dependencies:** complete iPhone planner and working 0.3 service. **Plan:** iPhone/final integration portions of chunks 7–8.

## PR workflow

Keep the current desktop storage/setup PR focused. After it lands, prioritize the personal iPhone prototype in a separate branch from updated `main`. For each implementation PR, address one linked issue or reviewable part of an epic, and squash-merge once checks and review pass. Delete a completed remote feature branch when it is no longer needed. Keep the milestone open until all its acceptance criteria are met.

Do not collect the entire roadmap into one PR or reuse a squash-merged branch for subsequent work. Keep unfinished cloud features disabled. A merge is not a public release or permission to enable signups; the release milestone has its own readiness criteria.

TODO drawer and other deferred features can remain unmilestoned backlog issues. No guessed due dates or arbitrary assignments are needed to make this plan usable.
