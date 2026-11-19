import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getUserData } from './utils/userStorage';
import { fetchLeaderboard, syncAllLeaderboards, getOfflineBoard, LeaderboardResponse } from './utils/leaderboard';

const LANGS = [
  { id: 'all', label: 'All' },
  { id: 'english', label: 'English' },
  { id: 'german', label: 'German' },
  { id: 'spanish', label: 'Spanish' },
  { id: 'urdu', label: 'Urdu' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState('all');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);

  // start on the language the user is currently learning
  useEffect(() => {
    getUserData()
      .then((u) => {
        const l = (u?.language || '').toLowerCase();
        if (LANGS.some((x) => x.id === l)) setLanguage(l);
      })
      .finally(() => setReady(true));
  }, []);

  // never throws: fetchLeaderboard always gives back a board (live, saved or on-device)
  const load = useCallback(async (isRefresh = false, silent = false) => {
    if (isRefresh) setRefreshing(true);
    else if (!silent) setLoading(true);
    try {
      // push my latest XP (all my leaderboard languages) first, then read the board
      const online = await syncAllLeaderboards();
      setData(online ? await fetchLeaderboard('xp', language) : await getOfflineBoard(language));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [language]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  // Server not reachable? keep trying quietly in the background until it answers.
  useEffect(() => {
    if (!data?.offline) return;
    const timer = setInterval(() => load(false, true), 8000);
    return () => clearInterval(timer);
  }, [data?.offline, load]);

  const fmt = (v: number) => `${v} XP`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Leaderboard 🏆</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* language filter */}
      <View style={styles.chips}>
        {LANGS.map((l) => (
          <TouchableOpacity
            key={l.id}
            style={[styles.chip, language === l.id && styles.chipActive]}
            onPress={() => setLanguage(l.id)}
          >
            <Text style={[styles.chipText, language === l.id && styles.chipTextActive]}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {data?.offline && (
        <View style={styles.offlineBar}>
          <Text style={styles.offlineText}>
            📡 Reconnecting to the leaderboard… showing your saved scores for now.
          </Text>
        </View>
      )}

      {/* your rank */}
      {data?.me && (
        <View style={styles.meCard}>
          <Text style={styles.meLabel}>Your rank</Text>
          <Text style={styles.meRank}>#{data.me.rank}</Text>
          <Text style={styles.meValue}>{fmt(data.me.value)}</Text>
        </View>
      )}

      {loading && !data ? (
        <ActivityIndicator color="#A855F7" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data?.rows || []}
          keyExtractor={(r) => `${r.rank}-${r.name}`}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#A855F7" />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              No one is on the board yet.{'\n'}Finish a quiz to get the first spot! 🚀
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, item.isYou && styles.rowYou]}>
              <Text style={styles.rank}>{item.rank <= 3 ? MEDALS[item.rank - 1] : `#${item.rank}`}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}{item.isYou ? ' (You)' : ''}
              </Text>
              <Text style={styles.value}>{fmt(item.value)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A35', padding: 20, paddingTop: 50 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  segment: { flexDirection: 'row', backgroundColor: '#172545', borderRadius: 14, padding: 4, marginBottom: 12 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  segBtnActive: { backgroundColor: '#A855F7' },
  segText: { color: '#94A3B8', fontWeight: '700' },
  segTextActive: { color: '#fff' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#172545', borderWidth: 1, borderColor: '#1E293B' },
  chipActive: { backgroundColor: 'rgba(168,85,247,0.2)', borderColor: '#A855F7' },
  chipText: { color: '#94A3B8', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  meCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(168,85,247,0.15)', borderColor: '#A855F7', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  meLabel: { color: '#C4B5FD', fontWeight: '700', flex: 1 },
  meRank: { color: '#fff', fontWeight: '900', fontSize: 22, marginRight: 14 },
  meValue: { color: '#E2E8F0', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#172545', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1E293B' },
  rowYou: { borderColor: '#A855F7', backgroundColor: 'rgba(168,85,247,0.12)' },
  rank: { width: 44, color: '#E2E8F0', fontWeight: '800', fontSize: 16 },
  name: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 15 },
  value: { color: '#F59E0B', fontWeight: '800' },
  offlineBar: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.4)', borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12 },
  offlineText: { color: '#FCD34D', fontSize: 12, textAlign: 'center' },
  center: { alignItems: 'center', marginTop: 40, paddingHorizontal: 20 },
  errorText: { color: '#FCA5A5', textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  retryBtn: { backgroundColor: '#A855F7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '800' },
  empty: { color: '#94A3B8', textAlign: 'center', marginTop: 40, lineHeight: 24 },
});