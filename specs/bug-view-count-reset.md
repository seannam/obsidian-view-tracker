# Bug: View count not incrementing or resetting to 1

## Bug Description
The `views` counter in frontmatter sometimes fails to increment after the dedup window passes, or resets back to 1 unexpectedly. Expected behavior: each qualifying note open (outside the dedup window) should increment the counter by exactly 1, preserving the existing count.

## Problem Statement
The `trackView` method has a timing flaw and lacks defensive type handling. The dedup guard (`lastOpened`) is set **before** `processFrontMatter` completes, so if the frontmatter write fails (e.g., invalid timezone, file locked, YAML error), the increment is silently lost and retries within the dedup window are blocked. Additionally, the views value is not coerced to a number, so non-numeric values produce wrong arithmetic. These issues combine to cause missed increments and apparent resets.

## Solution Statement
1. Move `lastOpened.set()` to **after** `processFrontMatter` resolves successfully, so failed writes don't block future retries.
2. Coerce `fm[viewsField]` to a number with a fallback to 0, preventing string concatenation or NaN propagation.
3. Add a processing guard to prevent overlapping `processFrontMatter` calls on the same file.

## Steps to Reproduce
1. Open a note with `tracked: true` and an existing `views: N` in frontmatter
2. Wait for the dedup window to pass, re-open the note
3. Observe that views sometimes stays at `N` (not incrementing)
4. In some cases, views resets to `1` after plugin reload or settings change

## Root Cause Analysis
Three issues in `trackView()` (`main.ts:62-78`):

1. **Premature dedup update (line 68):** `this.lastOpened.set(file.path, now)` executes before `processFrontMatter` (line 72). If `processFrontMatter` throws or the callback errors out (e.g., `moment().tz(invalidTZ)` misbehaves), the file write never happens but the dedup window is already set. The next legitimate `file-open` within the window is blocked, so the increment is permanently lost for that window.

2. **No type coercion (line 75):** `fm[viewsField] ?? 0` only handles `null`/`undefined`. If the value is a string (e.g., user manually edited frontmatter to `views: "5"`), `"5" + 1 = "51"` (string concatenation). If the value is `NaN`, `NaN ?? 0 = NaN`, producing `NaN + 1 = NaN`.

3. **Coupled operations (lines 75-76):** The view increment and timestamp update execute in the same callback. If the timestamp line throws, `processFrontMatter` may discard the entire mutation (including the already-computed increment), since the callback did not complete normally.

## Relevant Files
Use these files to fix the bug:

- `main.ts` -- Contains `trackView()` (lines 62-78) where the dedup guard, increment, and frontmatter write all happen. This is the only file that needs changes.

## Step by Step Tasks

### 1. Move `lastOpened.set()` after successful `processFrontMatter`
- In `trackView()`, remove `this.lastOpened.set(file.path, now)` from line 68 (before `processFrontMatter`)
- Place it **after** the `await this.app.fileManager.processFrontMatter(...)` call resolves
- This ensures the dedup window is only set when the frontmatter was actually written
- Wrap `processFrontMatter` in a try/catch so that if it throws, `lastOpened` is not updated and the next `file-open` can retry

### 2. Add type coercion for the views field
- Replace `(fm[viewsField] ?? 0) + 1` with a safe numeric coercion
- Use `(typeof fm[viewsField] === 'number' ? fm[viewsField] : 0) + 1` or `(Number(fm[viewsField]) || 0) + 1`
- This prevents string concatenation, NaN propagation, and handles edge cases

### 3. Add a processing guard to prevent concurrent mutations
- Add a `private processing: Set<string> = new Set()` field to `ViewTrackerPlugin`
- At the top of `trackView`, check `if (this.processing.has(file.path)) return;`
- Add `this.processing.add(file.path)` before `processFrontMatter` and remove it in a `finally` block
- This prevents overlapping `processFrontMatter` calls for the same file if `file-open` fires multiple times in rapid succession

### 4. Build and validate
- Run `npm run build` to ensure the plugin compiles without errors
- Manually test in Obsidian: open a tracked note, verify views increments, close and reopen after dedup window, verify it increments again

## Validation Commands
Execute every command to validate the bug is fixed with zero regressions.

- `cd /Users/seannam/Developer/obsidian-view-tracker && npm run build` -- Build the plugin and verify no compilation errors

## Notes
- There are no automated tests configured for this project (per CLAUDE.md), so validation is done via build + manual testing in Obsidian.
- The `file-open` event handler does not `await` `trackView()`, which means multiple calls can overlap. The processing guard addresses this.
- The dedup slider allows a minimum of 0 seconds (`setLimits(0, 300, 5)`). Consider changing the minimum to 5 to prevent edge cases, but this is optional and not part of the core fix.
