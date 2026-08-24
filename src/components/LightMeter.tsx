import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LightSensor } from 'expo-sensors';
import type { LightNeed } from '../types';
import { colors, radius, spacing } from '../theme';

type LightBucket = 'dark' | 'low' | 'medium' | 'bright' | 'direct';

const BUCKETS: { key: LightBucket; label: string; light: LightNeed; max: number }[] = [
  { key: 'dark', label: '저조도', light: 'low', max: 200 },
  { key: 'low', label: '중조도', light: 'low', max: 1000 },
  { key: 'medium', label: '밝은 간접광', light: 'medium', max: 10000 },
  { key: 'direct', label: '직사광선', light: 'high', max: Infinity },
];

const bucketForLux = (lux: number): (typeof BUCKETS)[number] => {
  return BUCKETS.find((b) => lux <= b.max) ?? BUCKETS[BUCKETS.length - 1];
};

interface Props {
  onApply?: (light: LightNeed) => void;
  onClose: () => void;
}

export default function LightMeter({ onApply, onClose }: Props) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [lux, setLux] = useState<number | null>(null);
  const [manualBucket, setManualBucket] = useState<LightBucket>('medium');

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    (async () => {
      const isAvailable = await LightSensor.isAvailableAsync();
      setAvailable(isAvailable);
      if (!isAvailable) return;
      LightSensor.setUpdateInterval(500);
      subscription = LightSensor.addListener(({ illuminance }) => setLux(illuminance));
    })();
    return () => subscription?.remove();
  }, []);

  const bucket = available && lux !== null ? bucketForLux(lux) : BUCKETS.find((b) => b.key === manualBucket)!;

  return (
    <View style={styles.container}>
      <View style={styles.gauge}>
        <Text style={styles.gaugeLabel}>{bucket.label}</Text>
        {available && lux !== null ? (
          <Text style={styles.gaugeValue}>≈ {Math.round(lux).toLocaleString()} lux</Text>
        ) : (
          <Text style={styles.gaugeValue}>{available === null ? '측정 준비 중…' : '직접 선택'}</Text>
        )}
      </View>

      <View style={styles.bucketRow}>
        {BUCKETS.map((b) => {
          const isActive = b.key === bucket.key;
          return (
            <Pressable
              key={b.key}
              style={[styles.bucketChip, isActive && styles.bucketChipActive]}
              disabled={available === true}
              onPress={() => setManualBucket(b.key)}
            >
              <Text style={[styles.bucketChipText, isActive && styles.bucketChipTextActive]}>
                {b.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {available === false && (
        <Text style={styles.hint}>
          이 기기에서는 조도 센서를 사용할 수 없어요. 위에서 밝기를 직접 선택해주세요.
        </Text>
      )}
      {available === true && (
        <Text style={styles.hint}>식물이 놓일 위치에 휴대폰을 두면 자동으로 측정돼요.</Text>
      )}

      <View style={styles.actions}>
        <Pressable style={styles.ghostBtn} onPress={onClose}>
          <Text style={styles.ghostBtnText}>닫기</Text>
        </Pressable>
        {onApply && (
          <Pressable style={styles.primaryBtn} onPress={() => onApply(bucket.light)}>
            <Text style={styles.primaryBtnText}>이 밝기 적용</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  gauge: {
    alignSelf: 'center',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: colors.amber,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  gaugeLabel: { fontSize: 22, fontWeight: '700', color: colors.textHeading },
  gaugeValue: { fontSize: 14, color: colors.textDim },
  bucketRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  bucketChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.bg,
  },
  bucketChipActive: { borderColor: colors.amber, backgroundColor: colors.amberBg },
  bucketChipText: { fontSize: 13, color: colors.text },
  bucketChipTextActive: { color: colors.amber, fontWeight: '700' },
  hint: { fontSize: 13, color: colors.textDim, textAlign: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
  ghostBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  ghostBtnText: { fontWeight: '600', color: colors.text, fontSize: 13 },
  primaryBtn: {
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
