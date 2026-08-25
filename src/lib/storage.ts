import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Plant, SpeciesInfo } from '../types';
import type { WeatherInfo } from './weather';

const PLANTS_KEY = 'plants.app.plants.v1';
const SPECIES_CACHE_KEY = 'plants.app.species-cache.v1';
const SEEDED_KEY = 'plants.app.seeded.v1';
const NOTIFICATIONS_ENABLED_KEY = 'plants.app.notifications-enabled.v1';
const WEATHER_ENABLED_KEY = 'plants.app.weather-enabled.v1';
const WEATHER_CACHE_KEY = 'plants.app.weather-cache.v1';

/** Migrates records saved before photos became a gallery array. */
const migratePlant = (plant: Plant & { photoUri?: string }): Plant => {
  if (!plant.photoUri) return plant;
  const { photoUri, ...rest } = plant;
  return { ...rest, photos: rest.photos ?? [photoUri] };
};

export const loadPlants = async (): Promise<Plant[]> => {
  try {
    const raw = await AsyncStorage.getItem(PLANTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(migratePlant) : [];
  } catch {
    return [];
  }
};

export const savePlants = async (plants: Plant[]): Promise<void> => {
  await AsyncStorage.setItem(PLANTS_KEY, JSON.stringify(plants));
};

/** Species care-info cache, keyed by Perenual species id, so we only hit the API once per species. */
export const loadSpeciesCache = async (): Promise<Record<number, SpeciesInfo>> => {
  try {
    const raw = await AsyncStorage.getItem(SPECIES_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const saveSpeciesToCache = async (info: SpeciesInfo): Promise<void> => {
  const cache = await loadSpeciesCache();
  cache[info.id] = info;
  await AsyncStorage.setItem(SPECIES_CACHE_KEY, JSON.stringify(cache));
};

export const replaceSpeciesCache = async (cache: Record<number, SpeciesInfo>): Promise<void> => {
  await AsyncStorage.setItem(SPECIES_CACHE_KEY, JSON.stringify(cache));
};

export const hasSeeded = async (): Promise<boolean> => (await AsyncStorage.getItem(SEEDED_KEY)) === '1';

export const markSeeded = async (): Promise<void> => {
  await AsyncStorage.setItem(SEEDED_KEY, '1');
};

export const isNotificationsEnabled = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)) === '1';

export const setNotificationsEnabled = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? '1' : '0');
};

export const isWeatherEnabled = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(WEATHER_ENABLED_KEY)) === '1';

export const setWeatherEnabled = async (enabled: boolean): Promise<void> => {
  await AsyncStorage.setItem(WEATHER_ENABLED_KEY, enabled ? '1' : '0');
};

export const loadCachedWeather = async (): Promise<WeatherInfo | null> => {
  try {
    const raw = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveCachedWeather = async (weather: WeatherInfo): Promise<void> => {
  await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weather));
};
