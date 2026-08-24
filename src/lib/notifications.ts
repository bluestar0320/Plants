import type { Plant } from '../types';
import { daysUntilNextWatering, todayISO, waterStatus } from './date';

const ENABLED_KEY = 'plants.app.notifications.enabled.v1';
const LOG_KEY = 'plants.app.notifications.log.v1';

export const notificationsSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

export const getPermission = (): NotificationPermission =>
  notificationsSupported() ? Notification.permission : 'denied';

export const isEnabled = (): boolean => localStorage.getItem(ENABLED_KEY) === '1';

export const setEnabled = (enabled: boolean): void => {
  localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
};

const readLog = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? '{}');
  } catch {
    return {};
  }
};

const writeLog = (log: Record<string, string>): void => {
  localStorage.setItem(LOG_KEY, JSON.stringify(log));
};

export const requestPermission = async (): Promise<NotificationPermission> => {
  if (!notificationsSupported()) return 'denied';
  return Notification.requestPermission();
};

/** Notifies about overdue/due-today plants, at most once per plant per day. */
export const notifyDuePlants = (plants: Plant[]): void => {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;

  const today = todayISO();
  const log = readLog();
  let logChanged = false;

  for (const plant of plants) {
    const daysLeft = daysUntilNextWatering(plant.lastWateredAt, plant.wateringIntervalDays);
    const status = waterStatus(daysLeft);
    if (status !== 'overdue' && status !== 'today') continue;
    if (log[plant.id] === today) continue;

    const body =
      status === 'overdue'
        ? `${Math.abs(daysLeft)}일 지났어요. 물을 줄 시간이에요.`
        : '오늘 물 줄 차례예요.';

    new Notification(`🌱 ${plant.name}`, { body, tag: `plant-${plant.id}` });
    log[plant.id] = today;
    logChanged = true;
  }

  if (logChanged) writeLog(log);
};
