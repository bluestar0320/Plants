const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

// Registers the WateringWidgetProvider (see modules/stats-export) as a home
// screen widget receiver in AndroidManifest.xml. Plain JS on purpose:
// app.json-referenced plugin files are loaded without a TypeScript build step.
const RECEIVER_CLASS = 'expo.modules.statsexport.WateringWidgetProvider';

const withWateringWidget = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);

    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    const alreadyAdded = mainApplication.receiver.some(
      (receiver) => receiver.$['android:name'] === RECEIVER_CLASS,
    );

    if (!alreadyAdded) {
      mainApplication.receiver.push({
        $: {
          'android:name': RECEIVER_CLASS,
          'android:exported': 'false',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/watering_widget_info',
            },
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withWateringWidget;
