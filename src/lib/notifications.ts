import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Plant } from '../types';
import { nextWateringDate } from './date';

const REMINDER_HOUR = 9;
const ANDROID_CHANNEL_ID = 'watering-reminders';

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

const reminderDateFor = (plant: Pick<Plant, 'lastWateredAt' | 'wateringIntervalDays'>): Date => {
  const due = nextWateringDate(plant.lastWateredAt, plant.wateringIntervalDays);
  due.setHours(REMINDER_HOUR, 0, 0, 0);
  const now = new Date();
  if (due.getTime() <= now.getTime()) {
    return new Date(now.getTime() + 10_000);
  }
  return due;
};

/** Cancels any existing reminder for this plant and schedules the next one. Returns the new notification id. */
export const scheduleWateringReminder = async (
  plant: Pick<Plant, 'id' | 'name' | 'lastWateredAt' | 'wateringIntervalDays' | 'notificationId'>,
): Promise<string> => {
  if (plant.notificationId) {
    await Notifications.cancelScheduledNotificationAsync(plant.notificationId).catch(() => {});
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: `🌱 ${plant.name}`,
      body: '물 줄 시간이에요.',
      data: { plantId: plant.id },
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
