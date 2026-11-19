import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URLS } from './config';
import { getCommittedGoal } from './goal';
import {
  getUserData, saveUserData, syncCurrentProgressToLanguage, getAllLanguageProgress, getAllLanguageProgressFor,
} from './userStorage';
import { loadAccounts } from './auth';
import { getStreakCount } from './streakNotifications';

export type LeaderboardRow = { rank: number; name: string; value: number; isYou: boolean };
export type LeaderboardResponse = {
  metric: 'xp' | 'streak';
  language: string;
  total: number;
  rows: LeaderboardRow[];
  me: { rank: number; value: number } | null;
  offline?: boolean; // true = server not reachable, showing saved / on-device scores
};

// The server address that worked last time (tried first next time)
let workingBase: string | null = null;

// fetch against one address; gives up after a few seconds instead of hanging
const requestOne = async (base: string, path: string, options?: RequestInit, timeoutMs = 4000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

// Asks every possible server address at the same time; the first one that answers wins
const request = async (path: string, options?: RequestInit, timeoutMs = 3000) => {
  if (workingBase) {
    try {
      return await requestOne(workingBase, path, options, timeoutMs);
    } catch {
      workingBase = null; // it moved / went down: search again below
    }
  }
  return new Promise<any>((resolve, reject) => {
    let failed = 0;
    API_URLS.forEach((base) => {
      requestOne(base, path, options, timeoutMs).then(
        (data) => {
          workingBase = base;
          resolve(data);
        },
        () => {
          failed += 1;
          if (failed === API_URLS.length) reject(new Error('Leaderboard server not reachable'));
        },
      );
    });
  });
};

const post = (path: string, body: object) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/** Did the user choose "Leaderboards" for this language? (permanent per language) */
export const isCompeteMode = async (language?: string): Promise<boolean> => {
  return (await getCommittedGoal(language)) === 'Compete';
};

/** Send current XP + streak to the server. Silent: never shows errors, never blocks the app. */
export const syncLeaderboard = async (language: string): Promise<void> => {
  try {
    if (!(await isCompeteMode(language))) return;
    const email = await AsyncStorage.getItem('userEmail');
    if (!email) return;
    const name = (await AsyncStorage.getItem('userName')) || 'Learner';
    const xp = parseInt((await AsyncStorage.getItem('xp')) || '0', 10) || 0;
    const streak = await getStreakCount();
    await post('/sync', { email, name, language: language.toLowerCase(), xp, streak });
  } catch {
    // Server offline / no internet -> ignore. It will sync after the next quiz.
  }
};

/**
 * Push the XP of EVERY language the user competes in (each language has its own goal).
 * Returns true when the server answered.
 */
export const syncAllLeaderboards = async (): Promise<boolean> => {
  try {
    const email = await AsyncStorage.getItem('userEmail');
    if (!email) return false;
    const name = (await AsyncStorage.getItem('userName')) || 'Learner';
    const streak = await getStreakCount();
    const user = await getUserData();
    const current = (user?.language || '').toLowerCase();
    const progress = await getAllLanguageProgress();
    const langs = new Set<string>(Object.keys(progress));
    if (current) langs.add(current);

    let sent = false;
    for (const l of langs) {
      if (!(await isCompeteMode(l))) continue;
      const xp =
        l === current
          ? parseInt((await AsyncStorage.getItem('xp')) || '0', 10) || 0 // live value
          : progress[l]?.xp || 0;
      await post('/sync', { email, name, language: l, xp, streak }); // throws if server is down
      sent = true;
    }
    return true; // nothing to send is fine; the server was not needed
  } catch {
    return false;
  }
};

/**
 * Call when a quiz is finished. Adds XP locally (works offline, no server needed)
 * and then pushes the new total to the leaderboard in the background.
 * XP = 10 per correct answer + 20 bonus for a perfect quiz.
 */
export const recordQuizResult = async (language: string, correct: number, total: number): Promise<number> => {
  try {
    const gained = correct * 10 + (correct === total ? 20 : 0);
    const current = parseInt((await AsyncStorage.getItem('xp')) || '0', 10) || 0;
    await AsyncStorage.setItem('xp', String(current + gained));
    await syncCurrentProgressToLanguage(language.toLowerCase()); // keeps XP saved per language
    syncLeaderboard(language); // fire and forget
    return gained;
  } catch {
    return 0;
  }
};

/** Switch between 'Compete' (leaderboards) and 'Streak' (daily streaks). */
export const setLearningGoal = async (goal: 'Compete' | 'Streak', language: string): Promise<void> => {
  const user = (await getUserData()) || {};
  await saveUserData({ ...user, goal });
  try {
    if (goal === 'Compete') {
      await syncLeaderboard(language);
    } else {
      const email = await AsyncStorage.getItem('userEmail');
      if (email) await post('/optout', { email });
    }
  } catch {
    // ignore - the choice is already saved on the phone
  }
};

const cacheKey = (language: string) => `leaderboardCache:${language.toLowerCase()}`;

// Scores kept on this phone: every account that plays on this device, ranked by XP.
// Used only while the server cannot be reached.
export const getOfflineBoard = async (language: string): Promise<LeaderboardResponse> => {
  const lang = language.toLowerCase();
  const myEmail = ((await AsyncStorage.getItem('userEmail')) || '').toLowerCase();
  const user = await getUserData();
  const current = (user?.language || '').toLowerCase();
  const liveXp = parseInt((await AsyncStorage.getItem('xp')) || '0', 10) || 0;

  const rows: { name: string; value: number; isYou: boolean }[] = [];
  const accounts = await loadAccounts();
  for (const acc of Object.values(accounts)) {
    const email = acc.email.toLowerCase();
    const isMe = email === myEmail;
    const progress = isMe ? await getAllLanguageProgress() : await getAllLanguageProgressFor(email);
    const langs = lang === 'all' ? Object.keys(progress) : [lang];
    if (isMe && current && !langs.includes(current) && (lang === 'all' || lang === current)) langs.push(current);

    let total = 0;
    let counts = false;
    for (const l of langs) {
      const goal = await AsyncStorage.getItem(`committedGoal:${email}:${l}`);
      if (goal !== 'Compete') continue; // only players who chose the leaderboard for that language
      counts = true;
      total += isMe && l === current ? liveXp : progress[l]?.xp || 0;
    }
    if (counts) rows.push({ name: acc.name, value: total, isYou: isMe });
  }

  rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
  const ranked: LeaderboardRow[] = rows.map((r, i) => ({ rank: i + 1, ...r }));
  const mine = ranked.find((r) => r.isYou);
  return {
    metric: 'xp',
    language,
    total: ranked.length,
    rows: ranked,
    me: mine ? { rank: mine.rank, value: mine.value } : null,
    offline: true,
  };
};

/**
 * Always returns a leaderboard, it never throws:
 * server answers -> live board (saved for later)
 * server not reachable -> last saved board, or the scores kept on this phone
 */
export const fetchLeaderboard = async (
  metric: 'xp' | 'streak',
  language: string,
): Promise<LeaderboardResponse> => {
  const email = (await AsyncStorage.getItem('userEmail')) || '';
  const q = `metric=${metric}&language=${encodeURIComponent(language)}&me=${encodeURIComponent(email)}&limit=30`;
  try {
    const data: LeaderboardResponse = await request(`/leaderboard?${q}`);
    try {
      await AsyncStorage.setItem(cacheKey(language), JSON.stringify(data));
    } catch {}
    return { ...data, offline: false };
  } catch {
    try {
      const cached = await AsyncStorage.getItem(cacheKey(language));
      if (cached) return { ...(JSON.parse(cached) as LeaderboardResponse), offline: true };
    } catch {}
    return getOfflineBoard(language);
  }
};