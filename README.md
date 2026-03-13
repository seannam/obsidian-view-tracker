# Obsidian View Tracker

Track how many times you open each note -- directly in YAML frontmatter.

## Features

- Increments a `views` counter and sets a `last-viewed` timestamp each time you open a note
- Configurable dedup window (default 30s) prevents inflation from rapid re-opens or tab switches
- Opt-in per note or track all notes globally
- Customizable frontmatter field names
- Configurable timezone and 12h/24h timestamp format
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
| Timezone | `America/New_York` | IANA timezone for timestamps |
| 24-hour format | Off | Use 24-hour time instead of 12-hour AM/PM |

## Installation

### From Community Plugins

1. Open **Settings > Community plugins**
2. Search for "View Tracker"
3. Click **Install**, then **Enable**

### Manual

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/seannam/obsidian-view-tracker/releases/latest)
2. Create a `view-tracker` folder in your vault's `.obsidian/plugins/` directory
3. Copy both files into it
4. Enable the plugin in **Settings > Community plugins**

## Development

```bash
npm install
npm run dev    # development build with sourcemaps
npm run build  # production build (minified)
```
