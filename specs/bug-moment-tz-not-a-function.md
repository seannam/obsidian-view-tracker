# Bug: moment().tz is not a function

## Bug Description
When opening a tracked note, the view count fails to increment and the console shows:
```
View tracker: failed to update frontmatter TypeError: (0 , i.moment)(...).tz is not a function
```
The `trackView()` method crashes every time because `moment().tz()` is called but `moment-timezone` is not available in the Obsidian runtime. Since the error is thrown inside `processFrontMatter`, the entire frontmatter update (both view count and timestamp) is aborted.

**Expected:** View count increments and timestamp updates on each note open.
**Actual:** Nothing updates. Error logged to console on every file open.

## Problem Statement
The code on `main.ts:82` calls `moment().tz(this.settings.timezone)` which requires the `moment-timezone` addon. Obsidian bundles `moment` but does **not** bundle `moment-timezone`. The `.tz()` method does not exist on the base `moment` object.

## Solution Statement
Replace `moment().tz(timezone).format(...)` with the native browser `Intl.DateTimeFormat` API, which supports IANA timezones natively without any additional dependencies. This eliminates the dependency on `moment-timezone` entirely while preserving the same user-facing timestamp format.

Additionally, add persistent `console.log` debug statements throughout `trackView()` to aid future debugging.

## Steps to Reproduce
1. Enable the view-tracker plugin in Obsidian
2. Open any note that has `tracked: true` in frontmatter (or enable "Track all notes")
3. Open the developer console (Cmd+Option+I)
4. Observe the error: `View tracker: failed to update frontmatter TypeError: (0 , i.moment)(...).tz is not a function`
5. Check the note's frontmatter -- `views` and `last-viewed` are unchanged

## Root Cause Analysis
On `main.ts:82`, the code calls:
```ts
fm[lastViewedField] = moment().tz(this.settings.timezone).format(`MMM D, YYYY ${timeFmt} z`);
```

Obsidian ships with `moment` (the base library) as a global, but does **not** include `moment-timezone`. The `.tz()` method is an extension provided by `moment-timezone` and is simply not present on the `moment` object available in the Obsidian runtime.

Since this line throws inside the `processFrontMatter` callback, the error propagates up and the entire frontmatter update is skipped -- meaning the view count increment on line 80 is also lost even though that line itself is fine.

## Relevant Files
Use these files to fix the bug:

- `main.ts` -- Contains the `trackView()` method with the broken `moment().tz()` call on line 82. The timestamp formatting logic needs to be replaced and debug logging needs to be added.

## Step by Step Tasks
IMPORTANT: Execute every step in order, top to bottom.

### 1. Replace moment().tz() with Intl.DateTimeFormat in trackView()
- In `main.ts`, replace the `moment().tz(...).format(...)` call on line 82 with a helper that uses `Intl.DateTimeFormat` to produce the same output format.
- Create a private method `formatTimestamp()` on the plugin class that:
  - Takes no arguments (reads `this.settings.timezone` and `this.settings.use24HourFormat`)
  - Uses `new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12, timeZoneName: 'short' })` to format the current date
  - Returns a string like `"Mar 11, 2026 3:45 PM EDT"` (12h) or `"Mar 11, 2026 15:45 EDT"` (24h)
- Remove the `moment` import since it will no longer be used anywhere in the file.
- Update line 82 to call `this.formatTimestamp()` instead.

### 2. Add persistent console.log debug statements to trackView()
- Add a `console.log` at the entry of `trackView()` logging the file path.
- Add a `console.log` when the dedup window causes an early return, logging the remaining cooldown time.
- Add a `console.log` when the processing guard causes an early return.
- Add a `console.log` when tracking is skipped because `trackAllNotes` is false and `tracked` field is not set.
- Add a `console.log` after a successful frontmatter update, logging the new view count.
- Add a `console.log` in the catch block alongside the existing `console.error`.
- Prefix all logs with `[ViewTracker]` for easy filtering in the console.

### 3. Build and validate
- Run `npm run build` to verify the project compiles without errors.
- Manually verify in Obsidian:
  - Open a tracked note and confirm view count increments
  - Check the console for the new `[ViewTracker]` debug logs
  - Confirm the timestamp format matches the expected output

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd /Users/seannam/Developer/obsidian-view-tracker && npm run build` -- Build the plugin and verify no compilation errors

## Notes
- No new dependencies are needed. `Intl.DateTimeFormat` is a native browser API available in all Electron versions that Obsidian targets.
- The `moment` import from `obsidian` can be removed entirely since it is no longer used.
- The `Intl.DateTimeFormat` output format may differ very slightly from the previous `moment` format (e.g., comma placement), but the user-facing result will be equivalent and arguably more consistent across locales.
- The `z` format token in moment-timezone produces timezone abbreviations like "EST", "PDT". The equivalent in `Intl.DateTimeFormat` is `timeZoneName: 'short'`, which produces the same abbreviations.
