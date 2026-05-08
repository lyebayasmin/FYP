/**
 * BeginnerLessonScreen — Shows words with translations before quiz
 * ─────────────────────────────────────────────────────────────────────
 * Uses words.json for vocabulary data
 * - Beginner (Level 1-3): 1 word at a time
 * - Intermediate (Level 4-6): 2 words at a time (shown as pairs)
 * - Pro (Level 7+): 3 words at a time (shown as triplets)
 * - Badge system that increases every 3 completed lessons
 * - Progress is saved per language
 */

import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, syncCurrentProgressToLanguage } from './utils/userStorage';
import wordsData from '../data/words.json';

type LangKey = 'spanish' | 'german' | 'urdu';

interface WordEntry {
  word: string;
  translation: string;
}

interface Lesson {
  id: number;
  title: string;
  words: WordEntry[];
  phrases?: WordEntry[];
}

const LANG_LABELS: Record<LangKey, string> = {
  german: 'German',
  spanish: 'Spanish',
  urdu: 'Urdu',
};

const LANG_FLAGS: Record<LangKey, string> = {
  german: '🇩🇪',
  spanish: '🇪🇸',
  urdu: '🇵🇰',
};

const BADGE_ICONS = ['🥉', '🥈', '🥇', '🏅', '🎖️', '👑', '💎', '🌟', '⭐', '🏆'];

const getLevelName = (level: number): string => {
  if (level <= 3) return 'Beginner';
  if (level <= 6) return 'Intermediate';
  return 'Pro';
};

const getLevelColor = (level: number): string => {
  if (level <= 3) return '#4CAF50'; // Green for Beginner
  if (level <= 6) return '#FF9800'; // Orange for Intermediate
  return '#9C27B0'; // Purple for Pro
};

// Get word count based on level
const getWordCountPerItem = (level: number): number => {
  if (level <= 3) return 1; // Beginner: 1 word
  if (level <= 6) return 2; // Intermediate: 2 words
  return 3; // Pro: 3 words
};

export default function BeginnerLessonScreen() {
  const router = useRouter();
  const [lang, setLang] = useState<LangKey>('spanish');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [badgeCount, setBadgeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [displayWords, setDisplayWords] = useState<WordEntry[]>([]);
  const [wordCountPerItem, setWordCountPerItem] = useState(1);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const user = await getUserData();
    const userLang = ((user?.language || 'spanish').toLowerCase()) as string;
    
    // Only support non-English languages
    const safeLang: LangKey = ['german', 'spanish', 'urdu'].includes(userLang)
      ? (userLang as LangKey)
      : 'spanish';

    // Get current lesson index, level, and badges
    const savedLessonIndex = await AsyncStorage.getItem('beginnerLessonIndex');
    const savedLevel = await AsyncStorage.getItem('beginnerLevel');
    const savedBadges = await AsyncStorage.getItem('beginnerBadgeCount');
    
    const currentIndex = savedLessonIndex ? parseInt(savedLessonIndex) : 0;
    const currentLevel = savedLevel ? parseInt(savedLevel) : 1;
    const currentBadges = savedBadges ? parseInt(savedBadges) : 0;

    setLang(safeLang);
    setLessonIndex(currentIndex);
    setUserLevel(currentLevel);
    setBadgeCount(currentBadges);

    // Get word count per item based on level
    // Beginner (1-3): 1 word, Intermediate (4-6): 2 words, Pro (7+): 3 words
    const wordsPerItem = getWordCountPerItem(currentLevel);
    setWordCountPerItem(wordsPerItem);

    // Get the lesson data from words.json
    const langData = wordsData[safeLang as keyof typeof wordsData];
    if (langData && langData.lessons[currentIndex]) {
      const currentLesson = langData.lessons[currentIndex] as Lesson;
      setLesson(currentLesson);
      
      // Create combined word entries based on level
      const allWords = currentLesson.words || [];
      const combinedWords: WordEntry[] = [];
      
      if (wordsPerItem === 1) {
        // Beginner: show individual words (max 10)
        combinedWords.push(...allWords.slice(0, 10));
      } else {
        // Intermediate/Pro: combine words into groups
        for (let i = 0; i < allWords.length && combinedWords.length < 5; i += wordsPerItem) {
          const group = allWords.slice(i, i + wordsPerItem);
          if (group.length === wordsPerItem) {
            combinedWords.push({
              word: group.map(w => w.word).join(' '),
              translation: group.map(w => w.translation).join(', '),
            });
          }
        }
      }
      
      setDisplayWords(combinedWords);
    }

    // Save progress to language-specific storage
    await syncCurrentProgressToLanguage(safeLang);

    setLoading(false);
    animateIn();
  };

  const animateIn = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  const handleLessonComplete = () => {
    setShowQuizPrompt(true);
  };

  const handleTakeQuiz = async () => {
    setShowQuizPrompt(false);
    // Save current lesson words for the quiz
    if (displayWords.length > 0) {
      await AsyncStorage.setItem('currentQuizWords', JSON.stringify(displayWords));
      await AsyncStorage.setItem('currentQuizLang', lang);
      await AsyncStorage.setItem('currentQuizUsePhrases', wordCountPerItem > 1 ? 'true' : 'false');
    }
    router.push('/BeginnerQuizScreen');
  };

  const handleStudyMore = () => {
    setShowQuizPrompt(false);
  };

  const getBadgeIcon = (count: number) => {
    if (count <= 0) return '🎯';
    return BADGE_ICONS[Math.min(count - 1, BADGE_ICONS.length - 1)];
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Loading your lesson...</Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>No lessons available</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/WelcomeScreen')}>
          <Text style={styles.backBtnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const levelName = getLevelName(userLevel);
  const levelColor = getLevelColor(userLevel);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header with level and badge */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
              <Text style={styles.levelBadgeText}>{levelName}</Text>
            </View>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeIcon}>{getBadgeIcon(badgeCount)}</Text>
              <Text style={styles.badgeCount}>{badgeCount}</Text>
            </View>
          </View>
          <Text style={styles.title}>{LANG_FLAGS[lang]} Vocabulary Lesson</Text>
          <Text style={styles.subtitle}>
            {LANG_LABELS[lang]} - Lesson {lessonIndex + 1}: {lesson.title}
          </Text>
        </View>

        {/* Progress info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>
            {wordCountPerItem === 1 
              ? `📖 Study these ${displayWords.length} words`
              : `📖 Study these ${displayWords.length} word combinations`}
          </Text>
          <Text style={styles.infoText}>
            {wordCountPerItem === 1 
              ? 'Read each word carefully with its English meaning. After studying, you will take a quiz!' 
              : wordCountPerItem === 2
                ? 'Read each 2-word combination carefully. Notice how words relate to each other!'
                : 'Read each 3-word combination carefully. You are learning like a pro!'}
          </Text>
          {wordCountPerItem > 1 && (
            <View style={[styles.levelHint, { backgroundColor: levelColor + '20' }]}>
              <Text style={[styles.levelHintText, { color: levelColor }]}>
                {wordCountPerItem === 2 
                  ? `⚡ ${levelName} Level: Learning ${wordCountPerItem} words at a time!`
                  : `🔥 ${levelName} Level: Learning ${wordCountPerItem} words at a time!`}
              </Text>
            </View>
          )}
        </View>

        {/* Word cards */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {displayWords.map((item, index) => (
            <View key={index} style={styles.wordCard}>
              <View style={styles.wordNumber}>
                <Text style={styles.wordNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.wordContent}>
                <Text style={styles.foreignWord}>{item.word}</Text>
                <View style={styles.translationRow}>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.englishWord}>{item.translation}</Text>
                </View>
              </View>
              <Text style={styles.langFlag}>{LANG_FLAGS[lang]}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Study tip */}
        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Study Tip</Text>
          <Text style={styles.tipText}>
            {wordCountPerItem === 1 
              ? 'Try saying each word aloud! Connecting the sound with the meaning helps you remember better.'
              : wordCountPerItem === 2
                ? 'Notice how words pair together! Understanding word combinations makes you fluent faster.'
                : 'You are now learning phrases! Try to remember the whole combination as a single unit.'}
          </Text>
        </View>

        {/* Complete button */}
        <TouchableOpacity style={styles.completeBtn} onPress={handleLessonComplete}>
          <Text style={styles.completeBtnText}>I am Ready for the Quiz!</Text>
        </TouchableOpacity>

        {/* Back button */}
        <TouchableOpacity style={styles.backLink} onPress={() => router.replace('/WelcomeScreen')}>
          <Text style={styles.backLinkText}>← Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Quiz Prompt Modal */}
      <Modal visible={showQuizPrompt} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>📚</Text>
            <Text style={styles.modalTitle}>Ready for the Quiz?</Text>
            <Text style={styles.modalSubtitle}>
              You have studied {displayWords.length} {wordCountPerItem > 1 ? 'word combinations' : 'words'} in {LANG_LABELS[lang]}.{'\n'}
              The quiz will have 5 questions to test your memory!
            </Text>

            <TouchableOpacity style={styles.modalBtnYes} onPress={handleTakeQuiz}>
              <Text style={styles.modalBtnYesText}>Yes, Start Quiz!</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtnNo} onPress={handleStudyMore}>
              <Text style={styles.modalBtnNoText}>Study a bit more</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE4EC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFE4EC',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#FF6FA1',
    fontWeight: 'bold',
  },
  backBtn: {
    marginTop: 20,
    backgroundColor: '#FF6FA1',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  backBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  levelBadge: {
    backgroundColor: '#FF3D7F',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeCount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3D7F',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6FA1',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF3D7F',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  levelHint: {
    backgroundColor: '#FFF0F5',
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
  },
  levelHintText: {
    fontSize: 12,
    color: '#CC2060',
    fontWeight: '600',
  },
  wordCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#FF6FA1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  wordNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  wordNumberText: {
    color: '#FF3D7F',
    fontWeight: 'bold',
    fontSize: 13,
  },
  wordContent: {
    flex: 1,
  },
  foreignWord: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#CC2060',
    marginBottom: 4,
  },
  translationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  arrow: {
    color: '#FF6FA1',
    marginRight: 6,
    fontSize: 14,
  },
  englishWord: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  langFlag: {
    fontSize: 20,
    marginLeft: 10,
  },
  tipBox: {
    backgroundColor: '#FFF0F5',
    borderRadius: 14,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6FA1',
  },
  tipTitle: {
    fontWeight: 'bold',
    color: '#FF3D7F',
    marginBottom: 6,
    fontSize: 14,
  },
  tipText: {
    color: '#555',
    fontSize: 13,
    lineHeight: 20,
  },
  completeBtn: {
    backgroundColor: '#FF3D7F',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF3D7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  completeBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  backLinkText: {
    color: '#FF6FA1',
    fontWeight: '600',
    fontSize: 14,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
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
    fontSize: 52,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
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
  modalBtnYes: {
    backgroundColor: '#FF3D7F',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalBtnYesText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBtnNo: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnNoText: {
    color: '#FF6FA1',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
