import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Plant } from '../types';
import { nextWateringDate, parseDateOnly } from './date';

const REMINDER_HOUR = 9;
const ANDROID_CHANNEL_ID = 'watering-reminders';
const WATER_CATEGORY_ID = 'watering-reminder-actions';

/** actionIdentifier reported when the user taps the "물 줬어요" quick-action button on a reminder. */
export const WATER_ACTION_IDENTIFIER = 'mark-watered';

export const configureNotificationHandler = (): void => {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

export const ensureAndroidChannel = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: '물주기 알림',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
};

/** Registers the "물 줬어요" quick-action button shown on watering reminder notifications. */
export const ensureWateringActionCategory = async (): Promise<void> => {
  try {
    await Notifications.setNotificationCategoryAsync(WATER_CATEGORY_ID, [
      { identifier: WATER_ACTION_IDENTIFIER, buttonTitle: '물 줬어요' },
    ]);
  } catch {
    // Categories aren't supported on this platform (e.g. web) — the reminder still works, just without the button.
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
};

export const getNotificationPermissionGranted = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
};

const reminderDateFor = (
  plant: Pick<Plant, 'lastWateredAt' | 'wateringIntervalDays' | 'snoozedUntil'>,
): Date => {
  const due = plant.snoozedUntil
    ? parseDateOnly(plant.snoozedUntil)
    : nextWateringDate(plant.lastWateredAt, plant.wateringIntervalDays);
  due.setHours(REMINDER_HOUR, 0, 0, 0);
  const now = new Date();
  if (due.getTime() <= now.getTime()) {
    return new Date(now.getTime() + 10_000);
  }
  return due;
};

/** Cancels any existing reminder for this plant and schedules the next one. Returns the new notification id. */
export const scheduleWateringReminder = async (
  plant: Pick<
    Plant,
    'id' | 'name' | 'lastWateredAt' | 'wateringIntervalDays' | 'notificationId' | 'snoozedUntil'
  >,
): Promise<string> => {
  if (plant.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(plant.notificationId).catch(() => {});
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `🌱 ${plant.name}`,
      body: '물 줄 시간이에요.',
      data: { plantId: plant.id },
      categoryIdentifier: WATER_CATEGORY_ID,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDateFor(plant),
      channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
    },
  });
};

export const cancelWateringReminder = async (notificationId?: string): Promise<void> => {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
};

/** Returns the plant id for a "물 줬어요" quick-action tap, or undefined for any other response. */
export const getWaterActionPlantId = (response: Notifications.NotificationResponse): string | undefined => {
  if (response.actionIdentifier !== WATER_ACTION_IDENTIFIER) return undefined;
  const plantId = response.notification.request.content.data?.plantId;
  return typeof plantId === 'string' ? plantId : undefined;
};

/**
 * The most recent notification response (tap or quick-action), including one that launched the
 * app from a killed state. Web has no native notifications module to back this, so it's skipped
 * there — Platform.OS is fixed for the app's lifetime, so this conditional hook call is stable.
 */
export const useWateringActionResponse = (): Notifications.NotificationResponse | null => {
  if (Platform.OS === 'web') return null;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return Notifications.useLastNotificationResponse() ?? null;
};
