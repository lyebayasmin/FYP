import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from './userStorage';

// 'Compete' = Leaderboards, 'Streak' = Daily Streaks
export type Goal = 'Compete' | 'Streak';

const clean = (v: any): Goal | null => (v === 'Compete' || v === 'Streak' ? v : null);

const emailKey = async () => ((await AsyncStorage.getItem('userEmail')) || 'guest').toLowerCase();

/** The language the user is currently learning (lower-case), or '' if none yet. */
const currentLanguage = async (): Promise<string> => {
  try {
    return ((await getUserData())?.language || '').toLowerCase();
  } catch {
    return '';
  }
};

// One goal PER LANGUAGE, e.g. committedGoal:me@x.com:english
const keyFor = async (language: string) => `committedGoal:${await emailKey()}:${language.toLowerCase()}`;

/**
 * The goal this user committed to for a language (defaults to the language they
 * are learning now). null = not chosen yet. Once chosen it is permanent for that
 * language, but other languages can still get their own choice.
 */
export const getCommittedGoal = async (language?: string): Promise<Goal | null> => {
  try {
    const lang = (language || (await currentLanguage())).toLowerCase();
    if (!lang) return null;

    const saved = clean(await AsyncStorage.getItem(await keyFor(lang)));
    if (saved) return saved;

    // Older installs only stored ONE goal for the whole account. Adopt it for the
    // language that was being learned back then (and only that language).
    const user = await getUserData();
    if ((user?.language || '').toLowerCase() === lang) {
      const legacy =
        clean(await AsyncStorage.getItem(`committedGoal:${await emailKey()}`)) || clean(user?.goal);
      if (legacy) {
        await AsyncStorage.setItem(await keyFor(lang), legacy);
        return legacy;
      }
    }
  } catch {}
  return null;
};

/** Save the goal for a language. Only call this the first time: it is permanent. */
export const commitGoal = async (goal: Goal, language?: string): Promise<void> => {
  const lang = (language || (await currentLanguage())).toLowerCase();
  if (!lang) return;
  await AsyncStorage.setItem(await keyFor(lang), goal);
};