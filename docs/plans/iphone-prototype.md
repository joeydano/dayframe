# iPhone prototype — personal demo

- Priority: next development milestone, ahead of encrypted desktop sync
- Updated: 2026-10-02
- Decision: [ADR 002](../adr/0002-storage-sync-and-distribution.md)
- Target: the owner's iPhone 16, built using their Apple Silicon MacBook Air

## Outcome

Install an offline Dayframe app that the owner can open from the phone's icon, use during a demo, and evaluate away from the Mac. The installed build must include its frontend assets and work without a development server or account. A simulator or a browser preview alone does not complete this milestone.

This is an interim milestone named **iPhone prototype — personal demo**. Keep the existing public release numbers: 0.2 desktop delivery, 0.3 encrypted desktop sync, and 0.4 the complete iPhone/three-platform release. Finish the current desktop storage/setup PR, then prioritize this prototype in focused follow-up PRs. Publishing desktop installers and selecting a sync provider do not block the phone demo.

## Proposed scope

- A phone day view with today/previous/next navigation.
- Create, edit, and delete individual blocks with titles, notes, and existing colored categories.
- Edit start/end times in 15-minute increments using touch-friendly controls. Dragging can be explored after the basic flow works.
- Reuse the planner model and SQLite persistence; retain changes across app restarts while offline.
- Make scrolling, touch targets, safe areas, and the on-screen keyboard practical on the iPhone 16.

Use isolated demo data during development. Do not migrate or overwrite the owner's real desktop planner for testing. Local persistence is not an E2E-encryption implementation; no planner content is uploaded in this milestone.

## Work in three small chunks

1. **Build and install on the phone.** Confirm the Mac chip, macOS, iOS, and Xcode versions; initialize the Tauri iOS target; adapt desktop-only startup/plugin code as needed. Install a build with bundled frontend assets and prove local save/reopen. Record build, signing, and installation steps for repeatable testing.
2. **Make one planning session usable.** Add the bounded day-view and block-editing flows above. Reuse domain logic and record mobile-specific limitations. Recurrence/template parity and production reminder behavior are follow-up work.
3. **Demo and capture feedback.** Run the acceptance checklist on the real phone, record the tested versions and known issues, and keep a short list of observations for the next UI iteration. Probe file access, notifications, and secure-key storage where practical; unresolved optional capabilities should become explicit follow-up issues rather than silently expanding the demo's scope.

## Installation proposal

Start with personal installation from Xcode on the Mac. Full Xcode and the appropriate mobile toolchain are required; follow [Tauri's iOS prerequisites](https://v2.tauri.app/start/prerequisites/#ios) and [development guide](https://v2.tauri.app/develop/). Desktop startup alone does not verify mobile compatibility.

A free Apple account can support personal-device testing, but its provisioning profiles expire after seven days and require rebuilding/reinstalling. Document renewal and verify whether the existing demo data survives the chosen update process; do not assume it does. See [Apple's account guide](https://developer.apple.com/help/account/basics/about-your-developer-account). TestFlight can be considered if paid membership is chosen later; membership and public distribution are not prerequisites for this prototype.

## Completion checklist

- [ ] Install on the owner's iPhone 16 and launch from the app icon with the Mac disconnected and development server stopped.
- [ ] In airplane mode, navigate days and create three blocks; edit a title, note, category, and start/end time; delete one block.
- [ ] Force-quit and reopen: retained blocks and edits remain correct, including the deletion.
- [ ] Confirm forms remain usable with the keyboard open and controls are not hidden behind safe areas.
- [ ] Record the exact device/tool versions, build commit, installation/renewal instructions, and known limitations.
- [ ] Capture feedback from a real demo session and turn the next improvements into small issues.

## Deferred

Accounts, hosted infrastructure, encrypted sync, device enrollment/recovery, full recurrence/template/backup parity, guaranteed closed-app reminders, widgets, TODOs, iPad-specific layouts, and App Store publication. The prototype informs those later milestones; it does not claim they are implemented.

## Branch boundary

Keep `feat/dayframe-mvp-2` focused on its existing desktop/storage/setup change. Start prototype implementation from updated `main` after that PR lands, in a separate branch such as `feat/iphone-prototype`. Keep each PR small enough to verify independently. The first build/install result is the decision point for continuing with shared Tauri/React or revisiting the mobile approach.
