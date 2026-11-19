import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getDailyGoalMinutes } from './dailyGoal';

// ─── Storage Keys ────────────────────────────────────────────────────────────
const LAST_OPENED_KEY = 'lastOpenedAt';
const STREAK_COUNT_KEY = 'streakDayCount';
const LAST_STREAK_DATE_KEY = 'lastStreakDate';
const NOTIF_IDS_KEY = 'scheduledNotifIds';

// ─── Notification Handler (how notifications appear while app is open) ────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Request Permissions ──────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('streak-reminders', {
      name: 'Streak Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#A855F7',
      sound: 'default',
    }).catch(() => {}); // channel setup can fail on some phones / Expo Go
  }

  return finalStatus === 'granted';
}

// ─── Cancel all previously scheduled streak notifications ─────────────────────
export async function cancelAllStreakNotifications(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(NOTIF_IDS_KEY);
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    }
    await AsyncStorage.removeItem(NOTIF_IDS_KEY);
  } catch (e) {
    console.warn('Could not cancel streak notifications:', e);
  }
}

// ─── Schedule the 3-tier streak reminders ─────────────────────────────────────
export async function scheduleStreakReminders(): Promise<void> {
  if (Platform.OS === 'web') return;

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Cancel any old scheduled notifications first
  await cancelAllStreakNotifications();

  const scheduledIds: string[] = [];

  // ── NOTIFICATION 1: 24 hours — Friendly Reminder ─────────────────────────
  // Skipped when the user picked a daily time goal: the angry-bunny goal reminder covers day 1.
  if (!(await getDailyGoalMinutes())) {
    const id1 = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🐰 Your streak misses you!",
        body: "You haven't practiced today. Just 5 minutes keeps your flame alive! 🔥",
        sound: 'default',
        data: { type: 'streak_day1', mood: 'sad', route: '/HomeScreen' },
        ...(Platform.OS === 'android' && { channelId: 'streak-reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 60 * 60 * 24, // 24 hours
        repeats: false,
      },
    });
    scheduledIds.push(id1);
  }

  // ── NOTIFICATION 2: 42 hours — Urgent Warning ──────────────────────────────
  const id2 = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🐰 Your streak is in DANGER! 😱",
      body: "Only 6 hours left before your streak breaks! Open LinguaBloom NOW and save it! 🏃‍♂️",
      sound: 'default',
      data: { type: 'streak_day2_warning', mood: 'angry', route: '/HomeScreen' },
      ...(Platform.OS === 'android' && { channelId: 'streak-reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 42, // 42 hours
      repeats: false,
    },
  });
  scheduledIds.push(id2);

  // ── NOTIFICATION 3: 48 hours — Streak Broken ──────────────────────────────
  const id3 = await Notifications.scheduleNotificationAsync({
    content: {
      title: "🐰 Oh no... your streak broke 😢",
      body: "Your learning streak has ended. But don't give up — start a new one today! You've got this 💪",
      sound: 'default',
      data: { type: 'streak_broken', mood: 'sad', route: '/HomeScreen' },
      ...(Platform.OS === 'android' && { channelId: 'streak-reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 48, // 48 hours
      repeats: false,
    },
  });
  scheduledIds.push(id3);

  // Save all IDs so we can cancel them on the next open
  await AsyncStorage.setItem(NOTIF_IDS_KEY, JSON.stringify(scheduledIds));
}

// ─── Record App Open + Update Streak Count ────────────────────────────────────
export async function recordAppOpen(): Promise<number> {
  const now = new Date();
  const todayStr = now.toDateString();

  const lastOpenedStr = await AsyncStorage.getItem(LAST_OPENED_KEY);
  const lastStreakDate = await AsyncStorage.getItem(LAST_STREAK_DATE_KEY);
  const storedCount = await AsyncStorage.getItem(STREAK_COUNT_KEY);

  let streakCount = storedCount ? parseInt(storedCount, 10) : 0;

  if (lastOpenedStr) {
    const lastOpened = new Date(lastOpenedStr);
    const lastDay = lastOpened.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const hoursDiff = (now.getTime() - lastOpened.getTime()) / (1000 * 60 * 60);

    if (lastStreakDate === todayStr) {
      // Already opened today — don't increment streak, just reschedule
    } else if (lastDay === yesterdayStr || hoursDiff <= 48) {
      // Opened within 48 hours — streak continues
      streakCount += 1;
    } else {
      // Missed more than 48 hours — reset streak
      streakCount = 1;
    }
  } else {
    // First ever open
    streakCount = 1;
  }

  await AsyncStorage.setItem(LAST_OPENED_KEY, now.toISOString());
  await AsyncStorage.setItem(STREAK_COUNT_KEY, String(streakCount));
  await AsyncStorage.setItem(LAST_STREAK_DATE_KEY, todayStr);

  return streakCount;
}

// ─── Get current streak count (for UI display) ───────────────────────────────
export async function getStreakCount(): Promise<number> {
  const stored = await AsyncStorage.getItem(STREAK_COUNT_KEY);
  return stored ? parseInt(stored, 10) : 0;
}