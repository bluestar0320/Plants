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

export const daysUntilNextWatering = (
  lastWateredAt: string,
  intervalDays: number,
): number => {
  const due = nextWateringDate(lastWateredAt, intervalDays);
  const today = parseDateOnly(todayISO());
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((due.getTime() - today.getTime()) / msPerDay);
};

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

export const formatDate = (iso: string): string => {
  const d = parseDateOnly(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate(),
  ).padStart(2, '0')}`;
};
