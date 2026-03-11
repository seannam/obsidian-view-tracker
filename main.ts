import { App, Plugin, PluginSettingTab, Setting, TFile, Notice } from 'obsidian';

interface ViewTrackerSettings {
  dedupWindowSeconds: number;
  viewsField: string;
  lastViewedField: string;
  trackedField: string;
  trackAllNotes: boolean;
  timezone: string;
  use24HourFormat: boolean;
}

const DEFAULT_SETTINGS: ViewTrackerSettings = {
  dedupWindowSeconds: 30,
  viewsField: 'views',
  lastViewedField: 'last-viewed',
  trackedField: 'tracked',
  trackAllNotes: false,
  timezone: 'America/New_York',
  use24HourFormat: false,
};

export default class ViewTrackerPlugin extends Plugin {
  settings: ViewTrackerSettings;
  private lastOpened: Map<string, number> = new Map();
  private processing: Set<string> = new Set();

  async onload() {
    await this.loadSettings();

    this.registerEvent(
      this.app.workspace.on('file-open', (file) => {
        if (file instanceof TFile && file.extension === 'md') {
          this.trackView(file);
        }
      })
    );

    this.addCommand({
      id: 'toggle-tracking',
      name: 'Toggle tracking for current note',
      checkCallback: (checking: boolean) => {
        const file = this.app.workspace.getActiveFile();
        if (file && file.extension === 'md') {
          if (!checking) {
            this.toggleTracking(file);
          }
          return true;
        }
        return false;
      },
    });

    this.addSettingTab(new ViewTrackerSettingTab(this.app, this));
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private formatTimestamp(): string {
    const { timezone, use24HourFormat } = this.settings;
    const now = new Date();
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: !use24HourFormat,
      timeZoneName: 'short',
    }).format(now);
    return formatted;
  }

  async trackView(file: TFile) {
    console.log(`[ViewTracker] trackView called for ${file.path}`);
    const now = Date.now();
    const lastTime = this.lastOpened.get(file.path) ?? 0;
    const dedupMs = this.settings.dedupWindowSeconds * 1000;

    if (now - lastTime < dedupMs) {
      console.log(`[ViewTracker] skipped: dedup window (${Math.ceil((dedupMs - (now - lastTime)) / 1000)}s remaining)`);
      return;
    }
    if (this.processing.has(file.path)) {
      console.log(`[ViewTracker] skipped: already processing ${file.path}`);
      return;
    }

    const { viewsField, lastViewedField, trackedField, trackAllNotes } = this.settings;

    this.processing.add(file.path);
    try {
      await this.app.fileManager.processFrontMatter(file, (fm) => {
        if (!trackAllNotes && !fm[trackedField]) {
          console.log(`[ViewTracker] skipped: note not tracked (trackAllNotes=${trackAllNotes}, ${trackedField}=${fm[trackedField]})`);
          return;
        }

        fm[viewsField] = (Number(fm[viewsField]) || 0) + 1;
        fm[lastViewedField] = this.formatTimestamp();
        console.log(`[ViewTracker] updated ${file.path}: ${viewsField}=${fm[viewsField]}, ${lastViewedField}=${fm[lastViewedField]}`);
      });
      this.lastOpened.set(file.path, now);
    } catch (e) {
      console.error('[ViewTracker] failed to update frontmatter', e);
    } finally {
      this.processing.delete(file.path);
    }
  }

  async toggleTracking(file: TFile) {
    const { trackedField } = this.settings;

    await this.app.fileManager.processFrontMatter(file, (fm) => {
      const wasTracked = !!fm[trackedField];
      if (wasTracked) {
        delete fm[trackedField];
        new Notice(`View tracking disabled for ${file.basename}`);
      } else {
        fm[trackedField] = true;
        new Notice(`View tracking enabled for ${file.basename}`);
      }
    });
  }
}

class ViewTrackerSettingTab extends PluginSettingTab {
  plugin: ViewTrackerPlugin;

  constructor(app: App, plugin: ViewTrackerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Track all notes')
      .setDesc('When enabled, all notes are tracked automatically. When disabled, only notes with the tracked field set to true are tracked.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.trackAllNotes)
          .onChange(async (value) => {
            this.plugin.settings.trackAllNotes = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Dedup window (seconds)')
      .setDesc('Minimum seconds between view count increments for the same note. Prevents inflation from rapid re-opens or tab switches.')
      .addSlider((slider) =>
        slider
          .setLimits(0, 300, 5)
          .setValue(this.plugin.settings.dedupWindowSeconds)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.dedupWindowSeconds = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Views field name')
      .setDesc('Frontmatter field for the view count.')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.viewsField)
          .onChange(async (value) => {
            this.plugin.settings.viewsField = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Last viewed field name')
      .setDesc('Frontmatter field for the last-viewed timestamp.')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.lastViewedField)
          .onChange(async (value) => {
            this.plugin.settings.lastViewedField = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Tracked field name')
      .setDesc('Frontmatter field used to opt-in to tracking.')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.trackedField)
          .onChange(async (value) => {
            this.plugin.settings.trackedField = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Timezone')
      .setDesc('IANA timezone for the last-viewed timestamp (e.g. America/New_York, Europe/London, Asia/Tokyo).')
      .addText((text) =>
        text
          .setValue(this.plugin.settings.timezone)
          .onChange(async (value) => {
            this.plugin.settings.timezone = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName('Use 24-hour format')
      .setDesc('Display timestamps in 24-hour format (e.g., 15:45) instead of 12-hour AM/PM format (e.g., 3:45 PM).')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.use24HourFormat)
          .onChange(async (value) => {
            this.plugin.settings.use24HourFormat = value;
            await this.plugin.saveSettings();
          })
      );
  }
}
