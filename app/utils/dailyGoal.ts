import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { getUserData } from './userStorage';
import { getCurrentAppTime, resetDailyCountersIfNeeded } from './socialMediaTracker';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const LAST_MET_AT_KEY = 'dailyGoalLastMetAt'; // ISO time the user last reached their daily goal
const MET_DATE_KEY = 'dailyGoalMetDate'; // day (toDateString) the goal was last reached
const NOTIF_IDS_KEY = 'dailyGoalNotifIds';
const CHANNEL_ID = 'daily-goal';
const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Read the commitment chosen in onboarding ("15 min", "30 min", "1 hr", "2 hr") ──
export const parseMinutes = (value?: string): number => {
  const m = /(\d+)\s*(min|hr)/i.exec(value || '');
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return m[2].toLowerCase() === 'hr' ? n * 60 : n;
};

export const getDailyGoalMinutes = async (): Promise<number> => {
  try {
    return parseMinutes((await getUserData())?.time);
  } catch {
    return 0;
  }
};

const remindersEnabled = async (): Promise<boolean> => {
  try {
    const user = await getUserData();
    return user?.notify !== 'No'; // "No thanks" in onboarding turns reminders off
  } catch {
    return true;
  }
};

const label = (minutes: number) =>
  minutes >= 60 ? `${minutes / 60} hour${minutes === 60 ? '' : 's'}` : `${minutes} minutes`;

// ─── Notifications ────────────────────────────────────────────────────────────
const cancelGoalReminders = async () => {
  try {
    const stored = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    }
  } catch {}
  await AsyncStorage.removeItem(NOTIF_IDS_KEY);
};

/**
 * Schedules the angry-bunny reminders. They fire 24h after the last time the
 * user reached their daily goal (then again 24h and 48h later). Reaching the
 * goal cancels and re-schedules them, so they only ever show when the goal
 * was NOT met.
 */
export const scheduleGoalReminders = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  try {
    await cancelGoalReminders();

    const minutes = await getDailyGoalMinutes();
    if (!minutes || !(await remindersEnabled())) return;

    const perm = await Notifications.getPermissionsAsync();
    if (perm.status !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        name: 'Daily Goal Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
        lightColor: '#EF4444',
        sound: 'default',
      }).catch(() => {}); // channel setup can fail on some phones / Expo Go
    }

    // Starting point = last time the goal was met (or now, the very first time)
    const now = Date.now();
    let base = parseInt(
      String(Date.parse((await AsyncStorage.getItem(LAST_MET_AT_KEY)) || '') || 0),
      10
    );
    if (!base) {
      base = now;
      await AsyncStorage.setItem(LAST_MET_AT_KEY, new Date(base).toISOString());
    }
    // If a reminder is already overdue, keep the same time of day going forward
    while (base + DAY_MS <= now) base += DAY_MS;

    const messages = [
      {
        title: '😠 You skipped your daily goal!',
        body: `You promised ${label(minutes)} a day, but you haven't spent that time in LinguaBloom in the last 24 hours. Come back and learn!`,
      },
      {
        title: '😡 Two days without your goal!',
        body: `${label(minutes)} a day, remember? Your bunny is getting really angry. Open LinguaBloom now!`,
      },
      {
        title: '🤬 Your bunny is FURIOUS!',
        body: `You've missed your ${label(minutes)} goal for days. Just one lesson will calm the bunny down!`,
      },
    ];

    const ids: string[] = [];
    for (let k = 1; k <= 3; k++) {
      const seconds = Math.max(5, Math.round((base + k * DAY_MS - now) / 1000));
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `🐰 ${messages[k - 1].title}`,
          body: messages[k - 1].body,
          sound: 'default',
          data: { type: 'daily_goal_missed', mood: 'angry', route: '/HomeScreen' },
          ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
          repeats: false,
        },
      });
      ids.push(id);
    }
    await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn('Could not schedule daily goal reminders:', e);
  }
};

// ─── Check today's time against the goal ──────────────────────────────────────
export const checkDailyGoal = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  try {
    const minutes = await getDailyGoalMinutes();
    if (!minutes) return false;

    await resetDailyCountersIfNeeded(); // start a fresh count on a new day
    const spentSeconds = await getCurrentAppTime();
    if (spentSeconds < minutes * 60) return false;

    const today = new Date().toDateString();
    if ((await AsyncStorage.getItem(MET_DATE_KEY)) !== today) {
      await AsyncStorage.setItem(MET_DATE_KEY, today);
      await AsyncStorage.setItem(LAST_MET_AT_KEY, new Date().toISOString());
      await scheduleGoalReminders(); // goal reached -> push the reminders 24h ahead
    }
    return true;
  } catch {
    return false;
  }
};

// ─── Keep checking while the app is in use ────────────────────────────────────
let started = false;
let timer: ReturnType<typeof setInterval> | null = null;

export const startDailyGoalTracking = async (): Promise<void> => {
  if (Platform.OS === 'web' || started) return;
  started = true;

  const startTimer = () => {
    if (timer) clearInterval(timer);
    timer = setInterval(checkDailyGoal, 20000);
  };

  await scheduleGoalReminders();
  await checkDailyGoal();
  startTimer();

  AppState.addEventListener('change', async (state: AppStateStatus) => {
    if (state === 'active') {
      await scheduleGoalReminders();
      await checkDailyGoal();
      startTimer();
    } else {
      if (timer) clearInterval(timer);
      timer = null;
      await checkDailyGoal();
    }
  });
};

/** For testing: shows the angry-bunny reminder in ~5 seconds. */
export const sendTestGoalReminder = async (): Promise<void> => {
  if (Platform.OS === 'web') return;
  const minutes = (await getDailyGoalMinutes()) || 15;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🐰 😠 You skipped your daily goal!',
      body: `You promised ${label(minutes)} a day, but you haven't spent that time in LinguaBloom in the last 24 hours. Come back and learn!`,
      sound: 'default',
      data: { type: 'daily_goal_missed', mood: 'angry', route: '/HomeScreen' },
      ...(Platform.OS === 'android' && { channelId: CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      repeats: false,
    },
  });
};
