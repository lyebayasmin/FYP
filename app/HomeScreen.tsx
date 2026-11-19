import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStreakCount } from './utils/streakNotifications';
import { getCommittedGoal, Goal } from './utils/goal';
import { getUserData } from './utils/userStorage';
import { endSession } from './utils/auth';
import { activateLanguage, getStartedLanguages } from './utils/languageSetup';

const LANG_META: Record<string, { label: string; emoji: string }> = {
  english: { label: 'English', emoji: '🇬🇧' },
  german: { label: 'German', emoji: '🇩🇪' },
  spanish: { label: 'Spanish', emoji: '🇪🇸' },
  urdu: { label: 'Urdu', emoji: '🇵🇰' },
};

export default function HomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const [userName, setUserName] = useState('');
  const [goal, setGoal] = useState<Goal | null>(null); // what the user committed to first
  const [streakCount, setStreakCount] = useState(0);
  const [xp, setXp] = useState(0);
  const [showMotivation, setShowMotivation] = useState(false);
  const [activeLang, setActiveLang] = useState(''); // language being learned now ('' = none yet)
  const [startedLangs, setStartedLangs] = useState<string[]>([]);

  // Reload every time the screen is shown (so streak / XP are always fresh)
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const name = await AsyncStorage.getItem('userName');
        const user = await getUserData();
        const lang = (user?.language || '').toLowerCase();
        const started = await getStartedLanguages();
        const g = lang ? await getCommittedGoal(lang) : null; // goal is per language
        const streak = await getStreakCount();
        const savedXp = parseInt((await AsyncStorage.getItem('xp')) || '0', 10) || 0;
        if (!active) return;
        if (name) setUserName(name);
        setActiveLang(started.includes(lang) ? lang : '');
        setStartedLangs(started);
        setGoal(g);
        setStreakCount(streak);
        setXp(savedXp);
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  useEffect(() => {
    (async () => {
      const hasShown = await AsyncStorage.getItem('motivationShownToday');
      const today = new Date().toDateString();
      if (hasShown !== today) {
        setTimeout(() => setShowMotivation(true), 600);
        await AsyncStorage.setItem('motivationShownToday', today);
      }
    })();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogout = async () => {
    await endSession();
    router.replace('/SplashScreen');
  };

  // Start the lesson of the active language directly (no questions again)
  const handleStartLesson = async () => {
    const route = activeLang ? await activateLanguage(activeLang) : null;
    router.push((route || '/OnboardingQuestions') as any);
  };

  // Tap another language the user already started -> make it active
  const handleSwitchLang = async (lang: string) => {
    if (lang === activeLang) return;
    const route = await activateLanguage(lang);
    if (!route) return;
    setActiveLang(lang);
    setGoal(await getCommittedGoal(lang));
  };

  const activeMeta = LANG_META[activeLang];
  const isCompete = goal === 'Compete';
  const isStreak = goal === 'Streak';

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Text style={styles.iconBtnText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {/* Greeting */}
          <View style={styles.headerBox}>
            <Text style={styles.title} numberOfLines={1}>
              Hi{userName ? `, ${userName}` : ''} 👋
            </Text>
            <Text style={styles.subtitle}>What would you like to do today?</Text>
          </View>

          {/* Streak OR Leaderboard banner - only the one the user committed to */}
          {isStreak && (
            <View style={styles.statCard}>
              <Text style={styles.statEmoji}>🔥</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.statValue}>
                  {streakCount} {streakCount === 1 ? 'Day' : 'Days'}
                </Text>
                <Text style={styles.statCaption}>Current streak</Text>
              </View>
              <View style={styles.statBadge}>
                <Text style={styles.statBadgeText}>Keep it up</Text>
              </View>
            </View>
          )}

          {isCompete && (
            <TouchableOpacity
              style={[styles.statCard, styles.statCardGold]}
              onPress={() => router.push('/LeaderboardScreen')}
              activeOpacity={0.85}
            >
              <Text style={styles.statEmoji}>🏆</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.statValue, { color: '#FCD34D' }]}>Leaderboard</Text>
                <Text style={styles.statCaption}>{xp} XP · tap to see your rank</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}

          {/* Languages the user already started (tap to switch) */}
          {startedLangs.length > 1 && (
            <View style={styles.langRow}>
              {startedLangs.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[styles.langChip, l === activeLang && styles.langChipActive]}
                  onPress={() => handleSwitchLang(l)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.langChipText}>
                    {(LANG_META[l]?.emoji || '🌐') + ' ' + (LANG_META[l]?.label || l)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Main action */}
          <TouchableOpacity style={styles.primaryCard} onPress={handleStartLesson} activeOpacity={0.9}>
            <Text style={styles.primaryEmoji}>{activeMeta ? activeMeta.emoji : '📚'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryTitle}>
                {activeMeta ? `Start ${activeMeta.label} Lesson` : 'Start Lessons'}
              </Text>
              <Text style={styles.primarySub}>
                {activeMeta ? 'Pick up right where you left off' : 'Learn or continue your journey'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Learn a different language (asks the 4 questions once for it) */}
          {activeMeta && (
            <TouchableOpacity
              style={styles.newLangBtn}
              onPress={() => router.push('/OnboardingQuestions')}
              activeOpacity={0.85}
            >
              <Text style={styles.newLangText}>＋ Learn another language</Text>
            </TouchableOpacity>
          )}

          {/* Secondary tiles (always shown) */}
          <View style={styles.tileRow}>
            <TouchableOpacity
              style={styles.tile}
              onPress={() => router.push('/ProgressScreen')}
              activeOpacity={0.9}
            >
              <Text style={styles.tileEmoji}>📊</Text>
              <Text style={styles.tileTitle}>View Progress</Text>
              <Text style={styles.tileSub}>Levels & badges</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tile, styles.tileBattle]}
              onPress={() => router.push('/SocialMediaArenaScreen')}
              activeOpacity={0.9}
            >
              <Text style={styles.tileEmoji}>⚔️</Text>
              <Text style={styles.tileTitle}>Battle Arena</Text>
              <Text style={styles.tileSub}>Beat social media</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Motivation Modal */}
      <Modal visible={showMotivation} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🚀</Text>
            <Text style={styles.modalTitle}>Welcome Back!</Text>
            <Text style={styles.modalSubtitle}>
              {isCompete
                ? 'Every lesson earns XP. Learn something today and climb the leaderboard!'
                : isStreak
                ? "Every day is a chance to learn something new. Let's do a lesson and keep your streak alive!"
                : "Every day is a chance to learn something new. Let's conquer a lesson today!"}
            </Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setShowMotivation(false)}>
              <Text style={styles.modalBtnText}>Let's Do This! 💪</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A35', paddingHorizontal: 20 },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: { color: '#EF4444', fontWeight: '700', fontSize: 12 },

  scroll: { paddingTop: 8, paddingBottom: 40, maxWidth: 520, width: '100%', alignSelf: 'center' },
  headerBox: { marginBottom: 18 },
  title: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#94A3B8', fontWeight: '500', marginTop: 4 },

  // streak / leaderboard banner
  statCard: {
    backgroundColor: '#1B0D2B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#6B341B',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardGold: { backgroundColor: '#2A1B05', borderColor: 'rgba(245,158,11,0.55)' },
  statEmoji: { fontSize: 24, marginRight: 12 },
  statValue: { color: '#F59E0B', fontSize: 16, fontWeight: '800' },
  statCaption: { color: '#CBD5E1', fontSize: 12, marginTop: 2 },
  statBadge: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statBadgeText: { color: '#FDBA74', fontSize: 11, fontWeight: '700' },
  chevron: { color: '#FFFFFF', fontSize: 24, opacity: 0.7, marginLeft: 8 },

  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#172545',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  langChipActive: { backgroundColor: 'rgba(168,85,247,0.2)', borderColor: '#A855F7' },
  langChipText: { color: '#E2E8F0', fontWeight: '700', fontSize: 13 },
  newLangBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4C1D95',
    alignItems: 'center',
    marginBottom: 12,
  },
  newLangText: { color: '#C4B5FD', fontWeight: '700', fontSize: 14 },

  // main action
  primaryCard: {
    backgroundColor: '#A855F7',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryEmoji: { fontSize: 28, marginRight: 14 },
  primaryTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 17 },
  primarySub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  // small tiles
  tileRow: { flexDirection: 'row', gap: 12 },
  tile: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 14,
  },
  tileBattle: { backgroundColor: '#1B0D2B', borderColor: 'rgba(239,68,68,0.45)' },
  tileEmoji: { fontSize: 24, marginBottom: 8 },
  tileTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  tileSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },

  // modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 26, 53, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#172545',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalEmoji: { fontSize: 44, marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', marginBottom: 10 },
  modalSubtitle: { fontSize: 15, color: '#94A3B8', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  modalBtn: {
    backgroundColor: '#A855F7',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});