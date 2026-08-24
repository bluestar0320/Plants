import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
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
  setNotificationsEnabled as persistNotificationsEnabled,
  setWeatherEnabled as persistWeatherEnabled,
} from './src/lib/storage';
import { seedPlants } from './src/lib/seed';
import { daysUntilNextWatering, todayISO } from './src/lib/date';
import {
  cancelWateringReminder,
  configureNotificationHandler,
  ensureAndroidChannel,
  requestNotificationPermission,
  scheduleWateringReminder,
} from './src/lib/notifications';
import { deletePlantPhoto } from './src/lib/image';
import { fetchCurrentWeather, requestLocationPermission, type WeatherInfo } from './src/lib/weather';
import PlantCard from './src/components/PlantCard';
import PlantForm from './src/components/PlantForm';
import LightMeter from './src/components/LightMeter';
import { colors, radius, spacing } from './src/theme';

const WEATHER_STALE_MS = 6 * 60 * 60 * 1000;
const UNSPECIFIED_LOCATION = '위치 미지정';

configureNotificationHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <PlantsApp />
    </SafeAreaProvider>
  );
}

function PlantsApp() {
  const [plants, setPlants] = useState<Plant[] | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'location'>('all');
  const [weatherEnabled, setWeatherEnabled] = useState(false);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [lightMeterOpen, setLightMeterOpen] = useState(false);

  useEffect(() => {
    (async () => {
      await ensureAndroidChannel();
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
    return [...plants].sort((a, b) => {
      const da = daysUntilNextWatering(a.lastWateredAt, a.wateringIntervalDays);
      const db = daysUntilNextWatering(b.lastWateredAt, b.wateringIntervalDays);
      return da - db;
    });
  }, [plants]);

  const locationSections = useMemo(() => {
    const groups = new Map<string, Plant[]>();
    for (const plant of sortedPlants) {
      const key = plant.location?.trim() || UNSPECIFIED_LOCATION;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(plant);
    }
    return Array.from(groups.entries()).map(([title, data]) => ({ title, data }));
  }, [sortedPlants]);

  const stats = useMemo(() => {
    const list = plants ?? [];
    let overdue = 0;
    let dueToday = 0;
    for (const p of list) {
      const d = daysUntilNextWatering(p.lastWateredAt, p.wateringIntervalDays);
      if (d < 0) overdue += 1;
      else if (d === 0) dueToday += 1;
    }
    return { total: list.length, overdue, dueToday };
  }, [plants]);

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
    };
    plant = await maybeSchedule(plant);
    setPlants((prev) => [...(prev ?? []), plant]);
    setIsAdding(false);
  };

  const handleEditSubmit = async (draft: PlantDraft) => {
    if (!editingPlant) return;
    if (editingPlant.photoUri && editingPlant.photoUri !== draft.photoUri) {
      deletePlantPhoto(editingPlant.photoUri);
    }
    let updated: Plant = { ...editingPlant, ...draft };
    updated = await maybeSchedule(updated);
    setPlants((prev) => (prev ?? []).map((p) => (p.id === updated.id ? updated : p)));
    setEditingPlant(null);
  };

  const handleWater = async (id: string) => {
    const target = (plants ?? []).find((p) => p.id === id);
    if (!target) return;
    let updated: Plant = {
      ...target,
      lastWateredAt: todayISO(),
      waterCount: target.waterCount + 1,
    };
    updated = await maybeSchedule(updated);
    setPlants((prev) => (prev ?? []).map((p) => (p.id === id ? updated : p)));
  };

  const handleDelete = (id: string) => {
    Alert.alert('식물 삭제', '이 식물을 목록에서 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const target = (plants ?? []).find((p) => p.id === id);
          if (target) {
            await cancelWateringReminder(target.notificationId);
            deletePlantPhoto(target.photoUri);
          }
          setPlants((prev) => (prev ?? []).filter((p) => p.id !== id));
        },
      },
    ]);
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

  const outdoorPlants = (plants ?? []).filter((p) => p.isOutdoor);
  const unwateredOutdoorToday = outdoorPlants.filter((p) => p.lastWateredAt !== todayISO());
  const showRainSuggestion = weatherEnabled && !!weather?.isRaining && unwateredOutdoorToday.length > 0;

  const handleMarkOutdoorWatered = async () => {
    const today = todayISO();
    const results = await Promise.all(
      unwateredOutdoorToday.map((p) => maybeSchedule({ ...p, lastWateredAt: today, waterCount: p.waterCount + 1 })),
    );
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
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.flexShrink}>
            <Text style={styles.title}>내 식물 관리</Text>
            <Text style={styles.tagline}>물 줄 때를 놓치지 않도록 도와드릴게요</Text>
          </View>
          <Pressable style={styles.primaryBtn} onPress={() => setIsAdding(true)}>
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
          <Pressable style={[styles.primaryBtn, { marginTop: spacing.md }]} onPress={() => setIsAdding(true)}>
            <Text style={styles.primaryBtnText}>첫 식물 추가하기</Text>
          </Pressable>
        </View>
      ) : (
        <>
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

          {viewMode === 'all' ? (
            <FlatList
              data={sortedPlants}
              keyExtractor={(p) => p.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <PlantCard plant={item} onWater={handleWater} onEdit={setEditingPlant} onDelete={handleDelete} />
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
                <PlantCard plant={item} onWater={handleWater} onEdit={setEditingPlant} onDelete={handleDelete} />
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

      <Modal visible={isAdding} animationType="slide" onRequestClose={() => setIsAdding(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>식물 추가</Text>
            <Pressable onPress={() => setIsAdding(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          <PlantForm submitLabel="추가하기" onCancel={() => setIsAdding(false)} onSubmit={handleAdd} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
});
