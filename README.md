# Obsidian View Tracker

Obsidian plugin that tracks note view counts and last-viewed dates via YAML frontmatter.

## How it works

- Listens for `file-open` workspace events when you navigate to a note
- Increments a `views` counter and sets `last-viewed` to the current timestamp in frontmatter
- A dedup window (default 30s) prevents inflation from rapid re-opens or tab switches
- No server, no network, no database -- everything lives in the note itself

## Usage

Add `tracked: true` to any note's frontmatter to start tracking:

```yaml
---
tracked: true
---
```

Or use the command palette: **View Tracker: Toggle tracking for current note**.

You can also enable "Track all notes" in settings to skip the opt-in step.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Track all notes | Off | Track every note instead of opt-in only |
| Dedup window | 30s | Minimum seconds between increments for the same note |
| Views field | `views` | Frontmatter field name for view count |
| Last viewed field | `last-viewed` | Frontmatter field name for timestamp |
| Tracked field | `tracked` | Frontmatter field name for opt-in flag |

## Development

```bash
npm install
npm run dev    # development build with sourcemaps
npm run build  # production build (minified)
```

## Installation

Copy `main.js` and `manifest.json` to your vault's `.obsidian/plugins/view-tracker/` directory, then enable the plugin in Obsidian settings.
