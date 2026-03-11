# Bug: Timestamp format needs 12h/24h toggle and human-friendly display

## Bug Description
The `last-viewed` timestamp is stored in the configured timezone but lacks a user toggle for 12-hour vs 24-hour format. The plugin should default to 12-hour (AM/PM) format but allow users to switch to 24-hour format. The timestamp must be human-friendly and natural (no ISO `T` separator, no seconds, includes timezone abbreviation). Internally the plugin should derive times from UTC and convert to the display timezone at write time.

## Problem Statement
The timestamp format is hard-coded to 12-hour AM/PM (`'MMM D, YYYY h:mm A z'`). There is no setting to switch between 12-hour and 24-hour format. Users who prefer 24-hour time have no way to configure this.

## Solution Statement
1. Add a `use24HourFormat` boolean setting (default: `false`) to `ViewTrackerSettings`.
2. Update the format string in `trackView()` to conditionally use `h:mm A` (12h) or `HH:mm` (24h).
3. Add a corresponding toggle in `ViewTrackerSettingTab`.

## Steps to Reproduce
1. Open a tracked note and observe the `last-viewed` frontmatter value
2. Note that the timestamp always uses 12-hour AM/PM format (e.g., `Mar 10, 2026 3:45 PM EST`)
3. There is no setting to switch to 24-hour format (e.g., `Mar 10, 2026 15:45 EST`)

## Root Cause Analysis
The format string on line 76 of `main.ts` is hard-coded:
```typescript
fm[lastViewedField] = moment().tz(this.settings.timezone).format('MMM D, YYYY h:mm A z');
```
There is no `use24HourFormat` setting in the `ViewTrackerSettings` interface or `DEFAULT_SETTINGS` object, and no corresponding UI control in the settings tab. The format string needs to be dynamic based on user preference.

## Relevant Files
Use these files to fix the bug:

- `main.ts` -- Contains the `ViewTrackerSettings` interface (line 3), `DEFAULT_SETTINGS` (line 12), `trackView()` format string (line 76), and `ViewTrackerSettingTab` UI (line 96). All changes are in this single file.

## Step by Step Tasks

### 1. Add `use24HourFormat` to settings interface and defaults
- Add `use24HourFormat: boolean` to the `ViewTrackerSettings` interface
- Add `use24HourFormat: false` to `DEFAULT_SETTINGS` (default to 12-hour)

### 2. Update the timestamp format string in `trackView()`
- Replace the hard-coded format string with a conditional:
  - 12-hour: `'MMM D, YYYY h:mm A z'` (e.g., "Mar 10, 2026 3:45 PM EST")
  - 24-hour: `'MMM D, YYYY HH:mm z'` (e.g., "Mar 10, 2026 15:45 EST")
- Use `this.settings.use24HourFormat` to select the format

### 3. Add the toggle to the settings tab
- In `ViewTrackerSettingTab.display()`, add a new `Setting` with a toggle control
- Name: "Use 24-hour format"
- Description: "Display timestamps in 24-hour format (e.g., 15:45) instead of 12-hour AM/PM format (e.g., 3:45 PM)."
- Place it after the timezone setting since they are related
- Wire up `onChange` to save the setting

### 4. Build and validate
- Run `npm run build` to ensure the plugin compiles without errors
- Manually test in Obsidian: toggle the setting and open a tracked note, verify the timestamp format changes accordingly

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd /Users/seannam/Developer/obsidian-view-tracker && npm run build` -- Build the plugin and verify no compilation errors

## Notes
- The timestamp is computed from UTC via `moment()` (UTC internally) and converted to the display timezone via `.tz(timezone)`. This is correct and already satisfies the "derived from UTC" requirement.
- The timezone abbreviation (`z` in the format string) is included in both 12h and 24h formats so users can identify the timezone.
- Existing `last-viewed` values in notes are not retroactively reformatted. Only new views will use the updated format. This is expected behavior.
- No new dependencies are needed. Obsidian's bundled `moment` includes timezone support.
