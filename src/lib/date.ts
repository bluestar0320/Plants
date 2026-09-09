import type { WaterStatus } from '../types';

export const todayISO = (): string => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString().slice(0, 10);
};

export const parseDateOnly = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
};

export const toISODate = (date: Date): string => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const nextWateringDate = (lastWateredAt: string, intervalDays: number): Date => {
  const due = parseDateOnly(lastWateredAt);
  due.setDate(due.getDate() + intervalDays);
  return due;
};

export const daysSince = (iso: string): number => {
  const then = parseDateOnly(iso);
  const today = parseDateOnly(todayISO());
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((today.getTime() - then.getTime()) / msPerDay);
};

export const daysAgoISO = (n: number): string => {
  const d = parseDateOnly(todayISO());
  d.setDate(d.getDate() - n);
  return toISODate(d);
};

export const daysUntilNextWatering = (
  lastWateredAt: string,
  intervalDays: number,
  snoozedUntil?: string,
): number => {
  const due = snoozedUntil ? parseDateOnly(snoozedUntil) : nextWateringDate(lastWateredAt, intervalDays);
  const today = parseDateOnly(todayISO());
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((due.getTime() - today.getTime()) / msPerDay);
};

/** Generic "days until an interval-based care action is due" — same math as watering, reused for fertilizing etc. */
export const daysUntilDue = daysUntilNextWatering;

export const waterStatus = (daysLeft: number): WaterStatus => {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft === 0) return 'today';
  if (daysLeft <= 1) return 'soon';
  return 'ok';
};

export const formatDaysLeft = (daysLeft: number): string => {
  if (daysLeft < 0) return `${Math.abs(daysLeft)}일 지남`;
  if (daysLeft === 0) return '오늘 줘야 해요';
  if (daysLeft === 1) return '내일';
  return `${daysLeft}일 후`;
};

export const monthsSince = (iso: string): number => {
  const then = parseDateOnly(iso);
  const now = parseDateOnly(todayISO());
  return (
    (now.getFullYear() - then.getFullYear()) * 12 +
    (now.getMonth() - then.getMonth()) -
    (now.getDate() < then.getDate() ? 1 : 0)
  );
};

export const formatHour12 = (hour: number): string => {
  const period = hour < 12 ? '오전' : '오후';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${h12}시`;
};

export const formatDate = (iso: string): string => {
  const d = parseDateOnly(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};
