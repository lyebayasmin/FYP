import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { getLanguageProgress, syncCurrentProgressToLanguage } from './utils/userStorage';

const LANG_OPTIONS = [
  { id: 'English', label: 'English', emoji: '🇬🇧' },
  { id: 'German', label: 'German', emoji: '🇩🇪' },
  { id: 'Spanish', label: 'Spanish', emoji: '🇪🇸' },
  { id: 'Urdu', label: 'Urdu', emoji: '🇵🇰' },
];

const BADGE_ICONS = ['🥉', '🥈', '🥇', '🏅', '🎖️', '👑', '💎', '🌟', '⭐', '🏆'];

// One badge per level: finishing a level (3 perfect lessons) earns its badge
const LEVEL_BADGES = [
  { level: 'Beginner', icon: '🥉', need: 1, how: 'Complete 3 perfect lessons at Beginner' },
  { level: 'Intermediate', icon: '🥈', need: 2, how: 'Complete 3 perfect lessons at Intermediate' },
  { level: 'Advanced', icon: '🥇', need: 3, how: 'Complete 3 perfect lessons at Advanced' },
];

export default function ProgressScreen() {
  const router = useRouter();
  const [selectedLang, setSelectedLang] = useState<string | null>(null);
  
  const [count, setCount] = useState(0);
  const [praise, setPraise] = useState('');
  const [badgeCount, setBadgeCount] = useState(0);
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    const syncCurrent = async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const { language } = JSON.parse(userData);
        if (language) {
          await syncCurrentProgressToLanguage(language);
        }
      }
    };
    syncCurrent();
  }, []);

  const handleLanguageSelect = async (langId: string) => {
    let total = 0;
    let badges = 0;
    
    const progress = await getLanguageProgress(langId.toLowerCase());
    
    if (progress) {
      total = progress.beginnerLessonsCompleted || 0;
      badges = progress.beginnerBadgeCount || 0;
    } else {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const { language } = JSON.parse(userData);
        if (language?.toLowerCase() === langId.toLowerCase()) {
           const val = await AsyncStorage.getItem('lessonsCompleted');
           const savedBadges = await AsyncStorage.getItem('beginnerBadgeCount');
           const beginnerLessons = await AsyncStorage.getItem('beginnerLessonsCompleted');
           
           const globalTotal = val ? parseInt(val) : 0;
           badges = savedBadges ? parseInt(savedBadges) : 0;
           const bLessons = beginnerLessons ? parseInt(beginnerLessons) : 0;
           
           total = bLessons > 0 ? bLessons : globalTotal;
        }
      }
    }

    setCount(total);
    setBadgeCount(badges);

    if (total === 0) {
      setPraise("Start your first lesson!");
    } else if (total % 3 === 0) {
      setPraise(`Amazing! You've completed ${total} lessons! Keep it up!`);
    } else if (total % 3 === 1) {
      setPraise("Great start! Keep going!");
    } else {
      setPraise("You're doing really well! One more for a milestone!");
    }

    setSelectedLang(langId);
  };

  const getDisplayLevelName = (badges: number): string => {
    if (badges === 0) return 'Beginner';
    if (badges === 1) return 'Intermediate';
    return 'Advanced';
  };

  const levelName = getDisplayLevelName(badgeCount);
  const currentBadge = badgeCount > 0 ? BADGE_ICONS[Math.min(badgeCount - 1, BADGE_ICONS.length - 1)] : '🎯';

  return (
    <View style={styles.container}>
      {!selectedLang ? (
        <View style={styles.selectionContainer}>
          <Text style={styles.title}>My Progress 📊</Text>
          <Text style={styles.subtitle}>Select a language to view your progress</Text>
          
          <View style={styles.languagesGrid}>
            {LANG_OPTIONS.map((lang) => (
              <TouchableOpacity
                key={lang.id}
                style={styles.langCard}
                onPress={() => handleLanguageSelect(lang.id)}
              >
                <Text style={styles.langEmoji}>{lang.emoji}</Text>
                <Text style={styles.langLabel}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity style={styles.btnSecondary} onPress={() => router.back()}>
            <Text style={styles.btnSecondaryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.progressContainer}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => setSelectedLang(null)} style={styles.backIconBtn}>
              <Text style={styles.backIconText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{selectedLang} Progress</Text>
            {/* Spacer */}
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{levelName} Level</Text>
            </View>
            <TouchableOpacity
              style={styles.badgeDisplay}
              onPress={() => setShowBadges(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.badgeIcon}>{currentBadge}</Text>
              <Text style={styles.badgeCountText}>{badgeCount} {badgeCount === 1 ? 'badge' : 'badges'}</Text>
              <Text style={styles.badgeChevron}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.countBox}>
            <Text style={styles.count}>{count}</Text>
            <Text style={styles.label}>Lessons Completed</Text>
          </View>

          <View style={styles.praiseBox}>
            <Text style={styles.praiseText}>{praise}</Text>
          </View>

          <View style={styles.barBackground}>
            <View style={[styles.barFill, { width: `${Math.min((count % 3) / 3 * 100, 100)}%` }]} />
          </View>
          <Text style={styles.barLabel}>{count % 3}/3 towards next milestone 🎯</Text>

          <TouchableOpacity style={styles.btnPrimary} onPress={() => router.back()}>
            <Text style={styles.btnPrimaryText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Badges for each level */}
      <Modal visible={showBadges} transparent animationType="fade" onRequestClose={() => setShowBadges(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedLang} Badges</Text>
            <Text style={styles.modalSub}>
              {badgeCount === 0
                ? 'No badges yet. Finish your first level to earn one!'
                : `You have earned ${badgeCount} ${badgeCount === 1 ? 'badge' : 'badges'}.`}
            </Text>

            {LEVEL_BADGES.map((b) => {
              const earned = badgeCount >= b.need;
              const isCurrent = levelName === b.level;
              return (
                <View
                  key={b.level}
                  style={[styles.levelRow, earned && styles.levelRowEarned, isCurrent && styles.levelRowCurrent]}
                >
                  <Text style={[styles.levelRowIcon, !earned && styles.locked]}>{earned ? b.icon : '🔒'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.levelRowTitle}>{b.level} Level{isCurrent ? ' · current' : ''}</Text>
                    <Text style={styles.levelRowSub}>{earned ? 'Badge earned!' : b.how}</Text>
                  </View>
                </View>
              );
            })}

            {badgeCount > LEVEL_BADGES.length && (
              <Text style={styles.modalSub}>
                Bonus badges: {BADGE_ICONS.slice(LEVEL_BADGES.length, Math.min(badgeCount, BADGE_ICONS.length)).join(' ')}
              </Text>
            )}

            <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowBadges(false)}>
              <Text style={styles.btnPrimaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  badgeChevron: { color: '#94A3B8', fontSize: 18, fontWeight: '800' },
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
    padding: 24,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', textAlign: 'center', marginBottom: 6 },
  modalSub: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 16, lineHeight: 20 },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  levelRowEarned: { borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.08)' },
  levelRowCurrent: { borderColor: '#A855F7' },
  levelRowIcon: { fontSize: 34, marginRight: 14 },
  locked: { opacity: 0.6 },
  levelRowTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  levelRowSub: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
  container: {
    flex: 1,
    backgroundColor: '#0F1A35',
    padding: 24,
    justifyContent: 'center',
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 40,
    textAlign: 'center',
  },
  languagesGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 40,
  },
  langCard: {
    width: '47%',
    backgroundColor: '#172545',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  langEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  langLabel: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 16,
  },
  progressContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
  },
  backIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 30,
  },
  levelBadge: {
    backgroundColor: '#A855F7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  levelText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  badgeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  badgeIcon: {
    fontSize: 18,
  },
  badgeCountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E2E8F0',
  },
  countBox: {
    backgroundColor: '#172545',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  count: {
    fontSize: 72,
    fontWeight: '900',
    color: '#A855F7',
  },
  label: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 8,
    fontWeight: '600',
  },
  praiseBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
  },
  praiseText: {
    color: '#C4B5FD',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  barBackground: {
    width: '100%',
    height: 12,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    marginBottom: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 10,
  },
  barLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 40,
    fontWeight: '600',
  },
  btnPrimary: {
    backgroundColor: '#A855F7',
    padding: 18,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    padding: 18,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  btnSecondaryText: {
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 16,
  },
});