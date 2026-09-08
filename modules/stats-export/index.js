import { Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

let native = null;
if (Platform.OS === 'android') {
  try {
    native = requireNativeModule('ExpoStatsExport');
  } catch {
    // Native module not present yet (e.g. running in Expo Go, or before a
    // dev-client/production rebuild that includes this local module).
    native = null;
  }
}

/**
 * Writes the current watering summary counts into a dedicated, read-only
 * Android ContentProvider (see android/.../StatsProvider.kt) so an external
 * app (e.g. "Total Care") can read them. Best-effort and silent: this must
 * never throw or affect the main app if the native module is unavailable.
 * @param {number} total
 * @param {number} overdue
 * @param {number} dueToday
 */
export function writeStatsSnapshot(total, overdue, dueToday) {
  if (!native) return;
  try {
    native.writeStats(total, overdue, dueToday);
  } catch {
    // best-effort only
  }
}
