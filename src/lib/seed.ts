import * as Crypto from 'expo-crypto';
import type { Plant } from '../types';
import { todayISO } from './date';

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

export const seedPlants = (): Plant[] => [
  {
    id: Crypto.randomUUID(),
    name: '몬스테라',
    species: 'Monstera deliciosa',
    location: '거실 창가',
    wateringIntervalDays: 7,
    lastWateredAt: daysAgo(8),
    light: 'medium',
    notes: '겉흙이 마르면 흠뻑 주기',
    createdAt: todayISO(),
    waterCount: 3,
  },
  {
    id: Crypto.randomUUID(),
    name: '선인장',
    species: 'Cactus',
    location: '베란다',
    wateringIntervalDays: 21,
    lastWateredAt: daysAgo(5),
    light: 'high',
    notes: '과습 주의',
    createdAt: todayISO(),
    waterCount: 1,
  },
  {
    id: Crypto.randomUUID(),
    name: '스투키',
    species: 'Sansevieria',
    location: '침실',
    wateringIntervalDays: 14,
    lastWateredAt: daysAgo(1),
    light: 'low',
    notes: '',
    createdAt: todayISO(),
    waterCount: 2,
  },
];
