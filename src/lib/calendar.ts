import type { Plant } from '../types';
import { addDaysToISO, addMonthsToISO, REPOT_REMINDER_MONTHS, ROTATE_REMINDER_DAYS, toISODate } from './date';

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export interface CalendarCell {
  iso: string;
  day: number;
  inMonth: boolean;
}

/** Month is 1-12. Returns a 6x7 (42-cell) grid starting on the Sunday on/before the 1st. */
export const buildMonthGrid = (year: number, month: number): CalendarCell[] => {
  const firstOfMonth = new Date(year, month - 1, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return {
      iso: toISODate(d),
      day: d.getDate(),
      inMonth: d.getMonth() === month - 1,
    };
  });
};

export const addMonths = (
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } => {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
};

export const monthLabel = (year: number, month: number): string => `${year}년 ${month}월`;

export type CalendarEventType = 'water' | 'fertilize' | 'mist' | 'repot' | 'rotate';

export interface CalendarEvent {
  plantId: string;
  plantName: string;
  type: CalendarEventType;
  /** true = a past action that was actually done; false = an upcoming/overdue due date. */
  done: boolean;
}

export const EVENT_META: Record<CalendarEventType, { icon: string; label: string }> = {
  water: { icon: '💧', label: '물주기' },
  fertilize: { icon: '🌿', label: '비료' },
  mist: { icon: '💦', label: '분무' },
  repot: { icon: '🪴', label: '분갈이' },
  rotate: { icon: '🔄', label: '화분 회전' },
};

/**
 * Builds a day -> events map for the plants, limited to [startIso, endIso].
 * Each plant contributes its watering history (done) plus a single next-due
 * date per care type (water/fertilize/mist/repot/rotate) — not a recurring
 * schedule, matching how due dates are shown everywhere else in the app.
 */
export const buildCalendarEvents = (
  plants: Plant[],
  startIso: string,
  endIso: string,
): Map<string, CalendarEvent[]> => {
  const map = new Map<string, CalendarEvent[]>();
  const add = (iso: string, event: CalendarEvent) => {
    if (iso < startIso || iso > endIso) return;
    const list = map.get(iso);
    if (list) list.push(event);
    else map.set(iso, [event]);
  };

  for (const p of plants) {
    for (const d of p.wateringHistory ?? []) {
      add(d, { plantId: p.id, plantName: p.name, type: 'water', done: true });
    }
    const waterDue = p.snoozedUntil ?? addDaysToISO(p.lastWateredAt, p.wateringIntervalDays);
    add(waterDue, { plantId: p.id, plantName: p.name, type: 'water', done: false });

    if (p.lastFertilizedAt) {
      add(p.lastFertilizedAt, { plantId: p.id, plantName: p.name, type: 'fertilize', done: true });
      if (p.fertilizeIntervalDays) {
        add(addDaysToISO(p.lastFertilizedAt, p.fertilizeIntervalDays), {
          plantId: p.id,
          plantName: p.name,
          type: 'fertilize',
          done: false,
        });
      }
    }

    if (p.lastMistedAt) {
      add(p.lastMistedAt, { plantId: p.id, plantName: p.name, type: 'mist', done: true });
      if (p.mistIntervalDays) {
        add(addDaysToISO(p.lastMistedAt, p.mistIntervalDays), {
          plantId: p.id,
          plantName: p.name,
          type: 'mist',
          done: false,
        });
      }
    }

    if (p.lastRepottedAt) {
      add(p.lastRepottedAt, { plantId: p.id, plantName: p.name, type: 'repot', done: true });
      add(addMonthsToISO(p.lastRepottedAt, REPOT_REMINDER_MONTHS), {
        plantId: p.id,
        plantName: p.name,
        type: 'repot',
        done: false,
      });
    }

    if (p.lastRotatedAt) {
      add(p.lastRotatedAt, { plantId: p.id, plantName: p.name, type: 'rotate', done: true });
      add(addDaysToISO(p.lastRotatedAt, ROTATE_REMINDER_DAYS), {
        plantId: p.id,
        plantName: p.name,
        type: 'rotate',
        done: false,
      });
    }
  }

  return map;
};
