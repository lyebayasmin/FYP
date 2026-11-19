import './utils/silenceLogs';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import MascotNotificationHost from '../components/MascotNotificationHost';
import {
  requestNotificationPermissions,
  recordAppOpen,
  scheduleStreakReminders,
} from './utils/streakNotifications';
import {
  setupBattleNotificationChannel,
  startAppStateTracking,
  resetDailyCountersIfNeeded,
  scheduleEndOfDaySummary,
} from './utils/socialMediaTracker';
import { startDailyGoalTracking } from './utils/dailyGoal';

export default function Layout() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Ask the browser to keep saved accounts (stops it clearing storage under pressure)
      try {
        (navigator as any)?.storage?.persist?.();
      } catch {}
      return;
    }

    const initNotifications = async () => {
      try {
      // Request permission on first launch (shows popup on Android 13+ / iOS)
      await requestNotificationPermissions();
      // Record that user opened the app & update streak count
      await recordAppOpen();
      // Cancel old reminders & schedule fresh 24h / 42h / 48h notifications
      await scheduleStreakReminders();
      // Setup Social Media Battle notifications
      await setupBattleNotificationChannel();
      // Reset daily counters if it is a new day
      await resetDailyCountersIfNeeded();
      // Schedule end-of-day summary notification
      await scheduleEndOfDaySummary();
      // Daily commitment: angry-bunny reminder if the chosen time isn't spent in 24h
      await startDailyGoalTracking();
      } catch (e) {
        // Notifications are optional (e.g. limited in Expo Go): never let them crash or show an error
        console.log('Notification setup skipped:', e);
      }
    };

    initNotifications();
    // Start tracking how long user spends in the language app
    startAppStateTracking();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} />
      {/* Bunny pop-up when a streak / battle notification is tapped (mobile only) */}
      {Platform.OS !== 'web' && <MascotNotificationHost />}
    </>
  );
}
