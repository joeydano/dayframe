# GitHub milestone templates

Keep the approved 0.2 / 0.3 / 0.4 public release milestones. Priority update (2026-10-02): add **iPhone prototype — personal demo** as the next development milestone before sync. If the three release milestones already exist, keep their numbers and add only the prototype; move any existing early-iPhone feasibility issues from 0.2 into it. Leave due dates blank for now.

## Add them on GitHub

1. Open [Dayframe's milestones](https://github.com/joeydano/dayframe/milestones), or navigate to **Issues → Milestones** in the repository.
2. Click **New milestone**.
3. Copy a title below into **Title** and the matching Markdown block into **Description**.
4. Leave **Due date** blank, keep the milestone open, and click **Create milestone**.
5. Repeat only for milestones that do not already exist. Update the existing 0.2 description to move its phone feasibility work into the prototype milestone.
6. When creating an issue or PR, select its milestone in the **Milestone** sidebar. Use a tracking issue for each epic and link its smaller issues/PRs there.

GitHub documents the creation flow in [Create and edit milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/creating-and-editing-milestones-for-issues-and-pull-requests). The separate [epic drafts](github-milestones.md) are ready to use as tracking-issue bodies.

## Title: 0.2 — Local foundations and desktop delivery

```markdown
Deliver reliable offline Fedora and macOS apps with safe local storage and straightforward installation.

Scope:

- Migrate the existing planner to versioned entity storage without losing data.
- Preserve existing JSON backup import/export and test migration recovery.
- Verify the macOS app and document its supported build/installation path.
- Build and test Fedora RPM and macOS installers, including signing decisions.
- Make the README/GitHub Releases a clear download and usage portal.

Done when: existing planners survive upgrade, both desktop apps install and work offline, and verified installer downloads are available. Phone prototype work has its own milestone.

Out of scope: accounts, hosted sync, production E2E encryption, public iPhone distribution, TODO drawer, widgets, and collaboration.
```

## Title: iPhone prototype — personal demo

```markdown
Make Dayframe usable on the owner's iPhone 16 for offline demos and hands-on UI feedback. This is the next development milestone, before encrypted desktop sync; retain the existing public release numbers.

Scope:

- Build and install a native Tauri iPhone app using the owner's Mac.
- Bundle frontend assets so the installed app launches from its icon without a development server or Mac connection.
- Add phone day navigation and create/edit/delete flows for individual blocks, titles, notes, and existing colored categories.
- Use touch-friendly time controls with 15-minute increments and persistent local SQLite storage.
- Verify safe areas, keyboard behavior, offline operation, and data after force-quit/reopen.
- Document installation/provisioning renewal, tested device/tool versions, known limitations, and demo feedback.

Done when: the owner can launch the installed app in airplane mode, plan a day, restart it with edits intact, and demo it away from the Mac.

Depends on: the current desktop storage/setup PR landing and a compatible Mac/Xcode/iPhone environment. Published desktop installers and a sync backend are not prerequisites.
Initial installation proposal: personal Xcode installation; free provisioning requires periodic renewal. TestFlight is optional if paid membership is chosen later.
Out of scope: accounts, cloud sync, E2E flows, full recurrence/template/backup parity, guaranteed closed-app reminders, TODOs, widgets, and App Store publication.
```

The [prototype plan](iphone-prototype.md) contains the device checklist and proposed implementation chunks. After the current desktop PR lands, prioritize this milestone in a separate branch; remaining desktop release work can continue independently.

## Title: 0.3 — Encrypted desktop sync

```markdown
Synchronize each user's private planner between Fedora and macOS with end-to-end encryption.

Scope:

- Accounts, isolated user data, device enrollment, and secure sessions.
- Client-side encryption, trusted-device enrollment, and recovery keys.
- Durable offline changes, retry-safe sync, and all planner entities.
- Preserve conflicting versions and let the user resolve them.
- Handle deletions, recurrence, initial reconciliation, and backup restores safely.
- Enforce public-service capacity limits and a hard $20/month total service budget.
- Add account deletion, encrypted service backups, recovery procedures, and privacy guidance.

Done when: both desktop apps pass multi-device offline/conflict/recovery tests, the service cannot read planner content, and public sync operates within verified cost limits. Local planning continues when sync is unavailable.

Depends on: 0.2.
Out of scope: public iPhone distribution, shared calendars, TODO drawer, and widgets.
```

## Title: 0.4 — iPhone and three-platform sync

```markdown
Deliver a usable native iPhone app and complete the Linux/macOS/iPhone synchronization experience.

Scope:

- A dedicated phone layout and practical touch interactions for agreed calendar features.
- Native file access, secure device keys, account/recovery flows, and reminders.
- Integrate the proven encrypted sync protocol and offline/conflict handling.
- Verify foreground/background behavior and clearly document reminder limitations.
- Complete Apple enrollment/signing and the selected TestFlight/App Store distribution path.
- Test all three platforms together and add the real iPhone installation link to the GitHub portal.

Done when: real Fedora, macOS, and iPhone clients pass the agreed planning, sync, conflict, and recovery flows, and the iPhone build is available through the chosen Apple channel. Clearly distinguish beta availability from an App Store release.

Depends on: 0.3 and the personal iPhone prototype findings.
Out of scope: TODO drawer, widgets, collaboration, and unrelated feature expansion.
```
