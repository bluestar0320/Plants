const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

// Registers the read-only StatsProvider (see modules/stats-export) as an
// exported <provider> in AndroidManifest.xml so another app on the device
// (e.g. "Total Care") can query it. Plain JS on purpose: app.json-referenced
// plugin files are loaded without a TypeScript build step.
const PROVIDER_CLASS = 'expo.modules.statsexport.StatsProvider';
const AUTHORITY_SUFFIX = '.statsexport';

const withStatsProvider = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    if (!mainApplication.provider) {
      mainApplication.provider = [];
    }

    const alreadyAdded = mainApplication.provider.some(
      (provider) => provider.$['android:name'] === PROVIDER_CLASS,
    );

    if (!alreadyAdded) {
      mainApplication.provider.push({
        $: {
          'android:name': PROVIDER_CLASS,
          'android:authorities': `${config.android.package}${AUTHORITY_SUFFIX}`,
          'android:exported': 'true',
          'android:enabled': 'true',
        },
      });
    }

    return config;
  });
};

module.exports = withStatsProvider;
