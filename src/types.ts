export type LightNeed = 'low' | 'medium' | 'high';

export interface Plant {
  id: string;
  name: string;
  species?: string;
  location?: string;
  isOutdoor?: boolean;
  lastRepottedAt?: string; // ISO date
  fertilizeIntervalDays?: number;
  lastFertilizedAt?: string; // ISO date
  photoUri?: string;
  wateringIntervalDays: number;
  lastWateredAt: string; // ISO date (yyyy-mm-dd)
  light: LightNeed;
  notes?: string;
  careLevel?: string;
  createdAt: string; // ISO date
  waterCount: number;
  /** Most recent watering dates first, capped at a small history length. */
  wateringHistory?: string[];
  notificationId?: string;
  /** Perenual species id, if this plant was created from a species DB lookup. */
  speciesId?: number;
}

export type PlantDraft = Omit<
  Plant,
  'id' | 'createdAt' | 'waterCount' | 'notificationId'
>;

export type WaterStatus = 'overdue' | 'today' | 'soon' | 'ok';

/** Cached care info for one species, fetched from the plant database on first lookup. */
export interface SpeciesInfo {
  id: number;
  commonName: string;
  scientificName?: string;
  imageUrl?: string;
  wateringIntervalDays: number;
  light: LightNeed;
  careLevel?: string;
  careNotes?: string;
  fetchedAt: string; // ISO date, when this entry was cached
}

export interface SpeciesSearchResult {
  id: number;
  commonName: string;
  scientificName?: string;
  imageUrl?: string;
}
