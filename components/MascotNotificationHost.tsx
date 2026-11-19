import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Mascot, { MascotMood } from './Mascot';

type Popup = { title: string; body: string; mood: MascotMood; route?: string };

const SHOWN_KEY = 'lastMascotNotifShown';

/**
 * When the user taps a streak / Battle Arena notification, the app opens
 * and the bunny shows up with the same message (sad, angry, happy or celebrating).
 * Mount this once in app/_layout.tsx (mobile only).
 */
export default function MascotNotificationHost() {
  const router = useRouter();
  const [popup, setPopup] = useState<Popup | null>(null);

  useEffect(() => {
    const show = async (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      try {
        const req = response.notification.request;
        const last = await AsyncStorage.getItem(SHOWN_KEY);
        if (last === req.identifier) return; // already shown once
        await AsyncStorage.setItem(SHOWN_KEY, req.identifier);

        const c = req.content;
        const data: any = c.data || {};
        const mood: MascotMood = ['happy', 'sad', 'angry', 'celebrate'].includes(data.mood) ? data.mood : 'happy';
        setPopup({
          title: (c.title || '').replace(/^🐰\s*/, ''),
          body: c.body || '',
          mood,
          route: typeof data.route === 'string' ? data.route : undefined,
        });
      } catch {
        // ignore
      }
    };

    // app opened by tapping a notification (was closed)
    Notifications.getLastNotificationResponseAsync().then(show).catch(() => {});
    // notification tapped while app is in background / open
    const sub = Notifications.addNotificationResponseReceivedListener((r) => { show(r); });
    return () => sub.remove();
  }, []);

  const close = (go: boolean) => {
    const route = popup?.route;
    setPopup(null);
    if (go && route) router.push(route as any);
  };

  return (
    <Modal visible={!!popup} transparent animationType="fade" onRequestClose={() => close(false)}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {popup && <Mascot mood={popup.mood} size={170} />}
          <Text style={styles.title}>{popup?.title}</Text>
          <Text style={styles.body}>{popup?.body}</Text>
          <TouchableOpacity style={styles.btn} onPress={() => close(true)}>
            <Text style={styles.btnText}>
              {popup?.mood === 'celebrate' ? 'Yay! 🎉' : popup?.mood === 'happy' ? 'Okay! 💖' : "Let's fix it! 💪"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => close(false)}>
            <Text style={styles.later}>Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,26,53,0.88)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', backgroundColor: '#172545', borderRadius: 28, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 8, marginBottom: 8 },
  body: { color: '#CBD5E1', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 22 },
  btn: { backgroundColor: '#A855F7', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 16, width: '100%', alignItems: 'center', marginBottom: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  later: { color: '#94A3B8', fontWeight: '600', padding: 8 },
});
