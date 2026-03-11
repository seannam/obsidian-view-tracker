# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm install          # install dependencies
npm run dev          # development build (inline sourcemaps)
npm run build        # production build (minified, no sourcemaps)
```

There are no tests or linting configured.

## Architecture

This is an Obsidian plugin (single-file, `main.ts`) that tracks note view counts via YAML frontmatter. The build uses esbuild (`esbuild.config.mjs`) to bundle `main.ts` into `main.js` (CommonJS format).

**Key classes:**
- `ViewTrackerPlugin` (extends `Plugin`) -- registers a `file-open` event listener that calls `trackView()`, which uses `processFrontMatter()` to increment a views counter and set a last-viewed timestamp. An in-memory `Map<string, number>` (`lastOpened`) handles deduplication within a configurable time window.
- `ViewTrackerSettingTab` (extends `PluginSettingTab`) -- settings UI for field names, dedup window, and track-all-notes toggle.

**Tracking modes:** opt-in (note must have `tracked: true` in frontmatter) or track-all (setting). Toggling is available via command palette.

**Output artifacts:** `main.js` and `manifest.json` are the two files needed for installation into an Obsidian vault's `.obsidian/plugins/view-tracker/` directory.

## Conventions

- `obsidian` and `@codemirror/*` packages are externalized in the bundle (provided by the Obsidian runtime)
- Use conventional commit message format
