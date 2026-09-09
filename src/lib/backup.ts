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

const CSV_HEADERS = [
  '이름', '종류', '위치', '환경', '물주기(일)', '마지막급수일',
  '빛요구량', '난이도', '마지막분갈이', '비료주기(일)', '마지막시비일', '비료종류', '메모',
];

const csvEscape = (value: string): string =>
  /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

const plantToCsvRow = (p: Plant): string[] => [
  p.name,
  p.species ?? '',
  p.location ?? '',
  p.isOutdoor ? '실외' : '실내',
  String(p.wateringIntervalDays),
  p.lastWateredAt,
  p.light,
  p.careLevel ?? '',
  p.lastRepottedAt ?? '',
  p.fertilizeIntervalDays ? String(p.fertilizeIntervalDays) : '',
  p.lastFertilizedAt ?? '',
  p.fertilizerType ?? '',
  p.notes ?? '',
];

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

export const exportCsv = async (): Promise<void> => {
  const plants = await loadPlants();
  const rows = [CSV_HEADERS, ...plants.map(plantToCsvRow)];
  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');

  const file = new File(Paths.cache, `plants-backup-${todayISO()}.csv`);
  if (file.exists) file.delete();
  file.create();
  // Leading BOM so Excel/한글 앱들이 UTF-8을 올바르게 인식해요.
  file.write('﻿' + csv);

  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw new Error('이 기기에서는 공유 기능을 사용할 수 없어요.');
  }
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: '식물 데이터 CSV',
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
