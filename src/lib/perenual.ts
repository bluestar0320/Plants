import type { LightNeed, SpeciesInfo, SpeciesSearchResult } from '../types';

const API_BASE = 'https://perenual.com/api/v2';

const DEFAULT_INTERVAL_BY_WATERING: Record<string, number> = {
  frequent: 3,
  average: 7,
  minimum: 14,
  none: 30,
};

export class PerenualConfigError extends Error {}
export class PerenualRequestError extends Error {}

const getApiKey = (): string => {
  const key = process.env.EXPO_PUBLIC_PERENUAL_API_KEY;
  if (!key) {
    throw new PerenualConfigError(
      'Perenual API 키가 설정되지 않았어요. .env 파일에 EXPO_PUBLIC_PERENUAL_API_KEY를 추가해주세요.',
    );
  }
  return key;
};

const lightFromSunlight = (sunlight: unknown): LightNeed => {
  const text = Array.isArray(sunlight) ? sunlight.join(' ').toLowerCase() : '';
  if (text.includes('full shade')) return 'low';
  if (text.includes('full sun')) return 'high';
  return 'medium';
};

const intervalFromBenchmark = (benchmark: unknown, watering: unknown): number => {
  if (
    benchmark &&
    typeof benchmark === 'object' &&
    'value' in benchmark &&
    typeof (benchmark as { value?: unknown }).value === 'string'
  ) {
    const raw = (benchmark as { value: string }).value;
    const numbers = raw.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
    if (numbers.length > 0) {
      const avg = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      return Math.max(1, Math.round(avg));
    }
  }
  const key = typeof watering === 'string' ? watering.toLowerCase() : '';
  return DEFAULT_INTERVAL_BY_WATERING[key] ?? 7;
};

export const searchSpecies = async (query: string): Promise<SpeciesSearchResult[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const key = getApiKey();

  let response: Response;
  try {
    response = await fetch(
      `${API_BASE}/species-list?key=${encodeURIComponent(key)}&q=${encodeURIComponent(trimmed)}`,
    );
  } catch {
    throw new PerenualRequestError('네트워크 연결을 확인해주세요.');
  }
  if (!response.ok) {
    throw new PerenualRequestError(`검색에 실패했어요. (HTTP ${response.status})`);
  }
  const json = await response.json();
  const data = Array.isArray(json?.data) ? json.data : [];
  return data.map(
    (item: {
      id: number;
      common_name?: string;
      scientific_name?: string[];
      default_image?: { thumbnail?: string };
    }): SpeciesSearchResult => ({
      id: item.id,
      commonName: item.common_name || item.scientific_name?.[0] || '이름 없음',
      scientificName: item.scientific_name?.[0],
      imageUrl: item.default_image?.thumbnail,
    }),
  );
};

export const fetchSpeciesCareInfo = async (
  result: SpeciesSearchResult,
): Promise<SpeciesInfo> => {
  const key = getApiKey();

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/species/details/${result.id}?key=${encodeURIComponent(key)}`);
  } catch {
    throw new PerenualRequestError('네트워크 연결을 확인해주세요.');
  }
  if (!response.ok) {
    throw new PerenualRequestError(`상세 정보를 가져오지 못했어요. (HTTP ${response.status})`);
  }
  const item = await response.json();

  return {
    id: result.id,
    commonName: result.commonName,
    scientificName: result.scientificName,
    imageUrl: result.imageUrl ?? item?.default_image?.thumbnail,
    wateringIntervalDays: intervalFromBenchmark(
      item?.watering_general_benchmark,
      item?.watering,
    ),
    light: lightFromSunlight(item?.sunlight),
    careLevel: typeof item?.care_level === 'string' ? item.care_level : undefined,
    careNotes:
      typeof item?.description === 'string'
        ? item.description.replace(/<[^>]+>/g, '').slice(0, 300)
        : undefined,
    fetchedAt: new Date().toISOString().slice(0, 10),
  };
};
