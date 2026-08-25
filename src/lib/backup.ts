import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Plant, SpeciesInfo } from '../types';
import { loadPlants, loadSpeciesCache } from './storage';
import { todayISO } from './date';

const BACKUP_VERSION = 1;

interface BackupPayload {
  version: number;
  exportedAt: string;
  plants: Plant[];
  speciesCache: Record<number, SpeciesInfo>;
}

export class ImportCanceledError extends Error {}

export const exportBackup = async (): Promise<void> => {
  const [plants, speciesCache] = await Promise.all([loadPlants(), loadSpeciesCache()]);
  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    plants,
    speciesCache,
  };

  const file = new File(Paths.cache, `plants-backup-${todayISO()}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(payload, null, 2));

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('이 기기에서는 공유 기능을 사용할 수 없어요.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: '식물 데이터 백업',
  });
};

export const importBackup = async (): Promise<{
  plants: Plant[];
  speciesCache: Record<number, SpeciesInfo>;
}> => {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
  if (picked.canceled) {
    throw new ImportCanceledError();
  }

  const payload = (await picked.result.json()) as Partial<BackupPayload>;
  if (!payload || !Array.isArray(payload.plants)) {
    throw new Error('올바른 백업 파일이 아니에요.');
  }
  return {
    plants: payload.plants,
    speciesCache: payload.speciesCache ?? {},
  };
};
