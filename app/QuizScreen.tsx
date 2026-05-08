import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getUserData } from './utils/userStorage';
import phrases from '../data/phrases.json';
import grammarLessons from '../data/GrammarLessons.json';

type LangKey = 'english' | 'urdu' | 'spanish' | 'german';

interface Question {
  question: string;
  options: string[];
  answer: string;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/**
 * New dataset: each entry has exactly one language field.
 * We filter by that field's presence and non-empty string.
 */
function getLangEntries(lang: LangKey): any[] {
  return (phrases as any[]).filter(
    (p) =>
      p[lang] &&
      typeof p[lang] === 'string' &&
      (p[lang] as string).trim() !== ''
  );
}

/**
 * Build vocab quiz questions for a given language.
 * Question: "Which of these is phrase #N?" (shows a truncated version / beginning)
 * Better approach: show the FIRST HALF of a phrase, ask which option completes it.
 *
 * Simpler & reliable approach used here:
 * - Pick a phrase as the "correct" answer.
 * - Show "Choose the phrase that best fits this pattern: [first few words…]"
 * - Distractors are other random phrases from the same language.
 */
function buildVocabQuestions(lang: LangKey, count = 5): Question[] {
  const pool = getLangEntries(lang);
  if (pool.length < 4) return [];

  const picked = shuffle(pool).slice(0, count);

  return picked.map((item) => {
    const fullPhrase: string = item[lang];

    // Create a "prompt" by showing the first ~3 words with a blank
    const words = fullPhrase.trim().split(' ');
    const previewWords = words.slice(0, Math.min(3, Math.floor(words.length / 2)));
    const prompt =
      words.length <= 3
        ? `Complete or identify: "${fullPhrase.slice(0, Math.floor(fullPhrase.length / 2))}…"`
        : `Which phrase starts with: "${previewWords.join(' ')}…"`;

    const distractors = shuffle(
      pool
        .filter((p) => p.id !== item.id)
        .map((p) => p[lang] as string)
    ).slice(0, 3);

    return {
      question: prompt,
      options: shuffle([fullPhrase, ...distractors]),
      answer: fullPhrase,
    };
  });
}

/**
 * Build grammar quiz questions — unchanged logic, works with GrammarLessons.json.
 */
function buildGrammarQuestions(lang: LangKey, count = 5): Question[] {
  const pool = (grammarLessons as any[]).filter((g) => g.language === lang);
  if (pool.length < 2) return [];

  const picked = shuffle(pool).slice(0, count);

  return picked.map((item) => {
    const correctExample = item.example;
    const distractors = shuffle(
      pool.filter((g) => g.id !== item.id).map((g) => g.example)
    ).slice(0, 3);

    return {
      question: `Which example matches the rule:\n"${item.rule}"?`,
      options: shuffle([correctExample, ...distractors]),
      answer: correctExample,
    };
  });
}

export default function QuizScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    setupQuiz();
  }, []);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  };

  const setupQuiz = async () => {
    const user = await getUserData();
    const rawLang = (user?.language || 'english').toLowerCase();
    const lang: LangKey = ['english', 'german', 'spanish', 'urdu'].includes(rawLang)
      ? (rawLang as LangKey)
      : 'english';

    let qs: Question[] = [];
    if (type === 'grammar') {
      qs = buildGrammarQuestions(lang);
    } else {
      qs = buildVocabQuestions(lang);
    }

    setQuestions(qs);
    setLoading(false);
    setTimeout(animateIn, 100);
  };

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    if (option === questions[current].answer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setDone(true);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      setCurrent((c) => c + 1);
      setSelected(null);
      setTimeout(animateIn, 100);
    }
  };

  const getOptionStyle = (option: string) => {
    if (!selected) return styles.option;
    if (option === questions[current].answer) return [styles.option, styles.correct];
    if (option === selected) return [styles.option, styles.wrong];
    return [styles.option, styles.dimmed];
  };

  const getEmoji = () => {
    const pct = score / questions.length;
    if (pct === 1) return '🏆';
    if (pct >= 0.8) return '🌟';
    if (pct >= 0.6) return '💪';
    if (pct >= 0.4) return '📚';
    return '🌱';
  };

  const getMessage = () => {
    const pct = score / questions.length;
    if (pct === 1) return "Perfect Score! You're amazing!";
    if (pct >= 0.8) return 'Excellent work! Nearly flawless!';
    if (pct >= 0.6) return 'Good job! Keep practicing!';
    if (pct >= 0.4) return 'Not bad! Review and try again!';
    return 'Keep going — every attempt helps you grow!';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Preparing your quiz... ✨</Text>
      </View>
    );
  }

  if (!questions.length) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Not enough phrases for a quiz yet 😅</Text>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/LessonTypeScreen')}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (done) {
    return (
      <View style={styles.resultContainer}>
        <Animated.View style={[styles.resultCard, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.resultEmoji}>{getEmoji()}</Text>
          <Text style={styles.resultTitle}>Quiz Complete!</Text>
          <Text style={styles.resultScore}>
            {score} / {questions.length}
          </Text>
          <Text style={styles.resultMessage}>{getMessage()}</Text>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(score / questions.length) * 100}%` },
              ]}
            />
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace('/LessonTypeScreen')}
          >
            <Text style={styles.doneBtnText}>Back to Lessons 🌸</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  const q = questions[current];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>
          {type === 'grammar' ? '📐 Grammar Quiz' : '📝 Vocabulary Quiz'}
        </Text>
        <Text style={styles.counter}>
          {current + 1} / {questions.length}
        </Text>
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {questions.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < current && styles.dotDone,
              i === current && styles.dotCurrent,
            ]}
          />
        ))}
      </View>

      {/* Question card */}
      <Animated.View
        style={[
          styles.questionCard,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.questionText}>{q.question}</Text>
      </Animated.View>

      {/* Options */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        {q.options.map((option, idx) => (
          <TouchableOpacity
            key={idx}
            style={getOptionStyle(option)}
            onPress={() => handleSelect(option)}
            activeOpacity={0.8}
          >
            <View style={styles.optionInner}>
              <View style={styles.optionBubble}>
                <Text style={styles.optionBubbleText}>
                  {String.fromCharCode(65 + idx)}
                </Text>
              </View>
              <Text style={styles.optionText}>{option}</Text>
              {selected && option === questions[current].answer && (
                <Text style={styles.checkmark}>✓</Text>
              )}
              {selected === option && option !== questions[current].answer && (
                <Text style={styles.crossmark}>✗</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Next button */}
      {selected && (
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {current + 1 >= questions.length ? 'See Results 🎉' : 'Next Question →'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#FFE4EC',
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    backgroundColor: '#FFE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#FF6FA1',
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
  },
  headerLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3D7F',
  },
  counter: {
    fontSize: 14,
    color: 'gray',
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
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
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 22,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#FF6FA1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  questionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    lineHeight: 24,
  },
  option: {
    backgroundColor: 'white',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 1,
  },
  correct: {
    backgroundColor: '#E8F9F0',
    borderColor: '#34C77B',
  },
  wrong: {
    backgroundColor: '#FFF0F3',
    borderColor: '#FF3D7F',
  },
  dimmed: {
    opacity: 0.45,
  },
  optionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  optionBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE4EC',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionBubbleText: {
    color: '#FF6FA1',
    fontWeight: 'bold',
    fontSize: 13,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  checkmark: {
    color: '#34C77B',
    fontSize: 18,
    fontWeight: 'bold',
  },
  crossmark: {
    color: '#FF3D7F',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextBtn: {
    backgroundColor: '#FF6FA1',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  nextBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backBtn: {
    marginTop: 20,
    backgroundColor: '#FF6FA1',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  backBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Result screen
  resultContainer: {
    flex: 1,
    backgroundColor: '#FFE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    elevation: 5,
    shadowColor: '#FF6FA1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  resultEmoji: {
    fontSize: 56,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF3D7F',
    marginBottom: 8,
  },
  resultScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6FA1',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: '#FFB6C1',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FF3D7F',
    borderRadius: 5,
  },
  doneBtn: {
    backgroundColor: '#FF6FA1',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%',
  },
  doneBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
