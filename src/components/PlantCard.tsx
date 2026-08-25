import { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { Plant } from '../types';
import {
  daysUntilDue,
  daysUntilNextWatering,
  formatDate,
  formatDaysLeft,
  monthsSince,
  waterStatus,
} from '../lib/date';
import { radius, spacing, useThemeColors, type ThemeColors } from '../theme';

const REPOT_REMINDER_MONTHS = 12;

const STATUS_LABEL: Record<string, string> = {
  overdue: '물 주세요!',
  today: '오늘 물주기',
  soon: '곧 물주기',
  ok: '건강해요',
};

const getStatusColor = (colors: ThemeColors): Record<string, { bg: string; fg: string; border: string }> => ({
  overdue: { bg: colors.dangerBg, fg: colors.danger, border: colors.danger },
  today: { bg: colors.amberBg, fg: colors.amber, border: colors.amber },
  soon: { bg: colors.greenBg, fg: colors.greenDark, border: colors.green },
  ok: { bg: colors.greenBg, fg: colors.greenDark, border: colors.border },
});

interface Props {
  plant: Plant;
  onWater: (id: string) => void;
  onEdit: (plant: Plant) => void;
  onDelete: (id: string) => void;
  onRepot: (id: string) => void;
  onFertilize: (id: string) => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export default function PlantCard({
  plant,
  onWater,
  onEdit,
  onDelete,
  onRepot,
  onFertilize,
  selectionMode,
  selected,
  onToggleSelect,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusColorMap = useMemo(() => getStatusColor(colors), [colors]);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const daysLeft = daysUntilNextWatering(plant.lastWateredAt, plant.wateringIntervalDays);
  const status = waterStatus(daysLeft);
  const statusColor = statusColorMap[status];
  const repotMonths = plant.lastRepottedAt ? monthsSince(plant.lastRepottedAt) : null;
  const repotDue = repotMonths !== null && repotMonths >= REPOT_REMINDER_MONTHS;
  const fertilizeTracked = !!plant.fertilizeIntervalDays;
  const fertilizeDaysLeft =
    fertilizeTracked && plant.lastFertilizedAt
      ? daysUntilDue(plant.lastFertilizedAt, plant.fertilizeIntervalDays!)
      : null;
  const fertilizeDue = fertilizeDaysLeft !== null && fertilizeDaysLeft <= 0;
  const photos = plant.photos ?? [];

  const content = (
    <View style={[styles.card, { borderLeftColor: statusColor.border }, selected && styles.cardSelected]}>
      <View style={styles.top}>
        {selectionMode && (
          <View style={[styles.checkbox, selected && styles.checkboxChecked]}>
            {selected && <Text style={styles.checkboxMark}>✓</Text>}
          </View>
        )}
        <Pressable disabled={selectionMode || photos.length === 0} onPress={() => setGalleryOpen(true)}>
          {photos[0] ? (
            <View>
              <Image source={{ uri: photos[0] }} style={styles.photo} />
              {photos.length > 1 && (
                <View style={styles.photoCountBadge}>
                  <Text style={styles.photoCountText}>{photos.length}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoPlaceholderText}>🌱</Text>
            </View>
          )}
        </Pressable>
        <View style={styles.info}>
          <Text style={styles.name}>
            {plant.name} <Text style={styles.envIcon}>{plant.isOutdoor ? '🌳' : '🏠'}</Text>
          </Text>
          {(plant.species || plant.location || plant.careLevel) && (
            <Text style={styles.meta} numberOfLines={1}>
              {[plant.species, plant.location, plant.careLevel && `난이도: ${plant.careLevel}`]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.badgeText, { color: statusColor.fg }]}>
            {STATUS_LABEL[status]}
          </Text>
        </View>
      </View>

      <Text style={styles.dueLine}>
        <Text style={styles.dueLineStrong}>{formatDaysLeft(daysLeft)}</Text>
        <Text style={styles.dim}> · {plant.wateringIntervalDays}일마다</Text>
      </Text>
      <Pressable disabled={selectionMode} onPress={() => setHistoryOpen(true)}>
        <Text style={styles.small}>
          마지막 급수: {formatDate(plant.lastWateredAt)}
          {!selectionMode && '  ·  기록 보기'}
        </Text>
      </Pressable>
      {!selectionMode && (
        <View style={styles.repotRow}>
          <Text style={[styles.small, repotDue && styles.repotDueText]}>
            🪴 분갈이:{' '}
            {plant.lastRepottedAt
              ? `${formatDate(plant.lastRepottedAt)} (${repotMonths}개월 전)${repotDue ? ' · 검토해보세요' : ''}`
              : '기록 없음'}
          </Text>
          <Pressable onPress={() => onRepot(plant.id)}>
            <Text style={styles.repotLink}>분갈이했어요</Text>
          </Pressable>
        </View>
      )}
      {!selectionMode && fertilizeTracked && (
        <View style={styles.repotRow}>
          <Text style={[styles.small, fertilizeDue && styles.repotDueText]}>
            🌿 비료:{' '}
            {plant.lastFertilizedAt
              ? `${fertilizeDaysLeft! < 0 ? `${Math.abs(fertilizeDaysLeft!)}일 지남` : fertilizeDaysLeft === 0 ? '오늘' : `${fertilizeDaysLeft}일 후`}`
              : '기록 없음'}
          </Text>
          <Pressable onPress={() => onFertilize(plant.id)}>
            <Text style={styles.repotLink}>비료 줬어요</Text>
          </Pressable>
        </View>
      )}
      {!!plant.notes && <Text style={styles.notes}>{plant.notes}</Text>}

      {!selectionMode && (
        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => onWater(plant.id)}>
            <Text style={styles.btnPrimaryText}>💧 물 줬어요</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => onEdit(plant)}>
            <Text style={styles.btnText}>수정</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => onDelete(plant.id)}>
            <Text style={[styles.btnText, { color: colors.danger }]}>삭제</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  const historyModal = (
    <Modal visible={historyOpen} animationType="slide" transparent onRequestClose={() => setHistoryOpen(false)}>
      <View style={styles.historyOverlay}>
        <View style={styles.historySheet}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>{plant.name} 급수 기록</Text>
            <Pressable onPress={() => setHistoryOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </Pressable>
          </View>
          {!plant.wateringHistory || plant.wateringHistory.length === 0 ? (
            <Text style={styles.small}>기록이 없어요.</Text>
          ) : (
            <FlatList
              data={plant.wateringHistory}
              keyExtractor={(date, i) => `${date}-${i}`}
              style={styles.historyList}
              renderItem={({ item }) => <Text style={styles.historyItem}>💧 {formatDate(item)}</Text>}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  const galleryModal = (
    <Modal visible={galleryOpen} animationType="fade" transparent onRequestClose={() => setGalleryOpen(false)}>
      <View style={styles.galleryOverlay}>
        <Pressable style={styles.galleryClose} onPress={() => setGalleryOpen(false)}>
          <Text style={styles.galleryCloseText}>✕</Text>
        </Pressable>
        <FlatList
          style={styles.galleryList}
          data={photos}
          keyExtractor={(uri, i) => `${uri}-${i}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.galleryPage, { width: windowWidth, height: windowHeight }]}>
              <Image source={{ uri: item }} style={styles.galleryImage} resizeMode="contain" />
            </View>
          )}
        />
        {photos.length > 1 && (
          <Text style={styles.galleryCount}>{photos.length}장의 사진</Text>
        )}
      </View>
    </Modal>
  );

  if (selectionMode) {
    return (
      <>
        <Pressable onPress={() => onToggleSelect?.(plant.id)}>{content}</Pressable>
        {historyModal}
        {galleryModal}
      </>
    );
  }
  return (
    <>
      {content}
      {historyModal}
      {galleryModal}
    </>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  cardSelected: { borderColor: colors.green, backgroundColor: colors.greenBg },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { borderColor: colors.green, backgroundColor: colors.green },
  checkboxMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  photo: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
  },
  photoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholderText: { fontSize: 24 },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', color: colors.textHeading },
  envIcon: { fontSize: 13 },
  meta: { fontSize: 13, color: colors.textDim, marginTop: 2 },
  badge: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  dueLine: { fontSize: 15 },
  dueLineStrong: { fontWeight: '700', color: colors.textHeading },
  dim: { color: colors.textDim },
  small: { fontSize: 12.5, color: colors.textDim },
  repotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  repotDueText: { color: colors.amber, fontWeight: '600' },
  repotLink: { fontSize: 12.5, color: colors.green, fontWeight: '600' },
  notes: {
    fontSize: 13,
    color: colors.textDim,
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    padding: 8,
    marginTop: spacing.xs,
  },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  btn: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: colors.green, borderColor: colors.green },
  btnPrimaryText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  btnText: { fontWeight: '600', fontSize: 13, color: colors.text },
  historyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  historySheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  historyTitle: { fontSize: 16, fontWeight: '700', color: colors.textHeading },
  modalClose: { fontSize: 18, color: colors.textDim, padding: spacing.xs },
  historyList: { maxHeight: 300 },
  historyItem: {
    fontSize: 14,
    color: colors.text,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.textHeading,
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCountText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  galleryOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryList: { flex: 1, width: '100%' },
  galleryClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    zIndex: 1,
    padding: spacing.sm,
  },
  galleryCloseText: { color: '#fff', fontSize: 22 },
  galleryPage: { alignItems: 'center', justifyContent: 'center' },
  galleryImage: { width: '100%', height: '80%' },
  galleryCount: {
    position: 'absolute',
    bottom: 40,
    color: '#fff',
    fontSize: 13,
  },
});
