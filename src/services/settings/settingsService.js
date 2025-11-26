class SettingsService {
  constructor() {
    this.storageKey = 'eshare_settings';
    this.defaultSettings = {
      theme: 'dark', // 'light', 'dark', 'system'
      listView: false,
      defaultEncryption: true,
      saveEncryptionKeys: true,
      storageType: 'ipfs',
      desktopNotifications: false
    };
  }

  // Load settings from localStorage
  loadSettings() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...this.defaultSettings, ...parsed };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return { ...this.defaultSettings };
  }

  // Save settings to localStorage
  saveSettings(settings) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  // Update a specific setting
  updateSetting(key, value) {
    const currentSettings = this.loadSettings();
    const updatedSettings = { ...currentSettings, [key]: value };
    return this.saveSettings(updatedSettings);
  }

  // Reset to default settings
  resetSettings() {
    return this.saveSettings(this.defaultSettings);
  }

  // Get theme mode based on system preference
  getEffectiveThemeMode() {
    const settings = this.loadSettings();
    if (settings.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return settings.theme;
  }

  // Listen for system theme changes
  onSystemThemeChange(callback) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const settings = this.loadSettings();
      if (settings.theme === 'system') {
        callback(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handler);
    
    // Return cleanup function
    return () => mediaQuery.removeEventListener('change', handler);
  }
}

export const settingsService = new SettingsService();
