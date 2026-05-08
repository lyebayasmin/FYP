import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, resetLanguageProgress, syncCurrentProgressToLanguage, loadLanguageProgressToStorage, getLanguageProgress } from './utils/userStorage';

// Level names helper
const getLevelName = (level: number): string => {
  if (level <= 3) return 'Beginner';
  if (level <= 6) return 'Intermediate';
  return 'Pro';
};

export default function WelcomeScreen() {
  const router = useRouter();
  const [userLevel, setUserLevel] = useState<string | null>(null);
  const [userLang, setUserLang] = useState<string>('english');
  const [beginnerLevel, setBeginnerLevel] = useState<number>(1);
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const [lessonIndex, setLessonIndex] = useState<number>(0);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    checkMotivation();
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const user = await getUserData();
    const lang = (user?.language || 'english').toLowerCase();
    setUserLang(lang);
    
    // First, try to load saved progress from language-specific storage
    if (lang !== 'english') {
      const savedProgress = await getLanguageProgress(lang);
      if (savedProgress) {
        // Load the saved progress into AsyncStorage so screens can use it
        await loadLanguageProgressToStorage(lang);
      }
    }
    
    // Now read from AsyncStorage (which may have been populated from saved progress)
    const level = await AsyncStorage.getItem('userLevel');
    const savedBeginnerLevel = await AsyncStorage.getItem('beginnerLevel');
    const savedBadges = await AsyncStorage.getItem('beginnerBadgeCount');
    const savedLessonIndex = await AsyncStorage.getItem('beginnerLessonIndex');
    
    setUserLevel(level);
    setBeginnerLevel(savedBeginnerLevel ? parseInt(savedBeginnerLevel) : 1);
    setBadgeCount(savedBadges ? parseInt(savedBadges) : 0);
    setLessonIndex(savedLessonIndex ? parseInt(savedLessonIndex) : 0);
  };
  
  const handleResetProgress = async () => {
    await resetLanguageProgress(userLang);
    setShowResetModal(false);
    setBeginnerLevel(1);
    setBadgeCount(0);
    setLessonIndex(0);
    // Go to knowledge check to start fresh
    router.replace('/KnowledgeCheckScreen');
  };

  const checkMotivation = async () => {
    const lastDate = await AsyncStorage.getItem('lastLessonDate');
    if (!lastDate) return;

    const last = new Date(lastDate);
    const today = new Date();
    const diffDays = Math.floor(
      (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays >= 2) {
      const messages = [
        "Hey! We miss you 💖 Come back and keep learning!",
        "Don't break your streak! Open a lesson today 🌸",
        "You were doing so well! Let's pick up where you left off 💪",
        "A little practice goes a long way 🌟 Let's go!",
      ];
      const random = messages[Math.floor(Math.random() * messages.length)];
      alert(`💌 Motivation Check!\n\n${random}`);
    }
  };

  const levelName = getLevelName(beginnerLevel);
  const BADGE_ICONS = ['🥉', '🥈', '🥇', '🏅', '🎖️', '👑', '💎', '🌟', '⭐', '🏆'];
  const currentBadge = badgeCount > 0 ? BADGE_ICONS[Math.min(badgeCount - 1, BADGE_ICONS.length - 1)] : '🎯';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome</Text>
      <Text style={styles.subtitle}>LinguaBloom</Text>

      {/* Level and Badge Display */}
      {userLang !== 'english' && (
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{levelName}</Text>
            </View>
            <View style={styles.badgeDisplay}>
              <Text style={styles.badgeIcon}>{currentBadge}</Text>
              <Text style={styles.badgeCount}>{badgeCount}</Text>
            </View>
          </View>
          <Text style={styles.lessonInfo}>
            Currently on Lesson {lessonIndex + 1}
          </Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.btn}
        onPress={() => {
          // Route based on user level and language
          if (userLevel === 'beginner' && userLang !== 'english') {
            router.push('/BeginnerLessonScreen');
          } else {
            router.push('/AdaptiveLessonScreen');
          }
        }}
      >
        <Text style={styles.btnText}>Start Lesson</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.btn}
        onPress={() => router.push('/ProgressScreen')}
      >
        <Text style={styles.btnText}>📊 My Progress</Text>
      </TouchableOpacity>

      {/* Reset Progress - only for non-English */}
      {userLang !== 'english' && lessonIndex > 0 && (
        <TouchableOpacity
          style={styles.btnReset}
          onPress={() => setShowResetModal(true)}
        >
          <Text style={styles.resetText}>Start From Beginning</Text>
        </TouchableOpacity>
      )}

      {/* Back to onboarding */}
      <TouchableOpacity
        style={styles.btnOutline}
        onPress={() => router.replace('/OnboardingQuestions')}
      >
        <Text style={styles.outlineText}>Change Language / Preferences</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={async () => {
          await AsyncStorage.removeItem('isLoggedIn');
          router.replace('/SplashScreen');
        }}
      >
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Reset Progress Modal */}
      <Modal visible={showResetModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>⚠️</Text>
            <Text style={styles.modalTitle}>Start From Beginning?</Text>
            <Text style={styles.modalSubtitle}>
              This will reset all your progress in {userLang.charAt(0).toUpperCase() + userLang.slice(1)}:{'\n\n'}
              - Level will reset to Beginner{'\n'}
              - Lesson progress will be cleared{'\n'}
              - Badges: {badgeCount} will be lost
            </Text>

            <TouchableOpacity style={styles.modalBtnDanger} onPress={handleResetProgress}>
              <Text style={styles.modalBtnDangerText}>Yes, Start Over</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowResetModal(false)}>
              <Text style={styles.modalBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF6FA1',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: { fontSize: 28, color: 'white', fontWeight: 'bold' },
  subtitle: { color: 'white', marginBottom: 16 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  badgeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeIcon: {
    fontSize: 18,
  },
  badgeCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  btn: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  btnText: { color: '#FF6FA1', fontWeight: 'bold' },
  btnOutline: {
    borderWidth: 2,
    borderColor: 'white',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  outlineText: { color: 'white', fontWeight: 'bold' },
  logoutBtn: {
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  logoutText: { color: 'white' },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  lessonInfo: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 8,
  },
  btnReset: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  resetText: { 
    color: 'white', 
    fontWeight: '500',
    fontSize: 13,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    elevation: 10,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF3D7F',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalBtnDanger: {
    backgroundColor: '#FF3D7F',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalBtnDangerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBtnCancel: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
