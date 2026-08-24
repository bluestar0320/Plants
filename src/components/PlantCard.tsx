import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Plant } from '../types';
import { daysUntilNextWatering, formatDate, formatDaysLeft, waterStatus } from '../lib/date';
import { colors, radius, spacing } from '../theme';

const STATUS_LABEL: Record<string, string> = {
  overdue: '물 주세요!',
  today: '오늘 물주기',
  soon: '곧 물주기',
  ok: '건강해요',
};

const STATUS_COLOR: Record<string, { bg: string; fg: string; border: string }> = {
  overdue: { bg: colors.dangerBg, fg: colors.danger, border: colors.danger },
  today: { bg: colors.amberBg, fg: colors.amber, border: colors.amber },
  soon: { bg: colors.greenBg, fg: colors.greenDark, border: colors.green },
  ok: { bg: colors.greenBg, fg: colors.greenDark, border: colors.border },
};

interface Props {
  plant: Plant;
  onWater: (id: string) => void;
  onEdit: (plant: Plant) => void;
  onDelete: (id: string) => void;
}

export default function PlantCard({ plant, onWater, onEdit, onDelete }: Props) {
  const daysLeft = daysUntilNextWatering(plant.lastWateredAt, plant.wateringIntervalDays);
  const status = waterStatus(daysLeft);
  const statusColor = STATUS_COLOR[status];

  return (
    <View style={[styles.card, { borderLeftColor: statusColor.border }]}>
      <View style={styles.top}>
        {plant.photoUri ? (
          <Image source={{ uri: plant.photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>🌱</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>
            {plant.name} <Text style={styles.envIcon}>{plant.isOutdoor ? '🌳' : '🏠'}</Text>
          </Text>
          {(plant.species || plant.location) && (
            <Text style={styles.meta} numberOfLines={1}>
              {[plant.species, plant.location].filter(Boolean).join(' · ')}
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
      <Text style={styles.small}>마지막 급수: {formatDate(plant.lastWateredAt)}</Text>
      {!!plant.notes && <Text style={styles.notes}>{plant.notes}</Text>}

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
    </View>
  );
}

const styles = StyleSheet.create({
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
});
