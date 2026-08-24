import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
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
  loadPlants,
  markSeeded,
  savePlants,
  setNotificationsEnabled as persistNotificationsEnabled,
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
import PlantCard from './src/components/PlantCard';
import PlantForm from './src/components/PlantForm';
import { colors, radius, spacing } from './src/theme';

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

  useEffect(() => {
    (async () => {
      await ensureAndroidChannel();
      const [stored, seeded, notifOn] = await Promise.all([
        loadPlants(),
        hasSeeded(),
        isNotificationsEnabled(),
      ]);
      setNotifEnabled(notifOn);
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
        <View>
          <Text style={styles.title}>내 식물 관리</Text>
          <Text style={styles.tagline}>물 줄 때를 놓치지 않도록 도와드릴게요</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.ghostBtn} onPress={handleToggleNotifications}>
            <Text style={styles.ghostBtnText}>{notifEnabled ? '🔔 알림 켜짐' : '🔕 알림 받기'}</Text>
          </Pressable>
          <Pressable style={styles.primaryBtn} onPress={() => setIsAdding(true)}>
            <Text style={styles.primaryBtnText}>+ 추가</Text>
          </Pressable>
        </View>
      </View>

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
        <FlatList
          data={sortedPlants}
          keyExtractor={(p) => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <PlantCard plant={item} onWater={handleWater} onEdit={setEditingPlant} onDelete={handleDelete} />
          )}
        />
      )}

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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textHeading },
  tagline: { fontSize: 13, color: colors.textDim, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
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
