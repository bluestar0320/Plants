import { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import type { LightNeed, PlantDraft, SpeciesInfo } from '../types';
import { parseDateOnly, todayISO, toISODate } from '../lib/date';
import { pickAndSavePlantPhoto } from '../lib/image';
import { radius, spacing, useThemeColors, type ThemeColors } from '../theme';
import SpeciesSearch from './SpeciesSearch';
import LightMeter from './LightMeter';

const LIGHT_LABELS: Record<LightNeed, string> = {
  low: '음지',
  medium: '반양지',
  high: '양지',
};

interface Props {
  initial?: PlantDraft & { speciesId?: number; careLevel?: string };
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (draft: PlantDraft) => void;
}

export default function PlantForm({ initial, submitLabel, onCancel, onSubmit }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState(initial?.name ?? '');
  const [species, setSpecies] = useState(initial?.species ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [isOutdoor, setIsOutdoor] = useState(initial?.isOutdoor ?? false);
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  const [lightMeterOpen, setLightMeterOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [interval, setInterval] = useState(String(initial?.wateringIntervalDays ?? 7));
  const [lastWateredAt, setLastWateredAt] = useState(initial?.lastWateredAt ?? todayISO());
  const [light, setLight] = useState<LightNeed>(initial?.light ?? 'medium');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [lastRepottedAt, setLastRepottedAt] = useState(initial?.lastRepottedAt);
  const [fertilizeInterval, setFertilizeInterval] = useState(
    initial?.fertilizeIntervalDays ? String(initial.fertilizeIntervalDays) : '',
  );
  const [lastFertilizedAt, setLastFertilizedAt] = useState(initial?.lastFertilizedAt);
  const [fertilizerType, setFertilizerType] = useState(initial?.fertilizerType ?? '');
  const [humidityNote, setHumidityNote] = useState(initial?.humidityNote ?? '');
  const [mistInterval, setMistInterval] = useState(
    initial?.mistIntervalDays ? String(initial.mistIntervalDays) : '',
  );
  const [lastMistedAt, setLastMistedAt] = useState(initial?.lastMistedAt);
  const [lastRotatedAt, setLastRotatedAt] = useState(initial?.lastRotatedAt);
  const [careLevel, setCareLevel] = useState(initial?.careLevel);
  const [speciesId, setSpeciesId] = useState(initial?.speciesId);
  const [error, setError] = useState('');

  const handleApplySpecies = (info: SpeciesInfo) => {
    setSpecies(info.scientificName || info.commonName);
    setInterval(String(info.wateringIntervalDays));
    setLight(info.light);
    if (info.careNotes) setNotes(info.careNotes);
    setCareLevel(info.careLevel);
    setSpeciesId(info.id);
  };

  const handlePickPhoto = async () => {
    setPhotoBusy(true);
    setError('');
    try {
      const uri = await pickAndSavePlantPhoto();
      if (uri) setPhotos((prev) => [...prev, uri]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 불러오지 못했어요.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const openDateField = (currentValue: string, onChange: (iso: string) => void) => {
    if (Platform.OS !== 'android') return;
    DateTimePickerAndroid.open({
      value: parseDateOnly(currentValue),
      mode: 'date',
      maximumDate: new Date(),
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toISODate(date));
      },
    });
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    const intervalNum = Number(interval);
    if (!Number.isFinite(intervalNum) || intervalNum < 1) {
      setError('물주기 주기는 1일 이상이어야 해요.');
      return;
    }
    if (fertilizeInterval.trim() && (!Number.isFinite(Number(fertilizeInterval)) || Number(fertilizeInterval) < 1)) {
      setError('비료 주기는 1일 이상이어야 해요.');
      return;
    }
    if (mistInterval.trim() && (!Number.isFinite(Number(mistInterval)) || Number(mistInterval) < 1)) {
      setError('분무 주기는 1일 이상이어야 해요.');
      return;
    }
    onSubmit({
      name: name.trim(),
      species: species.trim() || undefined,
      location: location.trim() || undefined,
      isOutdoor,
      photos,
      wateringIntervalDays: Math.round(intervalNum),
      lastWateredAt,
      light,
      notes: notes.trim() || undefined,
      careLevel,
      speciesId,
      lastRepottedAt,
      fertilizeIntervalDays: fertilizeInterval.trim() ? Math.round(Number(fertilizeInterval)) : undefined,
      lastFertilizedAt: fertilizeInterval.trim() ? lastFertilizedAt : undefined,
      fertilizerType: fertilizeInterval.trim() ? fertilizerType.trim() || undefined : undefined,
      humidityNote: humidityNote.trim() || undefined,
      mistIntervalDays: mistInterval.trim() ? Math.round(Number(mistInterval)) : undefined,
      lastMistedAt: mistInterval.trim() ? lastMistedAt : undefined,
      lastRotatedAt,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.field}>
        <Text style={styles.label}>이름 *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="예: 몬스테라"
          placeholderTextColor={colors.textDim}
        />
      </View>

      <SpeciesSearch onApply={handleApplySpecies} />

      <View style={styles.field}>
        <Text style={styles.label}>사진{photos.length ? ` (${photos.length})` : ''}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.photoThumbRow}>
            {photos.map((uri) => (
              <View key={uri} style={styles.photoThumbWrap}>
                <Image source={{ uri }} style={styles.photoPreview} />
                <Pressable style={styles.photoRemoveBadge} onPress={() => handleRemovePhoto(uri)}>
                  <Text style={styles.photoRemoveBadgeText}>✕</Text>
                </Pressable>
              </View>
            ))}
            <Pressable style={styles.photoAddTile} onPress={handlePickPhoto} disabled={photoBusy}>
              <Text style={styles.photoAddTileText}>{photoBusy ? '처리 중…' : '+ 추가'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>

      <View style={styles.fieldRow}>
        <View style={[styles.field, styles.flex1]}>
          <Text style={styles.label}>종류</Text>
          <TextInput
            style={styles.input}
            value={species}
            onChangeText={setSpecies}
            placeholder="예: Monstera deliciosa"
            placeholderTextColor={colors.textDim}
          />
        </View>
        <View style={[styles.field, styles.flex1]}>
          <Text style={styles.label}>위치</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="예: 거실 창가"
            placeholderTextColor={colors.textDim}
          />
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>환경</Text>
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, !isOutdoor && styles.chipSelected]}
            onPress={() => setIsOutdoor(false)}
          >
            <Text style={[styles.chipText, !isOutdoor && styles.chipTextSelected]}>🏠 실내</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, isOutdoor && styles.chipSelected]}
            onPress={() => setIsOutdoor(true)}
          >
            <Text style={[styles.chipText, isOutdoor && styles.chipTextSelected]}>🌳 실외</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.fieldRow}>
        <View style={[styles.field, styles.flex1]}>
          <Text style={styles.label}>물주기 주기 (일)</Text>
          <TextInput
            style={styles.input}
            value={interval}
            onChangeText={setInterval}
            keyboardType="number-pad"
          />
        </View>
        <View style={[styles.field, styles.flex1]}>
          <Text style={styles.label}>마지막으로 물 준 날</Text>
          {Platform.OS === 'web' ? (
            <TextInput
              style={styles.input}
              value={lastWateredAt}
              onChangeText={setLastWateredAt}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textDim}
            />
          ) : (
            <Pressable style={styles.input} onPress={() => openDateField(lastWateredAt, setLastWateredAt)}>
              <Text style={{ color: colors.textHeading }}>{lastWateredAt}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>마지막 분갈이 (선택)</Text>
        <View style={styles.photoRow}>
          {Platform.OS === 'web' ? (
            <TextInput
              style={[styles.input, styles.flex1]}
              value={lastRepottedAt ?? ''}
              onChangeText={(text) => setLastRepottedAt(text || undefined)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textDim}
            />
          ) : (
            <Pressable
              style={[styles.input, styles.flex1]}
              onPress={() => openDateField(lastRepottedAt ?? todayISO(), setLastRepottedAt)}
            >
              <Text style={{ color: lastRepottedAt ? colors.textHeading : colors.textDim }}>
                {lastRepottedAt ?? '기록 없음 · 탭해서 설정'}
              </Text>
            </Pressable>
          )}
          {lastRepottedAt && (
            <Pressable style={styles.ghostBtn} onPress={() => setLastRepottedAt(undefined)}>
              <Text style={[styles.ghostBtnText, { color: colors.danger }]}>지우기</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.fieldRow}>
        <View style={[styles.field, styles.flex1]}>
          <Text style={styles.label}>비료 주기 (일, 선택)</Text>
          <TextInput
            style={styles.input}
            value={fertilizeInterval}
            onChangeText={setFertilizeInterval}
            placeholder="비워두면 추적 안 함"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
          />
        </View>
        {!!fertilizeInterval.trim() && (
          <View style={[styles.field, styles.flex1]}>
            <Text style={styles.label}>마지막 시비일</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.input}
                value={lastFertilizedAt ?? ''}
                onChangeText={(text) => setLastFertilizedAt(text || undefined)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textDim}
              />
            ) : (
              <Pressable
                style={styles.input}
                onPress={() => openDateField(lastFertilizedAt ?? todayISO(), setLastFertilizedAt)}
              >
                <Text style={{ color: lastFertilizedAt ? colors.textHeading : colors.textDim }}>
                  {lastFertilizedAt ?? '탭해서 설정'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {!!fertilizeInterval.trim() && (
        <View style={styles.field}>
          <Text style={styles.label}>비료 종류 (선택)</Text>
          <TextInput
            style={styles.input}
            value={fertilizerType}
            onChangeText={setFertilizerType}
            placeholder="예: 액체 비료, 하이포넥스"
            placeholderTextColor={colors.textDim}
          />
        </View>
      )}

      <View style={styles.fieldRow}>
        <View style={[styles.field, styles.flex1]}>
          <Text style={styles.label}>분무 주기 (일, 선택)</Text>
          <TextInput
            style={styles.input}
            value={mistInterval}
            onChangeText={setMistInterval}
            placeholder="비워두면 추적 안 함"
            placeholderTextColor={colors.textDim}
            keyboardType="number-pad"
          />
        </View>
        {!!mistInterval.trim() && (
          <View style={[styles.field, styles.flex1]}>
            <Text style={styles.label}>마지막 분무일</Text>
            {Platform.OS === 'web' ? (
              <TextInput
                style={styles.input}
                value={lastMistedAt ?? ''}
                onChangeText={(text) => setLastMistedAt(text || undefined)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textDim}
              />
            ) : (
              <Pressable
                style={styles.input}
                onPress={() => openDateField(lastMistedAt ?? todayISO(), setLastMistedAt)}
              >
                <Text style={{ color: lastMistedAt ? colors.textHeading : colors.textDim }}>
                  {lastMistedAt ?? '탭해서 설정'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>마지막 화분 회전 (선택)</Text>
        <View style={styles.photoRow}>
          {Platform.OS === 'web' ? (
            <TextInput
              style={[styles.input, styles.flex1]}
              value={lastRotatedAt ?? ''}
              onChangeText={(text) => setLastRotatedAt(text || undefined)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textDim}
            />
          ) : (
            <Pressable
              style={[styles.input, styles.flex1]}
              onPress={() => openDateField(lastRotatedAt ?? todayISO(), setLastRotatedAt)}
            >
              <Text style={{ color: lastRotatedAt ? colors.textHeading : colors.textDim }}>
                {lastRotatedAt ?? '기록 없음 · 탭해서 설정'}
              </Text>
            </Pressable>
          )}
          {lastRotatedAt && (
            <Pressable style={styles.ghostBtn} onPress={() => setLastRotatedAt(undefined)}>
              <Text style={[styles.ghostBtnText, { color: colors.danger }]}>지우기</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            빛 요구량{careLevel ? ` · 난이도: ${careLevel}` : ''}
          </Text>
          <Pressable onPress={() => setLightMeterOpen(true)}>
            <Text style={styles.linkText}>📏 지금 밝기 측정</Text>
          </Pressable>
        </View>
        <View style={styles.chipRow}>
          {(Object.keys(LIGHT_LABELS) as LightNeed[]).map((key) => (
            <Pressable
              key={key}
              style={[styles.chip, light === key && styles.chipSelected]}
              onPress={() => setLight(key)}
            >
              <Text style={[styles.chipText, light === key && styles.chipTextSelected]}>
                {LIGHT_LABELS[key]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>습도 메모 (선택)</Text>
        <TextInput
          style={styles.input}
          value={humidityNote}
          onChangeText={setHumidityNote}
          placeholder="예: 분무 자주 필요, 가습기 근처에 두기"
          placeholderTextColor={colors.textDim}
        />
      </View>

      <Modal visible={lightMeterOpen} animationType="slide" onRequestClose={() => setLightMeterOpen(false)}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>조도계</Text>
          <Pressable onPress={() => setLightMeterOpen(false)}>
            <Text style={styles.modalClose}>✕</Text>
          </Pressable>
        </View>
        <LightMeter
          onApply={(value) => {
            setLight(value);
            setLightMeterOpen(false);
          }}
          onClose={() => setLightMeterOpen(false)}
        />
      </Modal>

      <View style={styles.field}>
        <Text style={styles.label}>메모</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="관리 팁이나 특이사항을 적어두세요"
          placeholderTextColor={colors.textDim}
          multiline
          numberOfLines={3}
        />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Pressable style={styles.ghostBtn} onPress={onCancel}>
          <Text style={styles.ghostBtnText}>취소</Text>
        </Pressable>
        <Pressable style={styles.primaryBtn} onPress={handleSubmit}>
          <Text style={styles.primaryBtnText}>{submitLabel}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { maxHeight: '100%' },
  content: { padding: spacing.lg, gap: spacing.md },
  field: { gap: spacing.xs },
  fieldRow: { flexDirection: 'row', gap: spacing.md },
  flex1: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textDim },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  linkText: { fontSize: 12.5, fontWeight: '600', color: colors.green },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.bg,
    color: colors.textHeading,
    justifyContent: 'center',
  },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  photoPreview: { width: 64, height: 64, borderRadius: radius.md },
  photoPreviewEmpty: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoThumbRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  photoThumbWrap: { position: 'relative' },
  photoRemoveBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  photoAddTile: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAddTileText: { fontSize: 11, fontWeight: '600', color: colors.textDim, textAlign: 'center' },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.bg,
  },
  chipSelected: { borderColor: colors.green, backgroundColor: colors.greenBg },
  chipText: { color: colors.text, fontSize: 13 },
  chipTextSelected: { color: colors.greenDark, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.xs },
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textHeading },
  modalClose: { fontSize: 18, color: colors.textDim, padding: spacing.xs },
});
