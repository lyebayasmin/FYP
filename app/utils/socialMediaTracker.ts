import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, AppState, AppStateStatus } from 'react-native';

// ─── Storage Keys ──────────────────────────────────────────────────────────────
const APP_SESSION_START_KEY = 'appSessionStart';
const DAILY_APP_TIME_KEY = 'dailyAppTimeSeconds'; // today's language app seconds
const DAILY_SOCIAL_TIME_KEY = 'dailySocialTimeSeconds'; // manually entered social media seconds
const LAST_RESET_DATE_KEY = 'timeTrackerLastResetDate';
const COMPETITION_LEVEL_KEY = 'competitionLevel'; // 1,2,3...
const COMPETITION_LEVEL_DAYS_KEY = 'competitionLevelDays'; // consecutive days app > social
const SOCIAL_MEDIA_NOTIF_IDS_KEY = 'socialMediaNotifIds';
const BATTLE_CHANNEL_ID = 'social-media-battle';

// ─── Notification Channel setup ────────────────────────────────────────────────
export async function setupBattleNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(BATTLE_CHANNEL_ID, {
      name: 'Social Media Battle',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#A855F7',
      sound: 'default',
    }).catch(() => {}); // channel setup can fail on some phones / Expo Go
  }
}

// ─── Reset daily counters if it's a new day ───────────────────────────────────
export async function resetDailyCountersIfNeeded(): Promise<void> {
  const today = new Date().toDateString();
  const lastReset = await AsyncStorage.getItem(LAST_RESET_DATE_KEY);

  if (lastReset !== today) {
    // Before resetting, check if yesterday was a winning day
    await checkEndOfDayAndLevelUp();
    await AsyncStorage.setItem(DAILY_APP_TIME_KEY, '0');
    await AsyncStorage.setItem(DAILY_SOCIAL_TIME_KEY, '0');
    await AsyncStorage.setItem(LAST_RESET_DATE_KEY, today);
  }
}

// ─── Start timing the language app session ────────────────────────────────────
export async function startAppSession(): Promise<void> {
  const now = Date.now().toString();
  await AsyncStorage.setItem(APP_SESSION_START_KEY, now);
}

// ─── Stop timing and add to daily app time ────────────────────────────────────
export async function stopAppSession(): Promise<number> {
  const startStr = await AsyncStorage.getItem(APP_SESSION_START_KEY);
  if (!startStr) return 0;

  const elapsed = Math.floor((Date.now() - parseInt(startStr, 10)) / 1000);
  const storedStr = await AsyncStorage.getItem(DAILY_APP_TIME_KEY);
  const stored = storedStr ? parseInt(storedStr, 10) : 0;
  const newTotal = stored + elapsed;

  await AsyncStorage.setItem(DAILY_APP_TIME_KEY, newTotal.toString());
  await AsyncStorage.removeItem(APP_SESSION_START_KEY);

  return newTotal;
}

// ─── Get current accumulated app time (including live session) ────────────────
export async function getCurrentAppTime(): Promise<number> {
  const storedStr = await AsyncStorage.getItem(DAILY_APP_TIME_KEY);
  const stored = storedStr ? parseInt(storedStr, 10) : 0;

  const startStr = await AsyncStorage.getItem(APP_SESSION_START_KEY);
  if (startStr) {
    const liveSeconds = Math.floor((Date.now() - parseInt(startStr, 10)) / 1000);
    return stored + liveSeconds;
  }
  return stored;
}

// ─── Set/update social media time (user manually logs or via usage prompt) ────
export async function setSocialMediaTime(totalSeconds: number): Promise<void> {
  await AsyncStorage.setItem(DAILY_SOCIAL_TIME_KEY, totalSeconds.toString());
  // After updating social time, run the check
  await runBattleCheck();
}

// ─── Get social media time ────────────────────────────────────────────────────
export async function getSocialMediaTime(): Promise<number> {
  const stored = await AsyncStorage.getItem(DAILY_SOCIAL_TIME_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

// ─── Get competition level ────────────────────────────────────────────────────
export async function getCompetitionLevel(): Promise<number> {
  const stored = await AsyncStorage.getItem(COMPETITION_LEVEL_KEY);
  return stored ? parseInt(stored, 10) : 1;
}

// ─── Get consecutive winning days ─────────────────────────────────────────────
export async function getConsecutiveWinDays(): Promise<number> {
  const stored = await AsyncStorage.getItem(COMPETITION_LEVEL_DAYS_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

// ─── Format seconds to "Xh Ym" ───────────────────────────────────────────────
export function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Send immediate alarm notification ────────────────────────────────────────
async function sendImmediateNotification(
  title: string,
  body: string,
  mood: 'happy' | 'sad' | 'angry' | 'celebrate' = 'happy',
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🐰 ${title}`,
        body,
        sound: 'default',
        data: { mood, route: '/SocialMediaArenaScreen' },
        ...(Platform.OS === 'android' && { channelId: BATTLE_CHANNEL_ID }),
      },
      trigger: null, // immediate
    });
  } catch (e) {
    console.warn('Could not send battle notification:', e);
  }
}

// ─── MAIN BATTLE CHECK — called whenever times change ─────────────────────────
export async function runBattleCheck(): Promise<BattleStatus> {
  const appTime = await getCurrentAppTime();
  const socialTime = await getSocialMediaTime();

  const status = getBattleStatus(appTime, socialTime);

  if (status.type === 'alarm') {
    await sendImmediateNotification(
      '🚨 ALARM! Social Media is Winning!',
      status.message,
      'angry'
    );
  } else if (status.type === 'warning') {
    await sendImmediateNotification(
      '⚠️ Warning: Social Media Catching Up!',
      status.message,
      'sad'
    );
  }

  return status;
}

export type BattleStatusType = 'winning' | 'warning' | 'alarm' | 'tied';

export interface BattleStatus {
  type: BattleStatusType;
  appTime: number;
  socialTime: number;
  message: string;
  motivationalMessage: string;
}

// ─── Determine battle status ──────────────────────────────────────────────────
export function getBattleStatus(appTime: number, socialTime: number): BattleStatus {
  const diff = socialTime - appTime; // positive = social winning

  // Social media is WINNING (social > app)
  if (socialTime > appTime) {
    const alarmMessages = [
      `📵 You've spent ${formatTime(socialTime)} on social media vs ${formatTime(appTime)} learning! Instagram & TikTok are stealing your dreams! Open LinguaBloom NOW! 🧠⚡`,
      `🚨 Social media: ${formatTime(socialTime)} | Learning: ${formatTime(appTime)} — Your future self is disappointed! Swipe away those apps and LEARN! 💪🔥`,
      `😤 ${formatTime(socialTime)} on scrolling vs ${formatTime(appTime)} on growing? Every minute on Instagram is a minute your brain could BLOOM! Come back! 🌸`,
      `⚡ ALERT! Social media is eating your day — ${formatTime(socialTime)} vs your ${formatTime(appTime)} of learning. Champions don't scroll, they STUDY! 🏆`,
    ];
    const motivations = [
      `Your language skills are waiting for you! Every lesson is a step toward being bilingual! 🌍`,
      `Remember why you started! A new language opens new worlds. Don't let social media steal that! 🚀`,
      `You're stronger than the scroll! Come back and show social media who's boss! 💪`,
      `The feed can wait. Your FUTURE can't. Let's learn! 🎯`,
    ];
    const idx = Math.floor(Math.random() * alarmMessages.length);
    return {
      type: 'alarm',
      appTime,
      socialTime,
      message: alarmMessages[idx],
      motivationalMessage: motivations[idx],
    };
  }

  // App is winning but social is close (within 20% of app time OR within 10 minutes)
  const closeThreshold = Math.max(600, appTime * 0.20); // 10 min OR 20%
  if (appTime > socialTime && (appTime - socialTime) < closeThreshold) {
    return {
      type: 'warning',
      appTime,
      socialTime,
      message: `⚠️ Warning! Social media (${formatTime(socialTime)}) is almost catching your learning time (${formatTime(appTime)})! Keep going — just a little more! 📚`,
      motivationalMessage: `So close! Keep your learning streak alive — just a few more minutes and you'll leave social media in the dust! 🌟`,
    };
  }

  // Tied
  if (appTime === socialTime && appTime > 0) {
    return {
      type: 'tied',
      appTime,
      socialTime,
      message: `🤝 It's a TIE! ${formatTime(appTime)} each. Break the tie — open a lesson! 📖`,
      motivationalMessage: `Dead even! This is YOUR moment to take the lead. One lesson = Victory! 🏆`,
    };
  }

  // App is WINNING (comfortably)
  const winMessages = [
    `🏆 Crushing it! ${formatTime(appTime)} learning vs ${formatTime(socialTime)} social media. You're a champion! 🌟`,
    `🧠 Big brain energy! ${formatTime(appTime)} on growth vs ${formatTime(socialTime)} scrolling. Keep dominating! 💪`,
    `🚀 You're WINNING the day! ${formatTime(appTime)} learning > ${formatTime(socialTime)} social. This is what legends do! ⭐`,
    `🌸 Language skills leveling UP! ${formatTime(appTime)} studying > ${formatTime(socialTime)} social media. You're unstoppable! 🔥`,
  ];
  const idx2 = Math.floor(Math.random() * winMessages.length);
  return {
    type: 'winning',
    appTime,
    socialTime,
    message: winMessages[idx2],
    motivationalMessage: `Keep this up for the full day and you'll level up your Battle Rank! 🎮`,
  };
}

// ─── End of day check + Level up ─────────────────────────────────────────────
export async function checkEndOfDayAndLevelUp(): Promise<void> {
  const appTime = await getCurrentAppTime();
  const socialTime = await getSocialMediaTime();

  if (appTime === 0 && socialTime === 0) return; // No data for today

  const storedDays = await AsyncStorage.getItem(COMPETITION_LEVEL_DAYS_KEY);
  const storedLevel = await AsyncStorage.getItem(COMPETITION_LEVEL_KEY);
  let consecutiveDays = storedDays ? parseInt(storedDays, 10) : 0;
  let level = storedLevel ? parseInt(storedLevel, 10) : 1;

  if (appTime > socialTime) {
    // Won today!
    consecutiveDays += 1;
    await sendImmediateNotification(
      "🎉 You WON Today's Battle!",
      `Amazing! You spent ${formatTime(appTime)} learning vs ${formatTime(socialTime)} on social media. Day ${consecutiveDays} of winning! 🏆`,
      'celebrate'
    );

    // Level up every 3 consecutive days
    if (consecutiveDays % 3 === 0) {
      level += 1;
      await AsyncStorage.setItem(COMPETITION_LEVEL_KEY, level.toString());
      await sendImmediateNotification(
        `🆙 LEVEL UP! You're now Level ${level}! 🎮`,
        `${consecutiveDays} days of learning more than social media! You're a true Language Champion! 🏅 Keep this streak going!`,
        'celebrate'
      );
    }
  } else {
    // Lost today — reset consecutive days but keep level
    consecutiveDays = 0;
  }

  await AsyncStorage.setItem(COMPETITION_LEVEL_DAYS_KEY, consecutiveDays.toString());
}

// ─── Schedule end-of-day summary notification ─────────────────────────────────
export async function scheduleEndOfDaySummary(): Promise<void> {
  if (Platform.OS === 'web') return;

  // Schedule at 11 PM (23:00) today
  const now = new Date();
  const target = new Date(now);
  target.setHours(23, 0, 0, 0);

  // If 11 PM already passed, skip (will be scheduled tomorrow)
  if (target.getTime() <= now.getTime()) return;

  const secondsUntil = Math.floor((target.getTime() - now.getTime()) / 1000);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🐰 Daily Battle Summary Time!',
      body: 'How did your battle against social media go today? Open LinguaBloom to see your results! 📊',
      sound: 'default',
      data: { mood: 'happy', route: '/SocialMediaArenaScreen' },
      ...(Platform.OS === 'android' && { channelId: BATTLE_CHANNEL_ID }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: secondsUntil,
      repeats: false,
    },
  });
}

// ─── Get Battle Rank Title ────────────────────────────────────────────────────
export function getBattleRankTitle(level: number): string {
  const ranks = [
    'Rookie Learner 🌱',
    'Rising Scholar 📗',
    'Word Warrior ⚔️',
    'Language Knight 🛡️',
    'Vocabulary Viper 🐍',
    'Sentence Samurai 🥷',
    'Grammar Guardian 🏯',
    'Dialect Duke 👑',
    'Linguistic Legend 🌟',
    'Social Media Slayer 💎',
  ];
  return ranks[Math.min(level - 1, ranks.length - 1)];
}

// ─── AppState listener helpers ────────────────────────────────────────────────
let _appStateSubscription: any = null;

export function startAppStateTracking(): void {
  if (_appStateSubscription) return;
  startAppSession();
  _appStateSubscription = AppState.addEventListener('change', async (state: AppStateStatus) => {
    if (state === 'background' || state === 'inactive') {
      await stopAppSession();
    } else if (state === 'active') {
      await startAppSession();
      await resetDailyCountersIfNeeded();
    }
  });
}

export function stopAppStateTracking(): void {
  if (_appStateSubscription) {
    _appStateSubscription.remove();
    _appStateSubscription = null;
  }
  stopAppSession();
}