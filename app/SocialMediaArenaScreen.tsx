import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Animated,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  getCurrentAppTime,
  getSocialMediaTime,
  setSocialMediaTime,
  getBattleStatus,
  getCompetitionLevel,
  getConsecutiveWinDays,
  getBattleRankTitle,
  formatTime,
  runBattleCheck,
  BattleStatus,
} from './utils/socialMediaTracker';
import Mascot, { MascotMood } from '../components/Mascot';

const SOCIAL_APPS = [
  { name: 'Instagram', emoji: '📸', color: '#E1306C' },
  { name: 'TikTok', emoji: '🎵', color: '#010101' },
  { name: 'YouTube', emoji: '▶️', color: '#FF0000' },
  { name: 'WhatsApp', emoji: '💬', color: '#25D366' },
  { name: 'Facebook', emoji: '👍', color: '#1877F2' },
  { name: 'Twitter/X', emoji: '🐦', color: '#1DA1F2' },
  { name: 'Telegram', emoji: '✈️', color: '#2CA5E0' },
  { name: 'Snapchat', emoji: '👻', color: '#FFFC00' },
];

export default function SocialMediaArenaScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [appTime, setAppTime] = useState(0);
  const [socialTime, setSocialTime] = useState(0);
  const [level, setLevel] = useState(1);
  const [winDays, setWinDays] = useState(0);
  const [battleStatus, setBattleStatus] = useState<BattleStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Log time modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [inputHours, setInputHours] = useState('');
  const [inputMinutes, setInputMinutes] = useState('');

  // Per-app time storage
  const [perAppTimes, setPerAppTimes] = useState<Record<string, number>>({});

  // Celebration modal
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState('');

  const loadData = useCallback(async () => {
    const aTime = await getCurrentAppTime();
    const sTime = await getSocialMediaTime();
    const lvl = await getCompetitionLevel();
    const days = await getConsecutiveWinDays();

    setAppTime(aTime);
    setSocialTime(sTime);
    setLevel(lvl);
    setWinDays(days);

    const status = getBattleStatus(aTime, sTime);
    setBattleStatus(status);

    // Load per-app times
    const stored = await import('@react-native-async-storage/async-storage').then(m => m.default.getItem('perAppTimes'));
    if (stored) setPerAppTimes(JSON.parse(stored));
  }, []);

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

    // Pulse animation for alarm state
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    pulse.start();

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => {
      clearInterval(interval);
      pulse.stop();
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleLogTime = (appName: string) => {
    setSelectedApp(appName);
    setInputHours('');
    setInputMinutes('');
    setShowLogModal(true);
  };

  const handleSaveTime = async () => {
    if (!selectedApp) return;
    const h = parseInt(inputHours || '0', 10);
    const m = parseInt(inputMinutes || '0', 10);
    const addedSeconds = (h * 3600) + (m * 60);

    const updated = { ...perAppTimes, [selectedApp]: (perAppTimes[selectedApp] || 0) + addedSeconds };
    setPerAppTimes(updated);

    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.setItem('perAppTimes', JSON.stringify(updated));

    // Sum all app times
    const total = Object.values(updated).reduce((a, b) => a + b, 0);
    await setSocialMediaTime(total);

    setShowLogModal(false);
    await loadData();

    // Check if alarming
    const status = await runBattleCheck();
    if (status.type === 'winning' && winDays + 1 >= 1) {
      setCelebrationMsg(`🎉 Keep it up! You're ${formatTime(status.appTime)} ahead of social media today!`);
      setShowCelebration(true);
    }
  };

  const getStatusColor = () => {
    if (!battleStatus) return '#A855F7';
    switch (battleStatus.type) {
      case 'alarm': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'winning': return '#10B981';
      case 'tied': return '#6366F1';
      default: return '#A855F7';
    }
  };

  const getMascotMood = (): MascotMood => {
    switch (battleStatus?.type) {
      case 'alarm': return 'angry';
      case 'warning': return 'sad';
      case 'winning': return 'celebrate';
      default: return 'happy';
    }
  };

  const getStatusEmoji = () => {
    if (!battleStatus) return '⚔️';
    switch (battleStatus.type) {
      case 'alarm': return '🚨';
      case 'warning': return '⚠️';
      case 'winning': return '🏆';
      case 'tied': return '🤝';
      default: return '⚔️';
    }
  };

  const percentage = socialTime + appTime > 0
    ? Math.round((appTime / (socialTime + appTime)) * 100)
    : 50;

  const statusColor = getStatusColor();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>⚔️ Battle Arena</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Rank Card */}
          <View style={styles.rankCard}>
            <Text style={styles.rankEmoji}>🎮</Text>
            <View style={styles.rankInfo}>
              <Text style={styles.rankLevel}>Level {level}</Text>
              <Text style={styles.rankTitle}>{getBattleRankTitle(level)}</Text>
              <Text style={styles.rankDays}>
                🔥 {winDays} day{winDays !== 1 ? 's' : ''} winning streak
              </Text>
            </View>
            {winDays > 0 && (
              <View style={[styles.winBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: '#10B981' }]}>
                <Text style={styles.winBadgeText}>+{winDays} 🏅</Text>
              </View>
            )}
          </View>

          {/* Battle Status Banner */}
          <Animated.View
            style={[
              styles.statusBanner,
              {
                borderColor: statusColor,
                backgroundColor: `${statusColor}18`,
                transform: battleStatus?.type === 'alarm' ? [{ scale: pulseAnim }] : [],
              },
            ]}
          >
            <Mascot key={battleStatus?.type || 'none'} mood={getMascotMood()} size={84} style={{ marginRight: 12, alignSelf: 'flex-start' }} />
            <Text style={[styles.statusMessage, { color: statusColor }]}>
              {battleStatus?.message || 'Log your social media time to start the battle!'}
            </Text>
          </Animated.View>

          {/* VS Bar */}
          <View style={styles.vsCard}>
            <Text style={styles.vsCardTitle}>Today's Battle</Text>

            {/* App Time Row */}
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>📚 LinguaBloom</Text>
              <Text style={[styles.timeValue, { color: '#10B981' }]}>{formatTime(appTime)}</Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.barContainer}>
              <View style={[styles.barLeft, { flex: percentage, backgroundColor: '#10B981' }]} />
              <View style={[styles.barRight, { flex: 100 - percentage, backgroundColor: '#EF4444' }]} />
            </View>

            {/* Social Time Row */}
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>📱 Social Media</Text>
              <Text style={[styles.timeValue, { color: '#EF4444' }]}>{formatTime(socialTime)}</Text>
            </View>

            <Text style={styles.percentageText}>
              {appTime > socialTime
                ? `You're ${percentage}% learning today! 🌟`
                : appTime === 0 && socialTime === 0
                  ? 'Start logging to see your battle!'
                  : `Social media is ${100 - percentage}% of your time! 😬`}
            </Text>
          </View>

          {/* Level Progress */}
          <View style={styles.levelCard}>
            <Text style={styles.levelTitle}>🎯 Path to Level {level + 1}</Text>
            <View style={styles.levelBar}>
              <View style={[styles.levelFill, { width: `${Math.min((winDays % 3) / 3 * 100, 100)}%` }]} />
            </View>
            <Text style={styles.levelSubtext}>
              {winDays % 3}/3 days to level up — Win {3 - (winDays % 3)} more day{(3 - (winDays % 3)) !== 1 ? 's' : ''} to advance! 🚀
            </Text>
          </View>

          {/* Social Apps Grid */}
          <Text style={styles.sectionTitle}>📱 Log Social Media Time</Text>
          <Text style={styles.sectionSubtitle}>Tap an app to log your time spent today</Text>

          <View style={styles.appsGrid}>
            {SOCIAL_APPS.map((app) => (
              <TouchableOpacity
                key={app.name}
                style={styles.appCard}
                onPress={() => handleLogTime(app.name)}
                activeOpacity={0.8}
              >
                <Text style={styles.appEmoji}>{app.emoji}</Text>
                <Text style={styles.appName}>{app.name}</Text>
                {perAppTimes[app.name] ? (
                  <View style={styles.appTimeChip}>
                    <Text style={styles.appTimeText}>{formatTime(perAppTimes[app.name])}</Text>
                  </View>
                ) : (
                  <Text style={styles.appTapText}>+ Add time</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Motivational footer */}
          {battleStatus && (
            <View style={styles.motivationCard}>
              <Text style={styles.motivationText}>{battleStatus.motivationalMessage}</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/* Log Time Modal */}
      <Modal visible={showLogModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Log {selectedApp} Time
            </Text>
            <Text style={styles.modalSubtitle}>
              How much time did you spend today?
            </Text>

            <View style={styles.timeInputRow}>
              <View style={styles.timeInputBox}>
                <TextInput
                  style={styles.timeInput}
                  value={inputHours}
                  onChangeText={setInputHours}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#475569"
                  maxLength={2}
                />
                <Text style={styles.timeInputLabel}>Hours</Text>
              </View>
              <Text style={styles.timeSeparator}>:</Text>
              <View style={styles.timeInputBox}>
                <TextInput
                  style={styles.timeInput}
                  value={inputMinutes}
                  onChangeText={setInputMinutes}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#475569"
                  maxLength={2}
                />
                <Text style={styles.timeInputLabel}>Minutes</Text>
              </View>
            </View>

            {/* Quick pick buttons */}
            <Text style={styles.quickPickLabel}>Quick pick:</Text>
            <View style={styles.quickPickRow}>
              {['15m', '30m', '1h', '2h'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={styles.quickPickBtn}
                  onPress={() => {
                    if (t === '15m') { setInputHours('0'); setInputMinutes('15'); }
                    else if (t === '30m') { setInputHours('0'); setInputMinutes('30'); }
                    else if (t === '1h') { setInputHours('1'); setInputMinutes('0'); }
                    else if (t === '2h') { setInputHours('2'); setInputMinutes('0'); }
                  }}
                >
                  <Text style={styles.quickPickText}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveTime}>
              <Text style={styles.modalSaveBtnText}>Save ⚔️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLogModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Celebration Modal */}
      <Modal visible={showCelebration} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.celebrationCard}>
            <Text style={styles.celebrationEmoji}>🎉</Text>
            <Text style={styles.celebrationTitle}>You're WINNING!</Text>
            <Text style={styles.celebrationMessage}>{celebrationMsg}</Text>
            <Text style={styles.celebrationSub}>
              Keep it up for {3 - (winDays % 3)} more day{(3 - (winDays % 3)) !== 1 ? 's' : ''} to level up! 🚀
            </Text>
            <TouchableOpacity style={styles.modalSaveBtn} onPress={() => setShowCelebration(false)}>
              <Text style={styles.modalSaveBtnText}>Let's Keep Going! 💪</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A35' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },

  rankCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#172545', borderRadius: 20,
    padding: 20, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)',
  },
  rankEmoji: { fontSize: 36, marginRight: 16 },
  rankInfo: { flex: 1 },
  rankLevel: { color: '#A855F7', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  rankTitle: { color: '#FFF', fontWeight: '900', fontSize: 16, marginVertical: 2 },
  rankDays: { color: '#94A3B8', fontSize: 12 },
  winBadge: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 12, borderWidth: 1,
  },
  winBadgeText: { color: '#10B981', fontWeight: '800', fontSize: 12 },

  statusBanner: {
    marginHorizontal: 20, marginBottom: 16,
    borderRadius: 16, borderWidth: 1.5,
    padding: 16, flexDirection: 'row', alignItems: 'flex-start',
  },
  statusEmoji: { fontSize: 24, marginRight: 12, marginTop: 2 },
  statusMessage: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 20 },

  vsCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#172545', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#1E293B',
  },
  vsCardTitle: { color: '#FFF', fontWeight: '900', fontSize: 16, marginBottom: 16, textAlign: 'center' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timeLabel: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  timeValue: { fontSize: 18, fontWeight: '900' },
  barContainer: { flexDirection: 'row', height: 12, borderRadius: 10, overflow: 'hidden', marginVertical: 10 },
  barLeft: { borderRadius: 10 },
  barRight: { borderRadius: 10 },
  percentageText: { color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 8, fontWeight: '600' },

  levelCard: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: '#172545', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)',
  },
  levelTitle: { color: '#FFF', fontWeight: '800', fontSize: 14, marginBottom: 12 },
  levelBar: { height: 8, backgroundColor: '#1E293B', borderRadius: 10, overflow: 'hidden', marginBottom: 8 },
  levelFill: { height: '100%', backgroundColor: '#A855F7', borderRadius: 10 },
  levelSubtext: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },

  sectionTitle: { color: '#FFF', fontWeight: '900', fontSize: 18, marginHorizontal: 20, marginBottom: 4 },
  sectionSubtitle: { color: '#64748B', fontSize: 13, marginHorizontal: 20, marginBottom: 16 },

  appsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 16, gap: 10,
    justifyContent: 'space-between',
  },
  appCard: {
    width: '47%', backgroundColor: '#172545',
    borderRadius: 16, padding: 16,
    alignItems: 'center', marginBottom: 4,
    borderWidth: 1, borderColor: '#1E293B',
  },
  appEmoji: { fontSize: 32, marginBottom: 6 },
  appName: { color: '#E2E8F0', fontSize: 13, fontWeight: '700', marginBottom: 6 },
  appTimeChip: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)',
  },
  appTimeText: { color: '#EF4444', fontSize: 11, fontWeight: '800' },
  appTapText: { color: '#475569', fontSize: 11, fontWeight: '600' },

  motivationCard: {
    marginHorizontal: 20, marginTop: 8,
    backgroundColor: 'rgba(168,85,247,0.08)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)',
  },
  motivationText: { color: '#C4B5FD', fontSize: 14, fontWeight: '700', textAlign: 'center', lineHeight: 22 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#172545', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, borderWidth: 1, borderColor: '#1E293B',
  },
  modalTitle: { color: '#FFF', fontWeight: '900', fontSize: 20, marginBottom: 6 },
  modalSubtitle: { color: '#94A3B8', fontSize: 14, marginBottom: 24 },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  timeInputBox: { alignItems: 'center' },
  timeInput: {
    backgroundColor: '#1E293B', color: '#FFF',
    fontSize: 36, fontWeight: '900', textAlign: 'center',
    width: 90, height: 72, borderRadius: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  timeInputLabel: { color: '#64748B', fontSize: 12, marginTop: 6, fontWeight: '600' },
  timeSeparator: { color: '#A855F7', fontSize: 36, fontWeight: '900', marginHorizontal: 16, marginBottom: 20 },
  quickPickLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginBottom: 10 },
  quickPickRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickPickBtn: {
    flex: 1, backgroundColor: '#1E293B',
    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  quickPickText: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
  modalSaveBtn: {
    backgroundColor: '#A855F7', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  modalSaveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  modalCancelText: { color: '#64748B', textAlign: 'center', fontWeight: '600', paddingVertical: 8 },

  celebrationCard: {
    backgroundColor: '#172545', borderRadius: 28, margin: 24,
    padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.4)',
  },
  celebrationEmoji: { fontSize: 64, marginBottom: 16 },
  celebrationTitle: { color: '#10B981', fontWeight: '900', fontSize: 28, marginBottom: 12 },
  celebrationMessage: { color: '#FFF', fontSize: 15, textAlign: 'center', marginBottom: 8, lineHeight: 22 },
  celebrationSub: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 24 },
});
