/**
 * BeginnerQuizScreen — Quiz for Total Beginners
 * ─────────────────────────────────────────────────────────────────────
 * - 5 questions: word in target language → pick English translation
 * - Shows correct answer with explanation on wrong answers
 * - Retake option until all 5 correct
 * - Badge system: earn a new badge every 3 completed lessons
 * - Level names: Beginner, Intermediate, Pro
 * - Badge animation with haptic feedback when earned
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
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import wordsData from '../data/words.json';
import { syncCurrentProgressToLanguage } from './utils/userStorage';

type LangKey = 'spanish' | 'german' | 'urdu';

interface WordEntry {
  word: string;
  translation: string;
}

interface Question {
  foreignPhrase: string;
  correctAnswer: string;
  options: string[];
  explanation: string;
  words: WordEntry[];
}

const LANG_LABELS: Record<LangKey, string> = {
  german: 'German',
  spanish: 'Spanish',
  urdu: 'Urdu',
};

const QUIZ_SIZE = 5;
const BADGE_ICONS = ['🥉', '🥈', '🥇', '🏅', '🎖️', '👑', '💎', '🌟', '⭐', '🏆'];

// Level names instead of numbers
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

// Praise messages for badge earning
const PRAISE_MESSAGES = [
  "You're absolutely AMAZING! 🌟",
  "Incredible achievement! You're a language superstar! ⭐",
  "WOW! You're crushing it! Keep shining! 💫",
  "Outstanding work! Your dedication is inspiring! 🎯",
  "Phenomenal! You're on fire! 🔥",
  "Spectacular! Nothing can stop you now! 🚀",
  "Brilliant! Your hard work is paying off! 💎",
  "Exceptional! You're a true champion! 🏆",
];

const getRandomPraise = () => {
  return PRAISE_MESSAGES[Math.floor(Math.random() * PRAISE_MESSAGES.length)];
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function BeginnerQuizScreen() {
  const router = useRouter();

  const [lang, setLang] = useState<LangKey>('spanish');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [showNewBadge, setShowNewBadge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLevel, setUserLevel] = useState(1);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [newBadgeIcon, setNewBadgeIcon] = useState('🥉');
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [lessonWords, setLessonWords] = useState<WordEntry[]>([]);
  const [praiseMessage, setPraiseMessage] = useState('');

  const cardAnim = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0)).current;
  const badgeRotate = useRef(new Animated.Value(0)).current;
  const badgeSlideY = useRef(new Animated.Value(-200)).current;
  const congratsScale = useRef(new Animated.Value(0)).current;
  const confettiAnims = useRef(
    [...Array(30)].map(() => ({
      translateY: new Animated.Value(-50),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    init();
  }, []);

  // Use vibration for tactile feedback when badge is earned
  const triggerHapticFeedback = () => {
    try {
      // Vibration pattern for celebration: short-pause-long
      if (Platform.OS !== 'web') {
        const { Vibration } = require('react-native');
        Vibration.vibrate([0, 100, 100, 200]);
      }
    } catch (error) {
      // Vibration not available, continue with visual feedback only
    }
  };

  const init = async () => {
    // Get current quiz words from lesson
    const savedWords = await AsyncStorage.getItem('currentQuizWords');
    const savedLang = await AsyncStorage.getItem('currentQuizLang');
    const savedLevel = await AsyncStorage.getItem('beginnerLevel');
    const savedLessonIndex = await AsyncStorage.getItem('beginnerLessonIndex');
    const savedBadges = await AsyncStorage.getItem('beginnerBadgeCount');
    const savedLessonsCompleted = await AsyncStorage.getItem('beginnerLessonsCompleted');

    const currentLevel = savedLevel ? parseInt(savedLevel) : 1;
    const currentLessonIndex = savedLessonIndex ? parseInt(savedLessonIndex) : 0;
    const currentBadges = savedBadges ? parseInt(savedBadges) : 0;
    const completedCount = savedLessonsCompleted ? parseInt(savedLessonsCompleted) : 0;

    setUserLevel(currentLevel);
    setLessonIndex(currentLessonIndex);
    setBadgeCount(currentBadges);
    setLessonsCompleted(completedCount);

    if (savedLang && ['spanish', 'german', 'urdu'].includes(savedLang)) {
      setLang(savedLang as LangKey);
    }

    // Words-per-item based on level: 1-3 = 1 word, 4-6 = 2 words, 7+ = 3 words
    const wordsPerItem = currentLevel <= 3 ? 1 : currentLevel <= 6 ? 2 : 3;

    let words: WordEntry[] = [];
    if (savedWords) {
      words = JSON.parse(savedWords);
    } else {
      // Fallback: load from words.json and combine by level
      const langData = wordsData[(savedLang || 'spanish') as keyof typeof wordsData];
      if (langData && langData.lessons[currentLessonIndex]) {
        const rawWords: WordEntry[] = langData.lessons[currentLessonIndex].words;
        if (wordsPerItem === 1) {
          words = rawWords.slice(0, 10);
        } else {
          for (let i = 0; i < rawWords.length && words.length < 5; i += wordsPerItem) {
            const group = rawWords.slice(i, i + wordsPerItem);
            if (group.length === wordsPerItem) {
              words.push({
                word: group.map((w: WordEntry) => w.word).join(' '),
                translation: group.map((w: WordEntry) => w.translation).join(', '),
              });
            }
          }
        }
      }
    }

    setLessonWords(words);
    const qs = buildQuestions(words);
    setQuestions(qs);
    setLoading(false);
    animateCardIn();
  };

  const buildQuestions = (words: WordEntry[]): Question[] => {
    // Need at least 2 entries: 1 correct + at least 1 distractor
    if (words.length < 2) return [];

    const questions: Question[] = [];
    const shuffledWords = shuffle([...words]);

    for (let i = 0; i < QUIZ_SIZE && i < shuffledWords.length; i++) {
      const questionWord = shuffledWords[i];
      const foreignPhrase = questionWord.word;
      const correctAnswer = questionWord.translation;

      // Generate distractors from all other words
      const otherWords = words.filter(w => w.word !== questionWord.word);
      const distractors = shuffle(otherWords)
        .map(w => w.translation)
        .filter(t => t !== correctAnswer)
        .slice(0, 3);

      // Pad with safe placeholders if pool is too small (avoids infinite loop)
      const placeholders = ['(none of these)', '(not applicable)', '(unknown)'];
      let pIdx = 0;
      while (distractors.length < 3) {
        const p = placeholders[pIdx++ % placeholders.length];
        if (!distractors.includes(p)) distractors.push(p);
      }

      const explanation = `"${questionWord.word}" means "${questionWord.translation}" in English.`;

      questions.push({
        foreignPhrase,
        correctAnswer,
        options: shuffle([correctAnswer, ...distractors.slice(0, 3)]),
        explanation,
        words: [questionWord],
      });
    }

    return questions;
  };

  const animateCardIn = () => {
    cardAnim.setValue(50);
    Animated.timing(cardAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const animateBadgeEntry = () => {
    // Reset animations
    badgeSlideY.setValue(-200);
    badgeScale.setValue(0);
    badgeRotate.setValue(0);

    // Slide down from top of screen with bounce
    Animated.sequence([
      Animated.spring(badgeSlideY, {
        toValue: 0,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1.3,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(badgeRotate, {
          toValue: 2,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.spring(badgeScale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate confetti
    animateConfetti();
  };

  const animateConfetti = () => {
    const { width, height } = Dimensions.get('window');
    
    confettiAnims.forEach((anim, index) => {
      const randomX = (Math.random() - 0.5) * width;
      const randomDelay = Math.random() * 500;
      
      anim.translateY.setValue(-50);
      anim.translateX.setValue(randomX);
      anim.rotate.setValue(0);
      anim.opacity.setValue(1);

      Animated.sequence([
        Animated.delay(randomDelay),
        Animated.parallel([
          Animated.timing(anim.translateY, {
            toValue: height + 100,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.translateX, {
            toValue: randomX + (Math.random() - 0.5) * 200,
            duration: 2000 + Math.random() * 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: Math.random() * 10,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: 2500,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  };

  const animateCongrats = () => {
    congratsScale.setValue(0);
    Animated.spring(congratsScale, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);

    const isCorrect = option === questions[currentIndex].correctAnswer;
    if (isCorrect) {
      setScore(s => s + 1);
    } else {
      setMistakes(m => [...m, currentIndex]);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setShowResults(true);
    } else {
      setCurrentIndex(currentIndex + 1);
      setSelected(null);
      animateCardIn();
    }
  };

  const handleRetakeQuiz = () => {
    // Retake with same questions, reshuffled options
    const reshuffled = questions.map(q => ({
      ...q,
      options: shuffle([...q.options]),
    }));
    setQuestions(reshuffled);
    setCurrentIndex(0);
    setSelected(null);
    setScore(0);
    setMistakes([]);
    setShowResults(false);
    animateCardIn();
  };

  const handleNextLesson = async () => {
    const isPerfect = score === QUIZ_SIZE;
    
    if (isPerfect) {
      // Increment lessons completed
      const newLessonsCompleted = lessonsCompleted + 1;
      
      // Check if we earned a new badge (every 3 lessons)
      const newBadgeEarned = newLessonsCompleted % 3 === 0;
      let newBadgeCount = badgeCount;
      
      if (newBadgeEarned) {
        newBadgeCount = badgeCount + 1;
        setNewBadgeIcon(BADGE_ICONS[Math.min(newBadgeCount - 1, BADGE_ICONS.length - 1)]);
        setBadgeCount(newBadgeCount);
        setPraiseMessage(getRandomPraise());
        await AsyncStorage.setItem('beginnerBadgeCount', String(newBadgeCount));
      }
      
      // Level up every 3 badges
      const shouldLevelUp = newBadgeEarned && (newBadgeCount % 1 === 0);
      let newLevel = userLevel;
      
      if (shouldLevelUp) {
        newLevel = userLevel + 1;
        setUserLevel(newLevel);
      }

      // Move to next lesson
      const langData = wordsData[lang as keyof typeof wordsData];
      const nextLessonIndex = (lessonIndex + 1) % langData.lessons.length;

      // Save progress to AsyncStorage
      await AsyncStorage.setItem('beginnerLevel', String(newLevel));
      await AsyncStorage.setItem('beginnerLessonIndex', String(nextLessonIndex));
      await AsyncStorage.setItem('beginnerLessonsCompleted', String(newLessonsCompleted));
      await AsyncStorage.setItem('lastLessonDate', new Date().toDateString());

      // Also save progress to language-specific storage for persistence
      await syncCurrentProgressToLanguage(lang);

      setLessonsCompleted(newLessonsCompleted);

      // Show congratulations popup
      if (newBadgeEarned) {
        setShowNewBadge(true);
        triggerHapticFeedback();
        setTimeout(() => animateBadgeEntry(), 100);
      } else {
        setShowCongrats(true);
        animateCongrats();
      }
    } else {
      // Not perfect, just go to next lesson (no badge)
      const langData = wordsData[lang as keyof typeof wordsData];
      const nextLessonIndex = (lessonIndex + 1) % langData.lessons.length;
      await AsyncStorage.setItem('beginnerLessonIndex', String(nextLessonIndex));
      // Save progress even on non-perfect scores
      await syncCurrentProgressToLanguage(lang);
      router.replace('/BeginnerLessonScreen');
    }
  };

  const handleContinueAfterCongrats = () => {
    setShowCongrats(false);
    setShowNewBadge(false);
    router.replace('/BeginnerLessonScreen');
  };

  const getBadgeIcon = (count: number) => {
    if (count <= 0) return '🎯';
    return BADGE_ICONS[Math.min(count - 1, BADGE_ICONS.length - 1)];
  };

  const getOptionStyle = (option: string) => {
    if (!selected) return styles.option;
    if (option === questions[currentIndex]?.correctAnswer) {
      return [styles.option, styles.optionCorrect];
    }
    if (option === selected) {
      return [styles.option, styles.optionWrong];
    }
    return [styles.option, styles.optionDim];
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Preparing your quiz...</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>No questions available</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/BeginnerLessonScreen')}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const levelName = getLevelName(userLevel);
  const levelColor = getLevelColor(userLevel);

  // New Badge Popup with enhanced animation
  if (showNewBadge) {
    const spin = badgeRotate.interpolate({
      inputRange: [0, 2],
      outputRange: ['0deg', '720deg'],
    });

    const confettiEmojis = ['🎉', '🎊', '✨', '⭐', '💫', '🌟', '💖', '🎈'];

    return (
      <View style={styles.congratsContainer}>
        {/* Animated confetti */}
        {confettiAnims.map((anim, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.confetti,
              {
                transform: [
                  { translateY: anim.translateY },
                  { translateX: anim.translateX },
                  { rotate: anim.rotate.interpolate({
                    inputRange: [0, 10],
                    outputRange: ['0deg', '3600deg'],
                  })},
                ],
                opacity: anim.opacity,
                left: '50%',
              },
            ]}
          >
            {confettiEmojis[i % confettiEmojis.length]}
          </Animated.Text>
        ))}

        {/* Badge sliding from top */}
        <Animated.View
          style={[
            styles.badgePopup,
            {
              transform: [
                { translateY: badgeSlideY },
                { scale: badgeScale },
                { rotate: spin },
              ],
            },
          ]}
        >
          <Text style={styles.newBadgeIcon}>{newBadgeIcon}</Text>
        </Animated.View>

        <View style={styles.congratsContent}>
          <Text style={styles.congratsTitle}>NEW BADGE EARNED!</Text>
          <Text style={styles.praiseMessage}>{praiseMessage}</Text>
          <Text style={styles.congratsSubtitle}>
            You have earned badge #{badgeCount}!
          </Text>
          <Text style={[styles.congratsLevel, { color: levelColor }]}>
            {levelName} - Keep going!
          </Text>

          <View style={styles.badgeProgress}>
            <Text style={styles.badgeProgressText}>
              Your Collection: {badgeCount} Badges
            </Text>
            <View style={styles.badgeRow}>
              {[...Array(Math.min(badgeCount, 10))].map((_, i) => (
                <Animated.Text 
                  key={i} 
                  style={[
                    styles.badgeRowIcon,
                    i === badgeCount - 1 && styles.newBadgeHighlight,
                  ]}
                >
                  {BADGE_ICONS[Math.min(i, BADGE_ICONS.length - 1)]}
                </Animated.Text>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.congratsBtn} onPress={handleContinueAfterCongrats}>
            <Text style={styles.congratsBtnText}>Continue Learning!</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Regular Congrats Popup (perfect score but not a badge milestone)
  if (showCongrats) {
    return (
      <View style={styles.congratsContainer}>
        <Animated.View style={[styles.congratsCard, { transform: [{ scale: congratsScale }] }]}>
          <Text style={styles.congratsEmoji}>🎉</Text>
          <Text style={styles.congratsTitle}>PERFECT SCORE!</Text>
          <Text style={styles.congratsSubtitle}>
            Amazing! You got all 5 answers correct!
          </Text>
          <Text style={styles.congratsProgress}>
            {3 - (lessonsCompleted % 3)} more perfect lessons until next badge!
          </Text>

          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeLabel}>Current Badges</Text>
            <Text style={styles.currentBadgeIcon}>{getBadgeIcon(badgeCount)}</Text>
            <Text style={styles.currentBadgeCount}>{badgeCount}</Text>
          </View>

          <TouchableOpacity style={styles.congratsBtn} onPress={handleContinueAfterCongrats}>
            <Text style={styles.congratsBtnText}>Next Lesson!</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // Results screen
  if (showResults) {
    const isPerfect = score === QUIZ_SIZE;
    const hasMistakes = mistakes.length > 0;

    return (
      <View style={styles.resultsContainer}>
        <View style={styles.resultsCard}>
          {/* Badge display with level name */}
          <View style={styles.resultsBadgeRow}>
            <View style={[styles.resultsLevelBadge, { backgroundColor: levelColor }]}>
              <Text style={styles.resultsLevelText}>{levelName}</Text>
            </View>
            <View style={styles.resultsBadgeContainer}>
              <Text style={styles.resultsBadgeIcon}>{getBadgeIcon(badgeCount)}</Text>
              <Text style={styles.resultsBadgeCount}>{badgeCount}</Text>
            </View>
          </View>

          <Text style={styles.resultsEmoji}>
            {isPerfect ? '🏆' : hasMistakes ? '📚' : '🌟'}
          </Text>
          <Text style={styles.resultsTitle}>
            {isPerfect ? 'Perfect Score!' : 'Quiz Complete!'}
          </Text>
          <Text style={styles.resultsScore}>{score} / {QUIZ_SIZE}</Text>
          <Text style={styles.resultsMsg}>
            {isPerfect 
              ? "Amazing! You have mastered these words!"
              : hasMistakes 
                ? `You made ${mistakes.length} mistake${mistakes.length > 1 ? 's' : ''}. Keep practicing!`
                : 'Great job!'}
          </Text>

          {/* Retake or Next */}
          {hasMistakes && !isPerfect ? (
            <>
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetakeQuiz}>
                <Text style={styles.retakeBtnText}>Retake Quiz</Text>
              </TouchableOpacity>
              <Text style={styles.retakeHint}>
                Get all 5 correct to earn progress toward your next badge!
              </Text>
              <TouchableOpacity style={styles.nextLessonBtn} onPress={handleNextLesson}>
                <Text style={styles.nextLessonBtnText}>Skip to Next Lesson</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.nextLessonBtn} onPress={handleNextLesson}>
              <Text style={styles.nextLessonBtnText}>
                {isPerfect ? 'Claim Reward & Continue!' : 'Next Lesson'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.homeLink} onPress={() => router.replace('/WelcomeScreen')}>
            <Text style={styles.homeLinkText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Quiz screen
  const q = questions[currentIndex];
  const isCorrect = selected === q.correctAnswer;
  const isWrong = selected !== null && selected !== q.correctAnswer;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header with level name and badge */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/BeginnerLessonScreen')}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        
        <View style={styles.headerBadges}>
          <View style={[styles.levelBadgeSmall, { backgroundColor: levelColor }]}>
            <Text style={styles.levelBadgeSmallText}>{levelName}</Text>
          </View>
          <View style={styles.badgeSmall}>
            <Text style={styles.badgeSmallIcon}>{getBadgeIcon(badgeCount)}</Text>
            <Text style={styles.badgeSmallCount}>{badgeCount}</Text>
          </View>
        </View>

        <View style={styles.progressDots}>
          {Array.from({ length: QUIZ_SIZE }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < currentIndex && styles.dotDone,
                i === currentIndex && styles.dotCurrent,
              ]}
            />
          ))}
        </View>

        <Text style={styles.counter}>{currentIndex + 1}/{QUIZ_SIZE}</Text>
      </View>

      {/* Question card */}
      <Animated.View style={[styles.questionCard, { transform: [{ translateY: cardAnim }] }]}>
        <Text style={styles.questionLabel}>
          What does this mean in English?
        </Text>
        <Text style={styles.questionWord}>{q.foreignPhrase}</Text>
        <Text style={styles.langHint}>{LANG_LABELS[lang]}</Text>
      </Animated.View>

      {/* Options */}
      <View style={styles.options}>
        {q.options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            style={getOptionStyle(option)}
            onPress={() => handleSelect(option)}
            activeOpacity={0.8}
          >
            <View style={styles.optionInner}>
              <View style={[
                styles.optionBubble,
                selected && option === q.correctAnswer && styles.optionBubbleCorrect,
                selected && option === selected && option !== q.correctAnswer && styles.optionBubbleWrong,
              ]}>
                <Text style={[
                  styles.optionBubbleText,
                  selected && (option === q.correctAnswer || option === selected) && styles.optionBubbleTextLight,
                ]}>
                  {String.fromCharCode(65 + idx)}
                </Text>
              </View>
              <Text style={[
                styles.optionText,
                selected && option === q.correctAnswer && styles.optionTextCorrect,
                selected && option === selected && option !== q.correctAnswer && styles.optionTextWrong,
              ]}>
                {option}
              </Text>
              {selected && option === q.correctAnswer && <Text style={styles.checkmark}>✓</Text>}
              {selected === option && option !== q.correctAnswer && <Text style={styles.crossmark}>✗</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Feedback cards */}
      {isCorrect && (
        <View style={styles.correctCard}>
          <Text style={styles.correctCardTitle}>Correct!</Text>
          <Text style={styles.correctCardText}>{q.explanation}</Text>
        </View>
      )}

      {isWrong && (
        <View style={styles.wrongCard}>
          <Text style={styles.wrongCardTitle}>Not quite!</Text>
          <Text style={styles.wrongCardText}>The correct answer is:</Text>
          <Text style={styles.wrongCardAnswer}>{q.correctAnswer}</Text>
          <View style={styles.explanationBox}>
            <Text style={styles.explanationTitle}>Explanation:</Text>
            <Text style={styles.explanationText}>{q.explanation}</Text>
          </View>
          <Text style={styles.encouragement}>
            Do not worry! Mistakes help you learn. You can retake this quiz!
          </Text>
        </View>
      )}

      {/* Next button */}
      {selected && (
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {currentIndex + 1 >= QUIZ_SIZE ? 'See Results' : 'Next Question'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20,
  },
  closeBtn: {
    fontSize: 18,
    color: '#FF6FA1',
    fontWeight: 'bold',
    padding: 4,
  },
  headerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadgeSmall: {
    backgroundColor: '#FF3D7F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeSmallText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11,
  },
  badgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  badgeSmallIcon: {
    fontSize: 12,
  },
  badgeSmallCount: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  progressDots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFB6C1',
  },
  dotDone: {
    backgroundColor: '#FF6FA1',
  },
  dotCurrent: {
    backgroundColor: '#FF3D7F',
    width: 20,
  },
  counter: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF6FA1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  questionLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  questionWord: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#CC2060',
    textAlign: 'center',
    marginBottom: 8,
  },
  langHint: {
    fontSize: 12,
    color: '#FF6FA1',
    fontWeight: '600',
  },
  options: {
    gap: 12,
    marginBottom: 20,
  },
  option: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCorrect: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  optionWrong: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  optionDim: {
    opacity: 0.5,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionBubbleCorrect: {
    backgroundColor: '#4CAF50',
  },
  optionBubbleWrong: {
    backgroundColor: '#F44336',
  },
  optionBubbleText: {
    color: '#FF3D7F',
    fontWeight: 'bold',
    fontSize: 14,
  },
  optionBubbleTextLight: {
    color: 'white',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  optionTextCorrect: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  optionTextWrong: {
    color: '#C62828',
  },
  checkmark: {
    fontSize: 20,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  crossmark: {
    fontSize: 20,
    color: '#F44336',
    fontWeight: 'bold',
  },
  correctCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  correctCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 6,
  },
  correctCardText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  wrongCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  wrongCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 6,
  },
  wrongCardText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  wrongCardAnswer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  explanationBox: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  explanationTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  encouragement: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  nextBtn: {
    backgroundColor: '#FF3D7F',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
  },
  nextBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Results styles
  resultsContainer: {
    flex: 1,
    backgroundColor: '#FFE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultsCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    elevation: 5,
  },
  resultsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  resultsLevelBadge: {
    backgroundColor: '#FF3D7F',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resultsLevelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  resultsBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  resultsBadgeIcon: {
    fontSize: 16,
  },
  resultsBadgeCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  resultsEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3D7F',
    marginBottom: 8,
  },
  resultsScore: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#CC2060',
    marginBottom: 8,
  },
  resultsMsg: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retakeBtn: {
    backgroundColor: '#FF6FA1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  retakeBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  retakeHint: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  nextLessonBtn: {
    backgroundColor: '#FF3D7F',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextLessonBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  homeLink: {
    paddingVertical: 10,
  },
  homeLinkText: {
    color: '#FF6FA1',
    fontWeight: '600',
    fontSize: 14,
  },
  // Congrats popup styles
  congratsContainer: {
    flex: 1,
    backgroundColor: '#FFE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confetti: {
    position: 'absolute',
    fontSize: 28,
    zIndex: 10,
  },
  badgePopup: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 15,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    borderWidth: 6,
    borderColor: '#FFA000',
  },
  newBadgeIcon: {
    fontSize: 80,
  },
  congratsContent: {
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    elevation: 5,
  },
  praiseMessage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6FA1',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 26,
  },
  congratsCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    elevation: 5,
  },
  congratsEmoji: {
    fontSize: 60,
    marginBottom: 12,
  },
  congratsTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FF3D7F',
    marginBottom: 8,
    textAlign: 'center',
  },
  congratsSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  congratsLevel: {
    fontSize: 14,
    color: '#FF6FA1',
    fontWeight: '600',
    marginBottom: 20,
  },
  congratsProgress: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  badgeProgress: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 16,
    width: '100%',
  },
  badgeProgressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  badgeRowIcon: {
    fontSize: 28,
  },
  newBadgeHighlight: {
    fontSize: 36,
    textShadowColor: '#FFD700',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  currentBadge: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 16,
    width: '100%',
  },
  currentBadgeLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  currentBadgeIcon: {
    fontSize: 40,
  },
  currentBadgeCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  congratsBtn: {
    backgroundColor: '#FF3D7F',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    elevation: 3,
  },
  congratsBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
