import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Crypto from 'expo-crypto';
import type { Plant, PlantDraft } from './src/types';
import {
  hasSeeded,
  isNotificationsEnabled,
  isWeatherEnabled,
  loadCachedWeather,
  loadPlants,
  markSeeded,
  savePlants,
  saveCachedWeather,
  replaceSpeciesCache,
  setNotificationsEnabled as persistNotificationsEnabled,
  setWeatherEnabled as persistWeatherEnabled,
} from './src/lib/storage';
import { exportBackup, importBackup, ImportCanceledError } from './src/lib/backup';
import { seedPlants } from './src/lib/seed';
import { daysUntilNextWatering, nextWateringDate, toISODate, todayISO } from './src/lib/date';
import {
  cancelWateringReminder,
  configureNotificationHandler,
  ensureAndroidChannel,
  ensureWateringActionCategory,
  getWaterActionPlantId,
  requestNotificationPermission,
  scheduleWateringReminder,
  useWateringActionResponse,
} from './src/lib/notifications';
import { deletePlantPhoto } from './src/lib/image';
import { fetchCurrentWeather, requestLocationPermission, type WeatherInfo } from './src/lib/weather';
import { writeStatsSnapshot } from 'stats-export';
import PlantCard from './src/components/PlantCard';
import PlantForm from './src/components/PlantForm';
import LightMeter from './src/components/LightMeter';
import { radius, spacing, useThemeColors, type ThemeColors } from './src/theme';

const WEATHER_STALE_MS = 6 * 60 * 60 * 1000;
const UNSPECIFIED_LOCATION = '위치 미지정';
const WATERING_HISTORY_MAX = 60;

type SortMode = 'urgency' | 'name' | 'location' | 'recent';
const SORT_LABELS: Record<SortMode, string> = {
  urgency: '급한순',
  name: '이름순',
  location: '위치순',
  recent: '최근 추가순',
};

const waterPlant = (plant: Plant, dateISO: string): Plant => {
  const history = plant.wateringHistory ?? [];
  const alreadyLoggedToday = history[0] === dateISO;
  return {
    ...plant,
    lastWateredAt: dateISO,
    snoozedUntil: undefined,
    waterCount: plant.waterCount + 1,
    wateringHistory: alreadyLoggedToday
      ? history
      : [dateISO, ...history].slice(0, WATERING_HISTORY_MAX),
  };
};

/** Postpones the due date by one full interval from today, without counting it as an actual watering. */
const skipWatering = (plant: Plant): Plant => ({
  ...plant,
  snoozedUntil: toISODate(nextWateringDate(todayISO(), plant.wateringIntervalDays)),
});

configureNotificationHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <PlantsApp />
    </SafeAreaProvider>
  );
}

function PlantsApp() {
  const scheme = useColorScheme();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [duplicateDraft, setDuplicateDraft] = useState<PlantDraft | null>(null);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'location'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('urgency');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [lightMeterOpen, setLightMeterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ plant: Plant; timeoutId: ReturnType<typeof setTimeout> } | null>(
    null,
  );
  const pendingDeleteRef = useRef<{ plant: Plant; timeoutId: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    (async () => {
      await Promise.all([ensureAndroidChannel(), ensureWateringActionCategory()]);
      const [stored, seeded, notifOn, weatherOn, cachedWeather] = await Promise.all([
        loadPlants(),
        hasSeeded(),
        isNotificationsEnabled(),
        isWeatherEnabled(),
        loadCachedWeather(),
      ]);
      setNotifEnabled(notifOn);
      setWeatherEnabled(weatherOn);
      setWeather(cachedWeather);
      if (stored.length > 0) {
        setPlants(stored);
      } else if (seeded) {
        setPlants([]);
      } else {
        const seed = seedPlants();
        setPlants(seed);
        await savePlants(seed);
        await markSeeded();
      }

      if (weatherOn) {
        const stale = !cachedWeather || Date.now() - new Date(cachedWeather.fetchedAt).getTime() > WEATHER_STALE_MS;
        if (stale) {
          try {
            const fresh = await fetchCurrentWeather();
            setWeather(fresh);
            await saveCachedWeather(fresh);
          } catch {
            // keep showing cached weather (if any); a silent background refresh isn't worth surfacing an error for
          }
        }
      }
    })();
  }, []);

  useEffect(() => {
    if (plants !== null) savePlants(plants);
  }, [plants]);

  const sortedPlants = useMemo(() => {
    if (!plants) return [];
    const list = [...plants];
    switch (sortMode) {
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      case 'location':
        return list.sort((a, b) => (a.location ?? '').localeCompare(b.location ?? '', 'ko'));
      case 'recent':
        return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      default:
        return list.sort((a, b) => {
          const da = daysUntilNextWatering(a.lastWateredAt, a.wateringIntervalDays, a.snoozedUntil);
          const db = daysUntilNextWatering(b.lastWateredAt, b.wateringIntervalDays, b.snoozedUntil);
          return da - db;
        });
    }
  }, [plants, sortMode]);

  const filteredPlants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedPlants;
    return sortedPlants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.species ?? '').toLowerCase().includes(q) ||
        (p.location ?? '').toLowerCase().includes(q),
    );
  }, [sortedPlants, searchQuery]);

  const locationSections = useMemo(() => {
    const groups = new Map<string, Plant[]>();
    for (const plant of filteredPlants) {
      const key = plant.location?.trim() || UNSPECIFIED_LOCATION;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(plant);
    }
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [filteredPlants]);

  const stats = useMemo(() => {
    const list = plants ?? [];
    let overdue = 0;
    let dueToday = 0;
    for (const p of list) {
      const d = daysUntilNextWatering(p.lastWateredAt, p.wateringIntervalDays, p.snoozedUntil);
      if (d < 0) overdue += 1;
      else if (d === 0) dueToday += 1;
    }
    return { total: list.length, overdue, dueToday };
  }, [plants]);

  useEffect(() => {
    if (plants === null) return;
    writeStatsSnapshot(stats.total, stats.overdue, stats.dueToday);
  }, [stats, plants]);

  const maybeSchedule = async (plant: Plant): Promise<Plant> => {
    if (!notifEnabled) return plant;
    const notificationId = await scheduleWateringReminder(plant);
    return { ...plant, notificationId };
  };

  const handleAdd = async (draft: PlantDraft) => {
    let plant: Plant = {
      ...draft,
      id: Crypto.randomUUID(),
      createdAt: todayISO(),
      waterCount: 0,
      wateringHistory: [draft.lastWateredAt],
    };
    plant = await maybeSchedule(plant);
    setPlants((prev) => [...(prev ?? []), plant]);
    setIsAdding(false);
    setDuplicateDraft(null);
  };

  const handleEditSubmit = async (draft: PlantDraft) => {
    if (!editingPlant) return;
    const removedPhotos = (editingPlant.photos ?? []).filter((uri) => !(draft.photos ?? []).includes(uri));
    removedPhotos.forEach(deletePlantPhoto);
    let updated: Plant = { ...editingPlant, ...draft };
    updated = await maybeSchedule(updated);
    setPlants((prev) => (prev ?? []).map((p) => (p.id === updated.id ? updated : p)));
    setEditingPlant(null);
  };

  const handleWater = async (id: string) => {
    const target = (plants ?? []).find((p) => p.id === id);
    if (!target) return;
    const updated = await maybeSchedule(waterPlant(target, todayISO()));
    setPlants((prev) => (prev ?? []).map((p) => (p.id === id ? updated : p)));
  };

  const openAddForm = () => {
    setDuplicateDraft(null);
    setIsAdding(true);
  };

  const handleDuplicate = (plant: Plant) => {
    setDuplicateDraft({
      name: `${plant.name} 사본`,
      species: plant.species,
      location: plant.location,
      isOutdoor: plant.isOutdoor,
      lastRepottedAt: undefined,
      fertilizeIntervalDays: plant.fertilizeIntervalDays,
      fertilizerType: plant.fertilizerType,
      lastFertilizedAt: undefined,
      photos: undefined,
      wateringIntervalDays: plant.wateringIntervalDays,
      lastWateredAt: todayISO(),
      light: plant.light,
      notes: plant.notes,
      careLevel: plant.careLevel,
      speciesId: plant.speciesId,
      wateringHistory: undefined,
    });
    setIsAdding(true);
  };

  const handleSkip = async (id: string) => {
    const target = (plants ?? []).find((p) => p.id === id);
    if (!target) return;
    const updated = await maybeSchedule(skipWatering(target));
    setPlants((prev) => (prev ?? []).map((p) => (p.id === id ? updated : p)));
  };

  const handleWaterRef = useRef(handleWater);
  handleWaterRef.current = handleWater;

  // Handles a "물 줬어요" quick-action tap on a reminder notification, including one that
  // launched the app from a killed state (useLastNotificationResponse covers cold starts).
  const wateringActionResponse = useWateringActionResponse();
  useEffect(() => {
    if (!wateringActionResponse) return;
    const plantId = getWaterActionPlantId(wateringActionResponse);
    if (plantId) handleWaterRef.current(plantId);
  }, [wateringActionResponse]);

  const handleRepot = (id: string) => {
    setPlants((prev) =>
      (prev ?? []).map((p) => (p.id === id ? { ...p, lastRepottedAt: todayISO() } : p)),
    );
  };

  const handleFertilize = (id: string) => {
    setPlants((prev) =>
      (prev ?? []).map((p) => (p.id === id ? { ...p, lastFertilizedAt: todayISO() } : p)),
    );
  };

  const finalizeDelete = async (target: Plant) => {
    await cancelWateringReminder(target.notificationId);
    (target.photos ?? []).forEach(deletePlantPhoto);
  };

  const handleDelete = (id: string) => {
    const target = (plants ?? []).find((p) => p.id === id);
    if (!target) return;
    setPlants((prev) => (prev ?? []).filter((p) => p.id !== id));
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timeoutId);
      finalizeDelete(pendingDeleteRef.current.plant);
    }
    const timeoutId = setTimeout(() => {
      finalizeDelete(target);
      setPendingDelete(null);
    }, 5000);
    const next = { plant: target, timeoutId };
    pendingDeleteRef.current = next;
    setPendingDelete(next);
  };

  const handleUndoDelete = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timeoutId);
    pendingDeleteRef.current = null;
    setPlants((prev) => [...(prev ?? []), pendingDelete.plant]);
    setPendingDelete(null);
  };

  const handleToggleNotifications = async () => {
    if (notifEnabled) {
      setNotifEnabled(false);
      await persistNotificationsEnabled(false);
      for (const p of plants ?? []) {
        await cancelWateringReminder(p.notificationId);
      }
      setPlants((prev) => (prev ?? []).map((p) => ({ ...p, notificationId: undefined })));
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert('알림 권한 필요', '설정에서 알림 권한을 허용해주세요.');
      return;
    }
    setNotifEnabled(true);
    await persistNotificationsEnabled(true);
    const updated: Plant[] = [];
    for (const p of plants ?? []) {
      const notificationId = await scheduleWateringReminder(p);
      updated.push({ ...p, notificationId });
    }
    setPlants(updated);
  };

  const handleToggleWeather = async () => {
    if (weatherEnabled) {
      setWeatherEnabled(false);
      await persistWeatherEnabled(false);
      return;
    }
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert('위치 권한 필요', '날씨 연동을 사용하려면 위치 권한을 허용해주세요.');
      return;
    }
    setWeatherBusy(true);
    try {
      const fresh = await fetchCurrentWeather();
      setWeather(fresh);
      await saveCachedWeather(fresh);
      setWeatherEnabled(true);
      await persistWeatherEnabled(true);
    } catch (e) {
      Alert.alert('날씨 정보를 가져오지 못했어요', e instanceof Error ? e.message : undefined);
    } finally {
      setWeatherBusy(false);
    }
  };

  const handleExport = async () => {
    setExportBusy(true);
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert('내보내기 실패', e instanceof Error ? e.message : undefined);
    } finally {
      setExportBusy(false);
    }
  };

  const handleImport = async () => {
    let data: Awaited<ReturnType<typeof importBackup>>;
    try {
      data = await importBackup();
    } catch (e) {
      if (e instanceof ImportCanceledError) return;
      Alert.alert('가져오기 실패', e instanceof Error ? e.message : undefined);
      return;
    }

    Alert.alert(
      '데이터 가져오기',
      `${data.plants.length}개의 식물을 가져올까요? 현재 기기의 데이터를 덮어씁니다.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '가져오기',
          style: 'destructive',
          onPress: async () => {
            let imported: Plant[] = data.plants.map((p) => ({ ...p, notificationId: undefined }));
            if (notifEnabled) {
              imported = await Promise.all(imported.map((p) => maybeSchedule(p)));
            }
            setPlants(imported);
            await replaceSpeciesCache(data.speciesCache);
            setSettingsOpen(false);
          },
        },
      ],
    );
  };

  const outdoorPlants = (plants ?? []).filter((p) => p.isOutdoor);
  const unwateredOutdoorToday = outdoorPlants.filter((p) => p.lastWateredAt !== todayISO());
  const showRainSuggestion = weatherEnabled && !!weather?.isRaining && unwateredOutdoorToday.length > 0;

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkWater = async () => {
    const today = todayISO();
    const targets = (plants ?? []).filter((p) => selectedIds.has(p.id));
    const results = await Promise.all(targets.map((p) => maybeSchedule(waterPlant(p, today))));
    const byId = new Map(results.map((p) => [p.id, p]));
    setPlants((prev) => (prev ?? []).map((p) => byId.get(p.id) ?? p));
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleMarkOutdoorWatered = async () => {
    const today = todayISO();
    const results = await Promise.all(unwateredOutdoorToday.map((p) => maybeSchedule(waterPlant(p, today))));
    const byId = new Map(results.map((p) => [p.id, p]));
    setPlants((prev) => (prev ?? []).map((p) => byId.get(p.id) ?? p));
  };

  if (plants === null) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={colors.green} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.flexShrink}>
            <Text style={styles.title}>내 식물 관리</Text>
            <Text style={styles.tagline}>물 줄 때를 놓치지 않도록 도와드릴게요</Text>
          </View>
          <Pressable style={styles.primaryBtn} onPress={openAddForm}>
            <Text style={styles.primaryBtnText}>+ 추가</Text>
          </Pressable>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.ghostBtn} onPress={() => setLightMeterOpen(true)}>
            <Text style={styles.ghostBtnText}>📏 조도계</Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={handleToggleWeather} disabled={weatherBusy}>
            <Text style={styles.ghostBtnText}>
              {weatherBusy ? '⏳ 확인 중…' : weatherEnabled ? '🌦️ 날씨 연동됨' : '🌦️ 날씨 연동'}
            </Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={handleToggleNotifications}>
            <Text style={styles.ghostBtnText}>{notifEnabled ? '🔔 알림 켜짐' : '🔕 알림 받기'}</Text>
          </Pressable>
          {plants.length > 0 && (
            <Pressable style={styles.ghostBtn} onPress={handleToggleSelectionMode}>
              <Text style={styles.ghostBtnText}>{selectionMode ? '선택 취소' : '✅ 여러 개 선택'}</Text>
            </Pressable>
          )}
          <Pressable style={styles.ghostBtn} onPress={() => setSettingsOpen(true)}>
            <Text style={styles.ghostBtnText}>⚙️ 설정</Text>
          </Pressable>
        </View>
      </View>

      {weatherEnabled && weather && (
        <View style={styles.weatherBanner}>
          <Text style={styles.weatherText}>
            {weather.isRaining ? '🌧️' : '☀️'} 현재 {Math.round(weather.temperatureC)}°C
            {weather.isRaining ? ' · 비 오는 중' : ''}
          </Text>
          {weather.isFrostRisk && <Text style={styles.weatherWarning}>❄️ 서리 위험 — 실외 식물을 들여놓아 주세요</Text>}
          {weather.isHeatRisk && <Text style={styles.weatherWarning}>🔥 폭염 주의 — 그늘로 옮기고 물을 더 자주 주세요</Text>}
          {showRainSuggestion && (
            <View style={styles.rainSuggestionRow}>
              <Text style={styles.weatherText}>비가 와서 실외 식물은 급수를 건너뛰어도 될 것 같아요.</Text>
              <Pressable style={styles.ghostBtnSmall} onPress={handleMarkOutdoorWatered}>
                <Text style={styles.ghostBtnText}>실외 식물 모두 물준 것으로 표시</Text>
              </Pressable>
            </View>
          )}
        </View>
      )}

      {plants.length > 0 && (
        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>전체 식물</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.danger }]}>{stats.overdue}</Text>
            <Text style={styles.statLabel}>물 필요해요</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.amber }]}>{stats.dueToday}</Text>
            <Text style={styles.statLabel}>오늘 급수</Text>
          </View>
        </View>
      )}

      {plants.length === 0 ? (
        <View style={styles.empty}>
          <Text style={{ fontSize: 40 }}>🪴</Text>
          <Text style={styles.emptyTitle}>아직 등록된 식물이 없어요</Text>
          <Text style={styles.tagline}>식물을 추가하고 물주기 주기를 관리해보세요.</Text>
          <Pressable style={[styles.primaryBtn, { marginTop: spacing.md }]} onPress={openAddForm}>
            <Text style={styles.primaryBtnText}>첫 식물 추가하기</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="🔍 이름·종류·위치로 검색"
              placeholderTextColor={colors.textDim}
            />
          </View>

          <View style={styles.viewToggleRow}>
            <Pressable
              style={[styles.viewToggleChip, viewMode === 'all' && styles.viewToggleChipActive]}
              onPress={() => setViewMode('all')}
            >
              <Text style={[styles.viewToggleText, viewMode === 'all' && styles.viewToggleTextActive]}>
                전체
              </Text>
            </Pressable>
            <Pressable
              style={[styles.viewToggleChip, viewMode === 'location' && styles.viewToggleChipActive]}
              onPress={() => setViewMode('location')}
            >
              <Text style={[styles.viewToggleText, viewMode === 'location' && styles.viewToggleTextActive]}>
                위치별
              </Text>
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sortScroll}>
            <View style={styles.sortRow}>
              {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  style={[styles.sortChip, sortMode === mode && styles.sortChipActive]}
                  onPress={() => setSortMode(mode)}
                >
                  <Text style={[styles.sortChipText, sortMode === mode && styles.sortChipTextActive]}>
                    {SORT_LABELS[mode]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {selectionMode && (
            <View style={styles.bulkBar}>
              <Text style={styles.bulkBarText}>{selectedIds.size}개 선택됨</Text>
              <Pressable
                style={[styles.primaryBtn, selectedIds.size === 0 && styles.btnDisabled]}
                onPress={handleBulkWater}
                disabled={selectedIds.size === 0}
              >
                <Text style={styles.primaryBtnText}>💧 선택한 식물 물 주기</Text>
              </Pressable>
            </View>
          )}

          {filteredPlants.length === 0 ? (
            <Text style={styles.noResults}>"{searchQuery}"에 맞는 식물이 없어요.</Text>
          ) : viewMode === 'all' ? (
            <FlatList
              data={filteredPlants}
              keyExtractor={(p) => p.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <PlantCard
                  plant={item}
                  onWater={handleWater}
                  onEdit={setEditingPlant}
                  onDelete={handleDelete}
                  onRepot={handleRepot}
                  onFertilize={handleFertilize}
                  onSkip={handleSkip}
                  onDuplicate={handleDuplicate}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                />
              )}
            />
          ) : (
            <SectionList
              sections={locationSections}
              keyExtractor={(p) => p.id}
              contentContainerStyle={styles.list}
              renderSectionHeader={({ section }) => (
                <Text style={styles.sectionHeader}>{section.title}</Text>
              )}
              renderItem={({ item }) => (
                <PlantCard
                  plant={item}
                  onWater={handleWater}
                  onEdit={setEditingPlant}
                  onDelete={handleDelete}
                  onRepot={handleRepot}
                  onFertilize={handleFertilize}
                  onSkip={handleSkip}
                  onDuplicate={handleDuplicate}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                />
              )}
            />
          )}
        </>
      )}

      <Modal visible={lightMeterOpen} animationType="slide" onRequestClose={() => setLightMeterOpen(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>조도계</Text>
            <Pressable onPress={() => setLightMeterOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <LightMeter onClose={() => setLightMeterOpen(false)} />
        </SafeAreaView>
      </Modal>

      <Modal visible={settingsOpen} animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>설정</Text>
            <Pressable onPress={() => setSettingsOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <View style={styles.settingsContent}>
            <Text style={styles.settingsSectionTitle}>데이터 백업</Text>
            <Text style={styles.settingsHint}>
              모든 데이터는 이 기기에만 저장돼요. 폰을 바꾸거나 앱을 지우기 전에 내보내기해두세요.
            </Text>
            <Pressable style={styles.primaryBtn} onPress={handleExport} disabled={exportBusy}>
              <Text style={styles.primaryBtnText}>
                {exportBusy ? '내보내는 중…' : '📤 데이터 내보내기'}
              </Text>
            </Pressable>
            <Pressable style={styles.ghostBtn} onPress={handleImport}>
              <Text style={styles.ghostBtnText}>📥 데이터 가져오기</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={isAdding} animationType="slide" onRequestClose={() => setIsAdding(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{duplicateDraft ? '식물 복제' : '식물 추가'}</Text>
            <Pressable onPress={() => { setIsAdding(false); setDuplicateDraft(null); }}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <PlantForm
            key={duplicateDraft ? 'duplicate' : 'new'}
            initial={duplicateDraft ?? undefined}
            submitLabel="추가하기"
            onCancel={() => { setIsAdding(false); setDuplicateDraft(null); }}
            onSubmit={handleAdd}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={!!editingPlant} animationType="slide" onRequestClose={() => setEditingPlant(null)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>식물 정보 수정</Text>
            <Pressable onPress={() => setEditingPlant(null)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          {editingPlant && (
            <PlantForm
              initial={editingPlant}
              submitLabel="저장하기"
              onCancel={() => setEditingPlant(null)}
              onSubmit={handleEditSubmit}
            />
          )}
        </SafeAreaView>
      </Modal>

      {pendingDelete && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText} numberOfLines={1}>
            {pendingDelete.plant.name} 삭제됨
          </Text>
          <Pressable onPress={handleUndoDelete}>
            <Text style={styles.snackbarAction}>실행취소</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  flexShrink: { flexShrink: 1 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textHeading },
  tagline: { fontSize: 13, color: colors.textDim, marginTop: 2 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  weatherBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  weatherText: { fontSize: 13, color: colors.text },
  weatherWarning: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  rainSuggestionRow: { gap: spacing.sm, marginTop: spacing.xs },
  ghostBtnSmall: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    color: colors.textHeading,
  },
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  bulkBarText: { fontSize: 13, fontWeight: '600', color: colors.text },
  btnDisabled: { opacity: 0.4 },
  noResults: {
    textAlign: 'center',
    color: colors.textDim,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  viewToggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  viewToggleChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  viewToggleChipActive: { borderColor: colors.green, backgroundColor: colors.greenBg },
  viewToggleText: { fontSize: 13, color: colors.text },
  viewToggleTextActive: { color: colors.greenDark, fontWeight: '700' },
  sortScroll: { marginBottom: spacing.sm },
  sortRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
  sortChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  sortChipActive: { borderColor: colors.green, backgroundColor: colors.greenBg },
  sortChipText: { fontSize: 12.5, color: colors.textDim },
  sortChipTextActive: { color: colors.greenDark, fontWeight: '700' },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textHeading,
    backgroundColor: colors.bg,
    paddingVertical: spacing.xs,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: colors.textHeading },
  statLabel: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  empty: {
    alignItems: 'center',
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textHeading, marginTop: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  ghostBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  ghostBtnText: { fontWeight: '600', color: colors.text, fontSize: 12 },
  primaryBtn: {
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  modalClose: { fontSize: 18, color: colors.textDim, padding: spacing.xs },
  settingsContent: { padding: spacing.lg, gap: spacing.sm },
  settingsSectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textHeading },
  settingsHint: { fontSize: 13, color: colors.textDim, marginBottom: spacing.xs },
  snackbar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: 'rgba(30,32,26,0.95)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  snackbarText: { color: '#fff', fontSize: 13, flexShrink: 1 },
  snackbarAction: { color: colors.green, fontSize: 13, fontWeight: '700' },
});
