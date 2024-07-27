import { dialog } from 'electron';

export type AlwaysOnTopMode = 'never' | 'always' | 'inMiniMode';

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
  hardwareType: 0,
  radioGain: 0,
  alwaysOnTop: 'never',
  consentedToTelemetry: undefined
};

export interface Configuration {
  version?: number;

  audioApi: number;
  audioInputDeviceId: string;
  headsetOutputDeviceId: string;
  speakerOutputDeviceId: string;

  cid: string;
  password: string;
  callsign: string;

  hardwareType: number;
  radioGain: number;

  // Boolean is the prior type for this property, AlwaysOnTopMode is the updated type.
  alwaysOnTop: boolean | AlwaysOnTopMode;
  consentedToTelemetry: boolean | undefined;
}

/**
 * Migrates a version 1 config (one that doesn't have a version number) to a version 2 config.
 * @param config The config to migrate
 * @returns The migrated config
 */
const V1ToV2 = (config: Configuration) => {
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
};

/**
 * Migrates a config from previous versions to the current version.
 * @param config The config to migrate
 * @returns The migrated config
 */
export const migrateConfig = (config: Configuration) => {
  // Right now there's only migration from V1 to V2, but in the future
  // this would have additional migration methods. Each migration method
  // should take a config and return the migrated (or untouched) config,
  // which would then get passed to the next version migration.
  return V1ToV2(config);
};
