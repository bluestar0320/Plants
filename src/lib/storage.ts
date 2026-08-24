import type { Plant } from '../types';

const STORAGE_KEY = 'plants.app.v1';

export const loadPlants = (): Plant[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const savePlants = (plants: Plant[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plants));
  } catch {
    // storage unavailable (e.g. private mode quota) — ignore, in-memory state still works
  }
};
