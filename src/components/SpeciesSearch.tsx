import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { SpeciesInfo, SpeciesSearchResult } from '../types';
import { getSpeciesCareInfo, searchSpecies } from '../lib/species';
import { colors, radius, spacing } from '../theme';

interface Props {
  onApply: (info: SpeciesInfo) => void;
}

export default function SpeciesSearch({ onApply }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpeciesSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const found = await searchSpecies(query);
      setResults(found);
      if (found.length === 0) setError('검색 결과가 없어요.');
    } catch (e) {
      setError(e instanceof Error ? e.message : '검색에 실패했어요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (result: SpeciesSearchResult) => {
    setApplyingId(result.id);
    setError('');
    try {
      const info = await getSpeciesCareInfo(result);
      onApply(info);
      setResults([]);
      setQuery('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '정보를 가져오지 못했어요.');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>종류 검색으로 관리법 불러오기 (선택)</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="예: monstera"
          placeholderTextColor={colors.textDim}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <Pressable style={styles.searchBtn} onPress={handleSearch} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.searchBtnText}>검색</Text>
          )}
        </Pressable>
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      {results.length > 0 && (
        <View style={styles.results}>
          {results.slice(0, 8).map((r) => (
            <Pressable
              key={r.id}
              style={styles.resultRow}
              onPress={() => handleSelect(r)}
              disabled={applyingId !== null}
            >
              {r.imageUrl ? (
                <Image source={{ uri: r.imageUrl }} style={styles.resultImg} />
              ) : (
                <View style={styles.resultImgPlaceholder} />
              )}
              <View style={styles.resultTextCol}>
                <Text style={styles.resultName}>{r.commonName}</Text>
                {!!r.scientificName && <Text style={styles.resultSci}>{r.scientificName}</Text>}
              </View>
              {applyingId === r.id ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text style={styles.applyText}>불러오기</Text>
              )}
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: colors.textDim },
  row: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.bg,
    color: colors.textHeading,
  },
  searchBtn: {
    backgroundColor: colors.green,
    borderRadius: radius.sm,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#fff', fontWeight: '600' },
  error: { color: colors.danger, fontSize: 13 },
  results: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resultImg: { width: 40, height: 40, borderRadius: radius.sm },
  resultImgPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
  },
  resultTextCol: { flex: 1 },
  resultName: { fontWeight: '600', color: colors.textHeading },
  resultSci: { fontSize: 12, color: colors.textDim, fontStyle: 'italic' },
  applyText: { color: colors.green, fontWeight: '600', fontSize: 13 },
});
