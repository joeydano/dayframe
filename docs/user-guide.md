# Using Dayframe

## Plan a day

Click an empty calendar time to start a block, or drag across a time range. You can also choose **New block**, then enter its date and times. Give it a title, category, and optional notes. Dates and times follow the workstation's current time zone.

Drag the middle of a block to move it. Drag its top or bottom edge to resize it. Calendar gestures and entered times use 15-minute increments. Midnight as an end time means the end of the selected day; split overnight work into two blocks.

Use **Day** or **Week** to change views, the arrows to move through time, and **Today** to return. The small calendar selects a specific date. Category checkmarks show or hide categories without deleting anything. **Settings → Categories** changes their names and colors.

Overlaps are permitted. The editor warns about blocks that overlap on the edited day; week view arranges them side by side. The footer's scheduled hours sum all block durations, including overlaps.

## Repeating blocks

Choose **Every day**, **Every weekday**, or **Every week** in the editor. An optional repeat-through date is inclusive. Weekdays means Monday through Friday. Weekly recurrence uses the weekday of the series start date.

Editing or deleting a recurring block offers **This occurrence only** or **Entire series**. An individual edit makes an independent block and excludes the original occurrence from its series. Dragging or resizing always affects only that occurrence. Editing the series later does not change detached blocks. Deleting a series does not delete previously detached blocks.

## Templates

Open **Daily templates**, select the day to capture, name it, and save it. The template includes all that day's blocks, including hidden categories and recurring occurrences.

To reuse it, choose a destination day and click **Apply**. The new blocks are independent, non-recurring copies. This adds blocks; it does not replace or deduplicate existing plans. Applying the same template twice creates two sets of blocks.

## Reminders

Enable **Settings → General → Desktop reminders**. Then choose a lead time on individual blocks. A block with no reminder selected produces no notification.

Keep the native app open or minimized. Closing it stops reminders. Reminders are not delivered while the workstation sleeps; on resume, queued reminders up to five minutes late may be delivered, and older ones are skipped. OS notification permissions and Do Not Disturb still apply. The rolling native queue holds up to 14 days, refreshed while the frontend runs. Minimized-webview throttling does not stop already queued native reminders.

## Backups

Use **Settings → Backups → Export backup** to save a portable JSON file. To restore, choose a compatible Dayframe backup, review the block/template counts, and confirm replacement. Export the current planner first if you need to preserve it.

Backups are plain JSON and contain your titles and notes. Keep them wherever you normally keep personal backups. Files over 5 MB, invalid data, and unsupported versions are rejected before changing storage.

## What's next

MVP 0.2 will add a checkable per-day TODO panel/drawer. That is separate from calendar-block completion. macOS/iOS, cross-device sync, desktop idle displays, and mobile widgets remain later milestones; see ADR 001.
