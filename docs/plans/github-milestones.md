# GitHub milestones and epics

These are ready-to-use milestone descriptions and tracking-issue bodies for the approved three-release [implementation plan](mvp-2.md). The owner is creating them on GitHub. See [copyable milestone templates and instructions](milestone-templates.md). These files do not assert that remote milestones or issues have already been created.

Use one GitHub milestone per release, one tracking issue per epic, and small linked implementation issues/PRs underneath. An epic groups outcomes; it does not need a long-lived branch. Leave due dates unset until the platform prototype and key design decisions are complete.

## Milestone: 0.2 — Local foundations and desktop delivery

**Description:** Deliver reliable offline Fedora and macOS applications, a safe migration from the MVP 0.1 planner, compatible backups, and verified GitHub installer downloads. Prove the iPhone build/native capability path early. Accounts, cloud sync, production encryption flows, and a public iPhone app are outside this release.

### Epic: Verify Apple platforms and define cross-device contracts

**Goal:** Demonstrate that the existing Tauri architecture can support the target devices and resolve data-affecting behavior before changing storage.

- [ ] Confirm Mac architecture/OS and iPhone OS; document the initial support matrix.
- [ ] Run the local app on macOS and a minimal iPhone prototype; verify persistence, touch interaction, native files, notifications, and key-storage access.
- [ ] Agree on time-zone, offline/account, preference-sync, and reminder behavior in ADR 002.
- [ ] Record signing/distribution prerequisites and screen backend options against the hard cost ceiling.

**Dependencies:** none. **Plan:** chunk 1 and desktop platform verification.

### Epic: Migrate planner storage safely

**Goal:** Replace whole-document persistence with an entity-based local model while retaining existing behavior and recoverability.

- [ ] Version the schema and migrate IDs, blocks, exceptions, categories, templates, and preferences transactionally.
- [ ] Keep old backups importable and preserve a recoverable migration snapshot.
- [ ] Define revision/deletion metadata and a transaction boundary for later sync, without an unbounded queue for local-only users.
- [ ] Verify interrupted migration, restart, invalid/newer schemas, and representative existing planners.

**Dependencies:** data/time decisions from the platform/contracts epic. **Plan:** chunk 2.

### Epic: Publish installable desktop apps

**Goal:** Let users download and install verified Fedora and macOS builds without a development toolchain.

- [ ] Produce RPM and the selected macOS installer with documented signing/notarization status.
- [ ] Verify clean install, app-menu launch, upgrade, persistence, reminders, and backup flows on both desktops.
- [ ] Add release automation with test/build separated from publication.
- [ ] Publish actual assets and update the concise README/download guide with supported targets and release notes.

**Dependencies:** platform verification and storage migration. **Plan:** desktop portions of chunks 6–8.

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

**Dependencies:** early iPhone prototype; UI work may start independently, but complete sync acceptance depends on 0.3. **Plan:** iPhone portions of chunks 4 and 6.

### Epic: Distribute and verify the three-platform release

**Goal:** Make the iPhone client available through the agreed channel and demonstrate the complete original cross-device goal.

- [ ] Complete required enrollment/signing and build/distribution automation for the chosen Apple channel.
- [ ] Test create/edit/delete, recurrence, conflict resolution, device enrollment, and recovery across Fedora, macOS, and iPhone together.
- [ ] Verify fresh installs, upgrades, supported versions, and release artifact traceability.
- [ ] Publish the selected TestFlight/App Store link with accurate beta/release labeling and update the GitHub portal.

**Dependencies:** complete iPhone planner and working 0.3 service. **Plan:** iPhone/final integration portions of chunks 7–8.

## PR workflow

Start with the current documentation change. For implementation, branch from updated `main`, address one linked issue or reviewable part of an epic, and squash-merge once checks and review pass. Delete a completed remote feature branch when it is no longer needed. Keep the milestone open until all its acceptance criteria are met.

Do not collect the entire roadmap into one PR or reuse a squash-merged branch for subsequent work. Keep unfinished cloud features disabled. A merge is not a public release or permission to enable signups; the release milestone has its own readiness criteria.

TODO drawer and other deferred features can remain unmilestoned backlog issues. No guessed due dates or arbitrary assignments are needed to make this plan usable.
