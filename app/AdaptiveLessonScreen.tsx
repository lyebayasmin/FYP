/**
 * AdaptiveLessonScreen — Updated question logic
 * ─────────────────────────────────────────────────────────────────
 * BEGINNER + non-English language:
 *   Uses words.json — shows a word in the target language,
 *   user picks the correct English meaning from 4 options.
 *   Wrong answers show correct answer + explanation.
 *
 * BEGINNER + English  →  word-level fill-in-the-blank (unchanged)
 * INTERMEDIATE/ADVANCED → phrase completion (unchanged)
 */

import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, syncCurrentProgressToLanguage } from './utils/userStorage';
import phrases from '../data/phrases.json';
import wordsData from '../data/words.json';

// ─── Types ────────────────────────────────────────────────────────
type LangKey = 'english' | 'urdu' | 'spanish' | 'german';
type Tier = 'basic' | 'intermediate' | 'advanced';

interface PhraseEntry {
  id: number;
  [key: string]: any;
}

interface Question {
  prompt: string;
  promptLabel: string;
  options: string[];
  answer: string;
  explanation: string;
  fullPhrase: string;
  tier: Tier;
}

// ─── Constants ────────────────────────────────────────────────────
const XP_PER_CORRECT = 10;
const XP_LEVEL_UP = 50;
const ROUND_SIZE = 5;

const LANG_LABELS: Record<LangKey, string> = {
  english: 'English 🇬🇧',
  german: 'German 🇩🇪',
  spanish: 'Spanish 🇪🇸',
  urdu: 'Urdu 🇵🇰',
};

const TIER_LABELS: Record<Tier, string> = {
  basic: '🌱 Basics',
  intermediate: '⚡ Intermediate',
  advanced: '🔥 Advanced',
};

// ─── Word translation data ─────────────────────────────────────────
// Maps a foreign word → its English meaning.
// We derive this from the words array in words.json.
// words.json has English words mixed with Urdu, German, Spanish words.
// We treat English words as "meanings" and pair them with foreign words
// by section order. For a robust system, we store known translations here.

// Curated translation maps for each language
const URDU_TRANSLATIONS: Record<string, string> = {
  'علمبردار': 'standard bearer',
  'سفارتکار': 'diplomat',
  'رہائش': 'residence',
  'سڑک': 'road',
  'فصل': 'crop',
  'شوہر': 'husband',
  'شمالی': 'northern',
  'غلط': 'wrong',
  'مشرقی': 'eastern',
  'پاکستانی': 'Pakistani',
  'تیر': 'arrow',
  'آرائش': 'decoration',
  'چمک': 'shine',
  'دکھی': 'sad',
  'خودمختاری': 'autonomy',
  'شفاعت': 'intercession',
  'تالا': 'lock',
  'عوامی': 'public',
  'مکمل': 'complete',
  'علمی': 'academic',
  'بٹوا': 'wallet',
  'سیاستدان': 'politician',
  'سلطنت': 'empire',
  'بڑا': 'big',
  'زکام': 'cold',
  'پتلی': 'thin',
  'ظلم': 'oppression',
  'خوبی': 'virtue',
  'ثبات': 'stability',
  'شہزادہ': 'prince',
  'بہتر': 'better',
  'تیار': 'ready',
  'سزا': 'punishment',
  'جنوبی': 'southern',
};

const GERMAN_TRANSLATIONS: Record<string, string> = {
  'Schlichtung': 'arbitration',
  'Tischkleid': 'tablecloth',
  'Tischkultur': 'table culture',
  'Vizemeisterin': 'vice champion',
  'Vizemeister': 'vice champion',
  'Bergen': 'rescue',
  'Flamingo': 'flamingo',
  'Flamen': 'flame',
  'Flammbirke': 'flame birch',
  'Liebschaft': 'love affair',
  'Liebster': 'dearest',
  'Liebste': 'beloved',
  'Markt': 'market',
  'Markusdom': 'St. Mark cathedral',
  'Nageleisen': 'nail iron',
  'Pfleger': 'caregiver',
  'Pflegesatz': 'nursing rate',
  'Reflextod': 'reflex death',
  'Reflexverhalten': 'reflex behavior',
  'Nageldystrophie': 'nail dystrophy',
  'Bergepanzer': 'recovery tank',
  'Bergente': 'scaup duck',
  'Abendfrieden': 'evening peace',
  'Abendfahrt': 'evening trip',
  'Aachener': 'person from Aachen',
  'Aachenfahrt': 'Aachen journey',
  'Dross': 'scum',
  'Drost': 'bailiff',
  'Marktzuwachs': 'market growth',
  'Marktzyklus': 'market cycle',
  'Pflegeroboter': 'care robot',
  'Pflegeschwestern': 'nurses',
  'Reflexumdrehen': 'reflex inversion',
  'Reflexvisier': 'reflex sight',
  'Liebschaften': 'love affairs',
};

const SPANISH_TRANSLATIONS: Record<string, string> = {
  'sobre': 'about',
  'entre': 'between',
  'ser': 'to be',
  'fue': 'was',
  'sin': 'without',
  'todo': 'everything',
  'también': 'also',
  'desde': 'since',
  'cuando': 'when',
  'muy': 'very',
  'años': 'years',
  'está': 'is',
  'todos': 'everyone',
  'hay': 'there is',
  'han': 'have',
  'puede': 'can',
  'año': 'year',
  'cada': 'each',
  'uno': 'one',
  'vez': 'time',
  'bien': 'well',
  'hace': 'makes',
  'trabajo': 'work',
  'nacional': 'national',
  'estado': 'state',
  'otros': 'others',
  'gobierno': 'government',
  'eso': 'that',
  'tiempo': 'time',
  'vida': 'life',
  'esto': 'this',
  'forma': 'form',
  'personas': 'people',
  'otro': 'other',
  'ahora': 'now',
  'hoy': 'today',
  'era': 'was',
  'caso': 'case',
  'están': 'are',
  'mejor': 'better',
  'lugar': 'place',
  'casa': 'house',
  'educación': 'education',
  'servicio': 'service',
  'seguridad': 'security',
  'proceso': 'process',
  'horas': 'hours',
  'política': 'politics',
  'artículo': 'article',
  'universidad': 'university',
  'historia': 'history',
  'cosas': 'things',
  'cualquier': 'any',
};

const LANG_WORD_MAP: Record<string, Record<string, string>> = {
  urdu: URDU_TRANSLATIONS,
  german: GERMAN_TRANSLATIONS,
  spanish: SPANISH_TRANSLATIONS,
};

// ─── Helpers ──────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function getPool(lang: LangKey): PhraseEntry[] {
  return (phrases as PhraseEntry[]).filter(
    (p) => p[lang] && typeof p[lang] === 'string' && (p[lang] as string).trim() !== ''
  );
}

function tierSlice(pool: PhraseEntry[], lang: LangKey, tier: Tier): PhraseEntry[] {
  const sorted = [...pool].sort(
    (a, b) => (a[lang] as string).length - (b[lang] as string).length
  );
  const n = sorted.length;
  if (tier === 'basic') return sorted.slice(0, Math.ceil(n * 0.35));
  if (tier === 'intermediate') return sorted.slice(Math.ceil(n * 0.25), Math.ceil(n * 0.7));
  return sorted.slice(Math.ceil(n * 0.55));
}

function pickKeyWord(phrase: string): { blanked: string; word: string } | null {
  const rawWords = phrase.trim().split(/\s+/);
  if (rawWords.length < 2) return null;
  const half = Math.floor(rawWords.length / 2);
  const candidates = rawWords
    .slice(half)
    .filter((w) => w.replace(/[^a-zA-ZÀ-žا-ی]/g, '').length > 2);
  const chosen =
    candidates.length > 0
      ? candidates[Math.floor(Math.random() * candidates.length)]
      : rawWords[rawWords.length - 1];
  const blanked = rawWords.map((w) => (w === chosen ? '___' : w)).join(' ');
  const word = chosen.replace(/[.,!?;:]+$/, '');
  return { blanked, word };
}

// ─── Word-translation question builder (Beginner, non-English) ─────
// subLevel 0 → single word, answer = English meaning
// subLevel 1 → 2 words side by side, answer = "meaning1 + meaning2"
// subLevel 2 → 3 words, same pattern
function buildWordTranslationQuestions(lang: LangKey, count: number, subLevel: number = 0): Question[] {
  const translationMap = LANG_WORD_MAP[lang];
  if (!translationMap) return [];

  const entries = Object.entries(translationMap); // [foreignWord, englishMeaning]
  if (entries.length < 4) return [];

  const langLabel = lang.charAt(0).toUpperCase() + lang.slice(1);
  // How many words to show per question: level 0=1, level 1=2, level 2=3
  const wordCount = subLevel + 1;

  const shuffledEntries = shuffle(entries);
  const questions: Question[] = [];

  for (let i = 0; i <= shuffledEntries.length - wordCount && questions.length < count; i++) {
    // Pick `wordCount` consecutive words from the shuffled list
    const combo = shuffledEntries.slice(i, i + wordCount);
    const foreignPhrase = combo.map(([w]) => w).join(' ');
    const correctEnglish = combo.map(([, m]) => m).join(', ');

    // Distractors: other combos of the same word count, answer is always English
    const distractors: string[] = [];
    for (let j = 0; j < shuffledEntries.length - wordCount + 1 && distractors.length < 6; j++) {
      if (j >= i - wordCount && j <= i + wordCount) continue; // skip overlapping
      const distCombo = shuffledEntries.slice(j, j + wordCount);
      const distEnglish = distCombo.map(([, m]) => m).join(', ');
      if (distEnglish !== correctEnglish && !distractors.includes(distEnglish)) {
        distractors.push(distEnglish);
      }
    }
    if (distractors.length < 3) continue;

    const label = wordCount === 1
      ? `What does this ${langLabel} word mean in English?`
      : `What do these ${wordCount} ${langLabel} words mean in English?`;

    const explanation = wordCount === 1
      ? `"${foreignPhrase}" means "${correctEnglish}" in English.`
      : `"${foreignPhrase}" → "${correctEnglish}". Each word: ${combo.map(([w, m]) => `${w} = ${m}`).join(', ')}.`;

    questions.push({
      prompt: foreignPhrase,
      promptLabel: label,
      options: shuffle([correctEnglish, ...shuffle(distractors).slice(0, 3)]),
      answer: correctEnglish,
      explanation,
      fullPhrase: `${foreignPhrase} = ${correctEnglish}`,
      tier: 'basic',
    });
  }

  return questions;
}


// ─── Phrase question builders (unchanged) ─────────────────────────
function buildBeginnerQuestion(
  item: PhraseEntry,
  pool: PhraseEntry[],
  lang: LangKey
): Question | null {
  const phrase = (item[lang] as string).trim();
  const kw = pickKeyWord(phrase);
  if (!kw) return null;
  const { blanked, word } = kw;
  const distWords = shuffle(
    pool
      .filter((p) => p.id !== item.id)
      .map((p) => {
        const pw = pickKeyWord((p[lang] as string).trim());
        return pw ? pw.word : null;
      })
      .filter(Boolean) as string[]
  )
    .filter((w) => w.toLowerCase() !== word.toLowerCase())
    .slice(0, 3);
  if (distWords.length < 3) return null;
  return {
    prompt: blanked,
    promptLabel: 'Fill in the blank:',
    options: shuffle([word, ...distWords]),
    answer: word,
    explanation: `The missing word is "${word}".`,
    fullPhrase: phrase,
    tier: 'basic',
  };
}

// ─── Intermediate/Advanced: show merged words in target lang → pick English meaning ──
// Intermediate: 2 words merged
// Advanced:     3 words merged
function buildIntermediateTranslationQuestions(lang: LangKey, count: number, tier: Tier): Question[] {
  const translationMap = LANG_WORD_MAP[lang];
  if (!translationMap) return [];

  const entries = Object.entries(translationMap);
  if (entries.length < 4) return [];

  const langLabel = lang.charAt(0).toUpperCase() + lang.slice(1);

  // 2 words for intermediate, 3 words for advanced
  const wordCount = tier === 'advanced' ? 3 : 2;

  const shuffledEntries = shuffle(entries);
  const questions: Question[] = [];

  for (let i = 0; i <= shuffledEntries.length - wordCount && questions.length < count; i++) {
    if (i + wordCount > shuffledEntries.length) break;

    const combo = shuffledEntries.slice(i, i + wordCount);
    const foreignPhrase = combo.map(([w]) => w).join(' ');
    const correctEnglish = combo.map(([, m]) => m).join(', ');

    // Distractors: other non-overlapping groups of the same word count
    const distractors: string[] = [];
    for (let j = 0; j < shuffledEntries.length - wordCount + 1 && distractors.length < 6; j++) {
      if (j >= i - wordCount && j <= i + wordCount) continue;
      const distCombo = shuffledEntries.slice(j, j + wordCount);
      const distEnglish = distCombo.map(([, m]) => m).join(', ');
      if (distEnglish !== correctEnglish && !distractors.includes(distEnglish)) {
        distractors.push(distEnglish);
      }
    }
    if (distractors.length < 3) continue;

    const promptLabel = wordCount === 2
      ? `What do these 2 ${langLabel} words mean in English?`
      : `What do these 3 ${langLabel} words mean in English?`;

    questions.push({
      prompt: foreignPhrase,
      promptLabel,
      options: shuffle([correctEnglish, ...shuffle(distractors).slice(0, 3)]),
      answer: correctEnglish,
      explanation: `"${foreignPhrase}" → "${correctEnglish}". Word by word: ${combo.map(([w, m]) => `${w} = ${m}`).join(', ')}.`,
      fullPhrase: `${foreignPhrase} = ${correctEnglish}`,
      tier,
    });
  }

  return questions;
}

// ─── Master builder ────────────────────────────────────────────────
function buildQuestions(lang: LangKey, tier: Tier, count: number, subLevel: number = 0): Question[] {
  // Non-English languages always use translation-based questions (never target-lang completion)
  if (lang !== 'english') {
    if (tier === 'basic') {
      const qs = buildWordTranslationQuestions(lang, count, subLevel);
      if (qs.length > 0) return qs;
    } else {
      // intermediate: 2 words merged, advanced: 3 words merged
      const qs = buildIntermediateTranslationQuestions(lang, count, tier);
      if (qs.length > 0) return qs;
    }
  }

  // English only → phrase fill-in-the-blank (unchanged)
  const pool = getPool(lang);
  if (pool.length < 4) return [];
  const slice = tierSlice(pool, lang, tier);
  const picked = shuffle(slice).slice(0, count * 3);
  const questions: Question[] = [];
  for (const item of picked) {
    if (questions.length >= count) break;
    const q = buildBeginnerQuestion(item, pool, lang);
    if (q) questions.push(q);
  }
  return questions;
}

// ─── Component ────────────────────────────────────────────────────
export default function AdaptiveLessonScreen() {
  const router = useRouter();

  const [lang, setLang] = useState<LangKey>('english');
  const [tier, setTier] = useState<Tier>('basic');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [beginnerSubLevel, setBeginnerSubLevel] = useState(0);

  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(0)).current;
  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const levelUpScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => { init(); }, []);

  const init = async () => {
    const user = await getUserData();
    const userLang = ((user?.language || 'english').toLowerCase()) as LangKey;
    const safeLang: LangKey = ['english', 'german', 'spanish', 'urdu'].includes(userLang)
      ? userLang : 'english';

    const savedLevel = await AsyncStorage.getItem('userLevel');
    const savedXp = await AsyncStorage.getItem('xp');
    const savedTier = await AsyncStorage.getItem('currentTier') as Tier | null;

    const startXp = savedXp ? parseInt(savedXp) : 0;
    let startTier: Tier = 'basic';
    if (savedTier) {
      startTier = savedTier;
    } else if (savedLevel === 'intermediate') {
      startTier = 'intermediate';
    }

    const savedSub = await AsyncStorage.getItem('beginnerSubLevel');
    const startSub = savedSub ? parseInt(savedSub) : 0;

    setLang(safeLang);
    setTier(startTier);
    setXp(startXp);
    setBeginnerSubLevel(startSub);

    const pct = Math.min((startXp % XP_LEVEL_UP) / XP_LEVEL_UP, 1);
    xpBarAnim.setValue(pct);

    loadQuestions(safeLang, startTier, startSub);
  };

  const loadQuestions = (l: LangKey, t: Tier, subLvl?: number) => {
    const sub = subLvl ?? beginnerSubLevel;
    const qs = buildQuestions(l, t, ROUND_SIZE + 2, sub);
    setQuestions(qs);
    setQIndex(0);
    setSelected(null);
    setRoundCorrect(0);
    setLoading(false);
    animateCardIn();
  };

  const animateCardIn = () => {
    cardSlide.setValue(50);
    Animated.timing(cardSlide, { toValue: 0, duration: 320, useNativeDriver: true }).start();
  };

  const animateXpBar = (newPct: number) => {
    Animated.timing(xpBarAnim, { toValue: newPct, duration: 500, useNativeDriver: false }).start();
  };

  const animateLevelUp = () => {
    levelUpScale.setValue(0.5);
    Animated.spring(levelUpScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const handleSelect = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    const correct = option === questions[qIndex].answer;

    if (correct) {
      const newXp = xp + XP_PER_CORRECT;
      const newStreak = streak + 1;
      const newRoundCorrect = roundCorrect + 1;
      setXp(newXp);
      setStreak(newStreak);
      setRoundCorrect(newRoundCorrect);
      AsyncStorage.setItem('xp', String(newXp));

      const barPct = Math.min((newXp % XP_LEVEL_UP) / XP_LEVEL_UP, 1);
      animateXpBar(barPct);

      const prevLevel = Math.floor(xp / XP_LEVEL_UP);
      const newLevel = Math.floor(newXp / XP_LEVEL_UP);
      if (newLevel > prevLevel) {
        const nextTier: Tier =
          tier === 'basic' ? 'intermediate' : tier === 'intermediate' ? 'advanced' : 'advanced';
        if (nextTier !== tier) {
          setShowLevelUp(true);
          setTier(nextTier);
          AsyncStorage.setItem('currentTier', nextTier);
          animateLevelUp();
        }
      }
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    const nextIndex = qIndex + 1;
    if (nextIndex >= ROUND_SIZE || nextIndex >= questions.length) {
      setShowSummary(true);
      AsyncStorage.setItem('lastLessonDate', new Date().toDateString());
      return;
    }
    setSelected(null);
    setQIndex(nextIndex);
    animateCardIn();
  };

  const handleRetake = () => {
    // Replay the exact same questions but in a new shuffled order,
    // with each question's options reshuffled too.
    setShowSummary(false);
    setShowLevelUp(false);
    const reshuffled = shuffle([...questions]).map((q) => ({
      ...q,
      options: shuffle([...q.options]),
    }));
    setQuestions(reshuffled);
    setQIndex(0);
    setSelected(null);
    setRoundCorrect(0);
    animateCardIn();
  };

  const handleNextRound = async () => {
    setShowSummary(false);
    setShowLevelUp(false);
    // For beginner non-English, advance the sub-level so questions
    // gradually grow from single words → 2-word → 3-word phrases.
    let nextSub = beginnerSubLevel;
    if (tier === 'basic' && lang !== 'english') {
      // Advance sub-level: single word → 2 words → 3 words
      nextSub = Math.min(beginnerSubLevel + 1, 2);
      setBeginnerSubLevel(nextSub);
      await AsyncStorage.setItem('beginnerSubLevel', String(nextSub));
    }
    
    // Save progress to language-specific storage
    await syncCurrentProgressToLanguage(lang);
    
    loadQuestions(lang, tier, nextSub);
  };

  const bgColor = feedbackAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['#FFF0F3', '#FFE4EC', '#F0FFF6'],
  });

  const getOptionStyle = (option: string) => {
    if (!selected) return styles.option;
    if (option === questions[qIndex]?.answer) return [styles.option, styles.optionCorrect];
    if (option === selected) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDim];
  };

  const xpBarWidth = xpBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const xpInLevel = xp % XP_LEVEL_UP;
  const levelNum = Math.floor(xp / XP_LEVEL_UP) + 1;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>Building your lesson... ✨</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.loadingText}>No questions available 😅</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/WelcomeScreen')}>
          <Text style={styles.backBtnText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Level-up overlay ────────────────────────────────────────────
  if (showLevelUp) {
    const TIER_DESCS: Record<Tier, string> = {
      basic: 'You know the basics!',
      intermediate: 'Time for real sentences and phrases.',
      advanced: 'Challenge yourself with advanced content!',
    };
    return (
      <View style={styles.levelUpContainer}>
        <Animated.View style={[styles.levelUpCard, { transform: [{ scale: levelUpScale }] }]}>
          <Text style={styles.levelUpEmoji}>🏆</Text>
          <Text style={styles.levelUpTitle}>Level Up!</Text>
          <Text style={styles.levelUpSub}>You've unlocked a new tier</Text>
          <View style={styles.tierBadgeLarge}>
            <Text style={styles.tierBadgeLargeText}>{TIER_LABELS[tier]}</Text>
          </View>
          <Text style={styles.levelUpDesc}>{TIER_DESCS[tier]}</Text>
          <TouchableOpacity style={styles.levelUpBtn} onPress={() => { setShowLevelUp(false); loadQuestions(lang, tier); }}>
            <Text style={styles.levelUpBtnText}>Keep Going! 🚀</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  // ── Summary ─────────────────────────────────────────────────────
  if (showSummary) {
    const pct = roundCorrect / ROUND_SIZE;
    const emoji = pct === 1 ? '🏆' : pct >= 0.8 ? '🌟' : pct >= 0.6 ? '💪' : pct >= 0.4 ? '📚' : '🌱';
    const msg =
      pct === 1 ? "Perfect Score! You're amazing!" :
      pct >= 0.8 ? 'Excellent! Nearly perfect!' :
      pct >= 0.6 ? 'Good job! Keep practising!' :
      pct >= 0.4 ? 'Not bad! Review and try again!' :
      'Keep going — every attempt helps you grow!';

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryEmoji}>{emoji}</Text>
          <Text style={styles.summaryTitle}>Round Complete!</Text>
          <Text style={styles.summaryScore}>{roundCorrect} / {ROUND_SIZE}</Text>
          <Text style={styles.summaryMsg}>{msg}</Text>

          <View style={styles.xpGainedBox}>
            <Text style={styles.xpGainedText}>+{roundCorrect * XP_PER_CORRECT} XP earned</Text>
          </View>

          <View style={styles.tierRow}>
            <Text style={styles.tierRowLabel}>Current tier:</Text>
            <View style={styles.tierBadge}>
              <Text style={styles.tierBadgeText}>{TIER_LABELS[tier]}</Text>
            </View>
          </View>

          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${Math.min((xpInLevel / XP_LEVEL_UP) * 100, 100)}%` }]} />
          </View>
          <Text style={styles.xpBarLabel}>{xpInLevel} / {XP_LEVEL_UP} XP to next level (Lv.{levelNum})</Text>

          {/* Sub-level progress hint for beginners */}
          {tier === 'basic' && lang !== 'english' && (
            <View style={styles.subLevelHintBox}>
              <Text style={styles.subLevelHintText}>
                {beginnerSubLevel === 0
                  ? '🔄 Retake: same words · Next Round: 2-word combos ➜'
                  : beginnerSubLevel === 1
                  ? '🔄 Retake: same combos · Next Round: 3-word groups ➜'
                  : '🔄 Retake: same groups · Next Round: keep practising!'}
              </Text>
            </View>
          )}

          {/* Retake button */}
          <TouchableOpacity style={[styles.nextRoundBtn, { backgroundColor: '#FF6FA1', marginBottom: 10 }]} onPress={handleRetake}>
            <Text style={styles.nextRoundBtnText}>🔄 Retake Same Quiz</Text>
          </TouchableOpacity>

          {/* Next round button */}
          <TouchableOpacity style={styles.nextRoundBtn} onPress={handleNextRound}>
            <Text style={styles.nextRoundBtnText}>
              {tier === 'basic' && lang !== 'english' && beginnerSubLevel < 2
                ? `Next Step: ${beginnerSubLevel === 0 ? '2-Word Combos' : '3-Word Groups'} →`
                : 'Next Round →'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeLink} onPress={() => router.replace('/WelcomeScreen')}>
            <Text style={styles.homeLinkText}>Back to Home 🏠</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Active question ─────────────────────────────────────────────
  const q = questions[qIndex];
  const isWrong = selected !== null && selected !== q.answer;
  const isCorrect = selected !== null && selected === q.answer;
  const isWordQuiz = lang !== 'english'; // all non-English always show word/phrase → pick English meaning

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.replace('/WelcomeScreen')}>
            <Text style={styles.topBarBack}>✕</Text>
          </TouchableOpacity>
          <View style={styles.dotsRow}>
            {Array.from({ length: Math.min(ROUND_SIZE, questions.length) }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < qIndex && styles.dotDone,
                  i === qIndex && styles.dotCurrent,
                ]}
              />
            ))}
          </View>
          <View style={styles.streakBox}>
            <Text style={styles.streakText}>🔥 {streak}</Text>
          </View>
        </View>

        {/* XP bar */}
        <View style={styles.xpBarBgTop}>
          <Animated.View style={[styles.xpBarFillTop, { width: xpBarWidth }]} />
        </View>
        <View style={styles.xpMetaRow}>
          <Text style={styles.xpMetaText}>
            {LANG_LABELS[lang]} · {TIER_LABELS[tier]}
            {tier === 'basic' && lang !== 'english'
              ? ` · Step ${beginnerSubLevel + 1}/3`
              : ''}
          </Text>
          <Text style={styles.xpMetaText}>Lv.{levelNum} · {xpInLevel}/{XP_LEVEL_UP} XP</Text>
        </View>

        {/* Question card */}
        <Animated.View style={[styles.questionCard, { transform: [{ translateY: cardSlide }] }]}>
          <Text style={styles.questionLabel}>{q.promptLabel}</Text>
          <Text style={[
            styles.questionPrompt,
            isWordQuiz && styles.questionPromptLarge,
          ]}>
            {q.prompt}
          </Text>
          {isWordQuiz && (
            <Text style={styles.questionHint}>
              Pick the correct English meaning 👇
            </Text>
          )}
        </Animated.View>

        {/* Options */}
        <View style={styles.options}>
          {q.options.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={getOptionStyle(opt)}
              onPress={() => handleSelect(opt)}
              activeOpacity={0.8}
            >
              <View style={styles.optionInner}>
                <View style={[
                  styles.optionBubble,
                  selected && opt === q.answer && styles.optionBubbleCorrect,
                  selected && opt === selected && opt !== q.answer && styles.optionBubbleWrong,
                ]}>
                  <Text style={[
                    styles.optionBubbleText,
                    selected && (opt === q.answer || (opt === selected && opt !== q.answer)) && styles.optionBubbleTextLight,
                  ]}>
                    {String.fromCharCode(65 + idx)}
                  </Text>
                </View>
                <Text style={[
                  styles.optionText,
                  selected && opt === q.answer && styles.optionTextCorrect,
                  selected && opt === selected && opt !== q.answer && styles.optionTextWrong,
                ]}>
                  {opt}
                </Text>
                {selected && opt === q.answer && <Text style={styles.checkmark}>✓</Text>}
                {selected === opt && opt !== q.answer && <Text style={styles.crossmark}>✗</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Wrong answer feedback */}
        {isWrong && (
          <View style={styles.mistakeCard}>
            <View style={styles.mistakeHeader}>
              <Text style={styles.mistakeHeaderText}>❌ Not quite!</Text>
            </View>
            <Text style={styles.mistakeBody}>{q.explanation}</Text>
            <View style={styles.correctAnswerBox}>
              <Text style={styles.correctAnswerLabel}>
                {isWordQuiz ? 'Phrase & Meaning:' : 'Full phrase:'}
              </Text>
              <Text style={styles.correctAnswerValue}>{q.fullPhrase}</Text>
            </View>
            <Text style={styles.mistakeTip}>
              💡 Don't worry — mistakes are how we learn. You'll see similar questions again!
            </Text>
          </View>
        )}

        {/* Correct feedback */}
        {isCorrect && (
          <View style={styles.correctCard}>
            <Text style={styles.correctCardText}>
              {streak >= 3 ? `🔥 ${streak} in a row! Amazing!` : '✅ Correct! Well done!'}
            </Text>
            {isWordQuiz && (
              <Text style={styles.correctCardSub}>
                {q.fullPhrase}
              </Text>
            )}
            {streak >= 3 && !isWordQuiz && <Text style={styles.correctCardSub}>Keep the streak going!</Text>}
          </View>
        )}

        {/* Next button */}
        {selected && (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {qIndex + 1 >= ROUND_SIZE || qIndex + 1 >= questions.length
                ? 'See Results 🎉' : 'Next →'}
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: '#FFE4EC', justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { fontSize: 16, color: '#FF6FA1', fontWeight: 'bold' },
  backBtn: { marginTop: 20, backgroundColor: '#FF6FA1', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  backBtnText: { color: 'white', fontWeight: 'bold' },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 10 },
  topBarBack: { fontSize: 18, color: '#FF6FA1', fontWeight: 'bold', padding: 4 },
  dotsRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFB6C1' },
  dotDone: { backgroundColor: '#FF6FA1' },
  dotCurrent: { backgroundColor: '#FF3D7F', width: 22, borderRadius: 4 },
  streakBox: { backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, elevation: 1 },
  streakText: { fontWeight: 'bold', fontSize: 13, color: '#FF3D7F' },

  xpBarBgTop: { height: 6, backgroundColor: '#FFB6C1', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  xpBarFillTop: { height: '100%', backgroundColor: '#FF3D7F', borderRadius: 3 },
  xpMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  xpMetaText: { fontSize: 11, color: '#FF6FA1', fontWeight: '600' },

  questionCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 24, marginBottom: 20,
    elevation: 3, shadowColor: '#FF6FA1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10,
  },
  questionLabel: { fontSize: 12, color: '#FF6FA1', fontWeight: '700', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },
  questionPrompt: { fontSize: 20, fontWeight: '700', color: '#222', lineHeight: 30 },
  questionPromptLarge: { fontSize: 32, textAlign: 'center', marginVertical: 8, color: '#CC2060' },
  questionHint: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8 },

  options: { gap: 10, marginBottom: 16 },
  option: { backgroundColor: 'white', borderRadius: 14, borderWidth: 2, borderColor: 'transparent', elevation: 1 },
  optionCorrect: { backgroundColor: '#F0FFF6', borderColor: '#34C77B' },
  optionWrong: { backgroundColor: '#FFF0F3', borderColor: '#FF3D7F' },
  optionDim: { opacity: 0.4 },
  optionInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  optionBubble: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFE4EC', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionBubbleCorrect: { backgroundColor: '#34C77B' },
  optionBubbleWrong: { backgroundColor: '#FF3D7F' },
  optionBubbleText: { color: '#FF6FA1', fontWeight: 'bold', fontSize: 13 },
  optionBubbleTextLight: { color: 'white' },
  optionText: { flex: 1, fontSize: 15, color: '#333', lineHeight: 22, fontWeight: '500' },
  optionTextCorrect: { color: '#1A8C4E', fontWeight: '600' },
  optionTextWrong: { color: '#CC2060', fontWeight: '600' },
  checkmark: { color: '#34C77B', fontSize: 18, fontWeight: 'bold' },
  crossmark: { color: '#FF3D7F', fontSize: 18, fontWeight: 'bold' },

  mistakeCard: { backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#FF3D7F' },
  mistakeHeader: { backgroundColor: '#FFF0F3', paddingHorizontal: 16, paddingVertical: 10 },
  mistakeHeaderText: { fontSize: 15, fontWeight: '800', color: '#CC2060' },
  mistakeBody: { fontSize: 13, color: '#555', lineHeight: 20, paddingHorizontal: 16, paddingTop: 12 },
  correctAnswerBox: { backgroundColor: '#F0FFF6', marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 10 },
  correctAnswerLabel: { fontSize: 11, color: '#1A8C4E', fontWeight: '700', marginBottom: 2, textTransform: 'uppercase' },
  correctAnswerValue: { fontSize: 15, fontWeight: '700', color: '#1A8C4E' },
  mistakeTip: { fontSize: 12, color: '#888', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, lineHeight: 18, fontStyle: 'italic' },

  correctCard: { backgroundColor: '#F0FFF6', borderRadius: 14, padding: 14, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#34C77B' },
  correctCardText: { fontSize: 15, fontWeight: '800', color: '#1A8C4E' },
  correctCardSub: { fontSize: 12, color: '#3CAF74', marginTop: 4 },

  nextBtn: { backgroundColor: '#FF3D7F', padding: 18, borderRadius: 16, alignItems: 'center', elevation: 3, shadowColor: '#FF3D7F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  nextBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },

  summaryContainer: { flex: 1, backgroundColor: '#FFE4EC', justifyContent: 'center', alignItems: 'center', padding: 24 },
  summaryCard: { backgroundColor: 'white', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%', elevation: 5, shadowColor: '#FF6FA1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12 },
  summaryEmoji: { fontSize: 52, marginBottom: 12 },
  summaryTitle: { fontSize: 22, fontWeight: '800', color: '#FF3D7F', marginBottom: 6 },
  summaryScore: { fontSize: 40, fontWeight: '800', color: '#FF6FA1', marginBottom: 4 },
  summaryMsg: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  xpGainedBox: { backgroundColor: '#FFF0F3', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginBottom: 16 },
  xpGainedText: { color: '#FF3D7F', fontWeight: '800', fontSize: 15 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  tierRowLabel: { fontSize: 13, color: '#888' },
  tierBadge: { backgroundColor: '#FFE4EC', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  tierBadgeText: { color: '#FF6FA1', fontWeight: '700', fontSize: 13 },
  xpBarBg: { width: '100%', height: 8, backgroundColor: '#FFB6C1', borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  xpBarFill: { height: '100%', backgroundColor: '#FF3D7F', borderRadius: 4 },
  xpBarLabel: { fontSize: 12, color: '#AAA', marginBottom: 24 },
  nextRoundBtn: { backgroundColor: '#FF3D7F', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: '100%', alignItems: 'center', marginBottom: 12, elevation: 2 },
  nextRoundBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
  homeLink: { paddingVertical: 10 },
  homeLinkText: { color: '#FF6FA1', fontWeight: '700', fontSize: 14 },

  subLevelHintBox: {
    backgroundColor: '#FFF0F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    width: '100%',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6FA1',
  },
  subLevelHintText: {
    fontSize: 12,
    color: '#CC2060',
    lineHeight: 18,
    fontWeight: '600',
  },
  levelUpContainer: { flex: 1, backgroundColor: 'rgba(255,61,127,0.92)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  levelUpCard: { backgroundColor: 'white', borderRadius: 28, padding: 36, alignItems: 'center', width: '100%', elevation: 10 },
  levelUpEmoji: { fontSize: 64, marginBottom: 12 },
  levelUpTitle: { fontSize: 28, fontWeight: '800', color: '#FF3D7F', marginBottom: 6 },
  levelUpSub: { fontSize: 14, color: '#888', marginBottom: 16 },
  tierBadgeLarge: { backgroundColor: '#FF6FA1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, marginBottom: 16 },
  tierBadgeLargeText: { color: 'white', fontWeight: '800', fontSize: 18 },
  levelUpDesc: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  levelUpBtn: { backgroundColor: '#FF3D7F', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, width: '100%', alignItems: 'center' },
  levelUpBtnText: { color: 'white', fontWeight: '800', fontSize: 16 },
});
