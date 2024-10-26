import { dialog } from 'electron';
import Store from 'electron-store';

import { AlwaysOnTopMode, Configuration, RadioEffects } from '../shared/config.type';

// Used to check for older settings that need upgrading. This should get
// increased any time the Configuration object has a breaking change.
export const currentSettingsVersion = 2;

// Default application configuration. Used as a fallback when any of the properties
// are missing from the saved configuration.
export const defaultConfiguration = {
  version: currentSettingsVersion,
  audioApi: -1,
  audioInputDeviceId: '',
  headsetOutputDeviceId: '',
  speakerOutputDeviceId: '',
  cid: '',
  password: '',
  callsign: '',
  radioEffects: 'on' as RadioEffects,
  hardwareType: 0,
  radioGain: 0,
  alwaysOnTop: 'never' as AlwaysOnTopMode
};

class ConfigManager {
  private static _instance: ConfigManager | null = null;
  private _currentConfiguration: Configuration | null = null;
  private _store: Store | null = null;

  /**
   * Gets the current configuration
   */
  get config() {
    if (!this._currentConfiguration) {
      throw new Error('Configuration must be loaded with loadConfig() first.');
    }

    return this._currentConfiguration;
  }

  /**
   * Sets the current configuration. To update individual config properties
   * use updateConfig() instead.
   */
  set config(newConfig: Configuration) {
    this._currentConfiguration = newConfig;
    this.saveConfig();
  }

  /**
   * Retrieves an instance of the config manager.
   * @returns The config manager instance
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager._instance) {
      ConfigManager._instance = new ConfigManager();
    }

    return ConfigManager._instance;
  }

  /**
   * Sets the backing store for settings. This must be called prior to any
   * calls to loadConfig() or setting any config properties.
   * @param store The electron store to use.
   */
  public setStore(store: Store) {
    this._store = store;
  }

  /**
   * Loads the stored configuration, applying any migrations as necessary based
   * on the version of the saved config vs. the current version.
   */
  public loadConfig() {
    if (!this._store) {
      throw new Error(
        'The backing store must be set using setStore() before calling loadConfig().'
      );
    }

    let storedConfiguration: Configuration;

    // Load the stored config. Handle any JSON parsing errors by reverting to the default config.
    try {
      storedConfiguration = JSON.parse(
        this._store.get('configuration', '{}') as string
      ) as Configuration;
    } catch (err) {
      console.error(err);
      storedConfiguration = defaultConfiguration;
    }

    // If a stored config exists then migrate it to the current version.
    if (Object.keys(storedConfiguration).length !== 0) {
      storedConfiguration = this.migrateConfig(storedConfiguration);
    }

    // Apply the default config then override the defaults with the saved config.
    this.config = {
      ...defaultConfiguration,
      ...storedConfiguration
    };
  }

  /**
   * Updates the configuration properties with the specified values and saves
   * the updated configuration to the backing store.
   * @param partialConfig The configuration properties to update
   */
  public updateConfig(partialConfig: Partial<Configuration>) {
    this.config = { ...this.config, ...partialConfig };
  }

  /**
   * Saves the config to the backing store.
   */
  private saveConfig() {
    if (!this._store) {
      throw new Error(
        'The backing store must be set using setStore() before calling saveConfig().'
      );
    }

    this._store.set('configuration', JSON.stringify(this._currentConfiguration));
  }

  /**
   * Migrates a version 1 config (one that doesn't have a version number) to a version 2 config.
   * @param config The config to migrate
   * @returns The migrated config
   */
  private V1ToV2(config: Configuration) {
    // Don't migrate v2 or newer configs.
    if (config.version && config.version >= 2) {
      return config;
    }

    // If the audio api isn't set then it gets wiped out so the user is forced to reset
    // the audio settings.
    if (config.audioApi !== -1) {
      config.audioApi = defaultConfiguration.audioApi;
      config.audioInputDeviceId = defaultConfiguration.audioInputDeviceId;
      config.headsetOutputDeviceId = defaultConfiguration.headsetOutputDeviceId;
      config.speakerOutputDeviceId = defaultConfiguration.speakerOutputDeviceId;

      dialog.showMessageBoxSync({
        type: 'warning',
        message:
          'Your audio settings have been reset. Please re-configure your audio devices in the settings.',
        buttons: ['OK']
      });
    }

    // Upgrade the alwaysOnTop property from yes/no to the three mode version
    if (typeof config.alwaysOnTop === 'boolean') {
      config.alwaysOnTop ? (config.alwaysOnTop = 'always') : (config.alwaysOnTop = 'never');
    }

    // Migration complete
    config.version = 2;

    return config;
  }

  /**
   * Migrates a config from previous versions to the current version.
   * @param config The config to migrate
   * @returns The migrated config
   */
  private migrateConfig(config: Configuration) {
    // Right now there's only migration from V1 to V2, but in the future
    // this would have additional migration methods. Each migration method
    // should take a config and return the migrated (or untouched) config,
    // which would then get passed to the next version migration.
    return this.V1ToV2(config);
  }
}

const configManagerInstance = ConfigManager.getInstance();
export default configManagerInstance;
