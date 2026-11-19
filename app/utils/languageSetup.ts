import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserData,
  saveUserData,
  getLanguageProgress,
  getAllLanguageProgress,
  loadLanguageProgressToStorage,
  syncCurrentProgressToLanguage,
} from './userStorage';
import { getCommittedGoal, commitGoal, Goal } from './goal';

/** The 4 onboarding answers, remembered per language so we never ask twice. */
export type LanguageSetup = {
  language: string; // lower-case
  time: string;
  goal: Goal;
  notify: string;
};

const PROGRESS_KEYS = [
  'userLevel',
  'currentTier',
  'beginnerLevel',
  'beginnerLessonIndex',
  'beginnerBadgeCount',
  'beginnerLessonsCompleted',
  'xp',
  'beginnerSubLevel',
  'lessonsAtCurrentWordLevel',
];

const setupKey = async () =>
  `languageSetup:${((await AsyncStorage.getItem('userEmail')) || 'guest').toLowerCase()}`;

const readAll = async (): Promise<Record<string, LanguageSetup>> => {
  try {
    const raw = await AsyncStorage.getItem(await setupKey());
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
};

/** Remember the answers for a language (called once, after its 4 questions). */
export const saveLanguageSetup = async (setup: LanguageSetup): Promise<void> => {
  const all = await readAll();
  all[setup.language.toLowerCase()] = { ...setup, language: setup.language.toLowerCase() };
  await AsyncStorage.setItem(await setupKey(), JSON.stringify(all));
};

/**
 * Has this user already answered the questions for this language?
 * Also recognises users who started a language before this feature existed.
 */
export const getLanguageSetup = async (language: string): Promise<LanguageSetup | null> => {
  const lang = language.toLowerCase();
  const all = await readAll();
  if (all[lang]) return all[lang];

  // Older accounts: language already used (has progress) or was the saved one
  const user = await getUserData();
  const progress = await getLanguageProgress(lang);
  const hadProgress = !!progress && ((progress.beginnerLessonIndex || 0) > 0 || (progress.xp || 0) > 0);
  const wasCurrent = (user?.language || '').toLowerCase() === lang && !!user?.time;
  if (!hadProgress && !wasCurrent) return null;

  const goal = (await getCommittedGoal(lang)) ?? (user?.goal === 'Compete' ? 'Compete' : 'Streak');
  const setup: LanguageSetup = {
    language: lang,
    time: user?.time || '30 min',
    goal,
    notify: user?.notify || 'Yes',
  };
  await commitGoal(goal, lang);
  await saveLanguageSetup(setup);
  return setup;
};

/** Languages the user has already started (setup done), newest-known first. */
export const getStartedLanguages = async (): Promise<string[]> => {
  const all = await readAll();
  const set = new Set<string>(Object.keys(all));
  const progress = await getAllLanguageProgress();
  Object.keys(progress).forEach((k) => set.add(k));
  const user = await getUserData();
  const cur = (user?.language || '').toLowerCase();
  if (cur && user?.time) set.add(cur);
  return Array.from(set);
};

/** Where to send the user so the lesson for the active language starts right away. */
export const getLessonRoute = async (language: string): Promise<string> => {
  const lang = language.toLowerCase();
  if (lang === 'english') return '/QuizScreen?type=vocab';
  const level = await AsyncStorage.getItem('userLevel');
  if (!level) return '/KnowledgeCheckScreen'; // never picked a starting level
  return level === 'beginner' ? '/BeginnerLessonScreen' : '/AdaptiveLessonScreen';
};

/**
 * Make `language` the active one using its saved answers + saved progress.
 * Returns the route to open, or null if this language has not been set up yet
 * (then the 4 questions must be asked).
 */
export const activateLanguage = async (language: string): Promise<string | null> => {
  const lang = language.toLowerCase();
  const setup = await getLanguageSetup(lang);
  if (!setup) return null;

  const user = await getUserData();
  const previous = (user?.language || '').toLowerCase();
  // keep the language we are leaving up to date
  if (previous && previous !== lang) {
    try {
      await syncCurrentProgressToLanguage(previous);
    } catch {}
  }

  await saveUserData({ ...(user || {}), language: lang, time: setup.time, goal: setup.goal, notify: setup.notify });
  await AsyncStorage.setItem('onboardingComplete', 'true');

  if (previous !== lang) {
    const restored = await loadLanguageProgressToStorage(lang);
    if (!restored) await Promise.all(PROGRESS_KEYS.map((k) => AsyncStorage.removeItem(k)));
  }
  if (lang === 'english') {
    await AsyncStorage.setItem('userLevel', 'intermediate');
    await AsyncStorage.setItem('currentTier', 'basic');
  }
  return getLessonRoute(lang);
};