export type LightNeed = 'low' | 'medium' | 'high';

export interface Plant {
  id: string;
  name: string;
  species?: string;
  location?: string;
  emoji: string;
  photo?: string;
  wateringIntervalDays: number;
  lastWateredAt: string; // ISO date (yyyy-mm-dd)
  light: LightNeed;
  notes?: string;
  createdAt: string; // ISO date
  waterCount: number;
}

export type PlantDraft = Omit<Plant, 'id' | 'createdAt' | 'waterCount'>;

export type WaterStatus = 'overdue' | 'today' | 'soon' | 'ok';
