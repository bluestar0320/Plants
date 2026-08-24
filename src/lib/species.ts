import type { SpeciesInfo, SpeciesSearchResult } from '../types';
import { loadSpeciesCache, saveSpeciesToCache } from './storage';
import { fetchSpeciesCareInfo, searchSpecies } from './perenual';

export { searchSpecies, PerenualConfigError, PerenualRequestError } from './perenual';

/**
 * Returns cached care info for a species if we've looked it up before;
 * otherwise fetches it from the plant database once and caches it.
 */
export const getSpeciesCareInfo = async (
  result: SpeciesSearchResult,
): Promise<SpeciesInfo> => {
  const cache = await loadSpeciesCache();
  const cached = cache[result.id];
  if (cached) return cached;

  const info = await fetchSpeciesCareInfo(result);
  await saveSpeciesToCache(info);
  return info;
};
