import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Port of the leaderboard server (the "server" folder).
const PORT = 4000;

// Optional: your PC's Wi-Fi IPv4 address (`ipconfig` -> "IPv4 Address").
// It is only a backup: the app first tries the same PC that runs Expo.
const PC_WIFI_IP = '10.135.84.190';

/** The PC running Expo (found automatically from the Expo dev connection). */
const expoHost = (): string | null => {
  try {
    const c: any = Constants;
    const hostUri: string | undefined =
      c.expoConfig?.hostUri || c.expoGoConfig?.debuggerHost || c.manifest2?.extra?.expoGo?.debuggerHost;
    const host = hostUri?.split(':')[0];
    return host || null;
  } catch {
    return null;
  }
};

/** Every address the leaderboard server might be reachable on, best guess first. */
export const API_URLS: string[] = (() => {
  const hosts: string[] = [];
  if (Platform.OS === 'web') {
    try {
      const h = (globalThis as any).location?.hostname;
      if (h) hosts.push(h);
    } catch {}
    hosts.push('localhost', '127.0.0.1');
  } else {
    const auto = expoHost();
    if (auto) hosts.push(auto);
    hosts.push(PC_WIFI_IP);
    if (Platform.OS === 'android') hosts.push('10.0.2.2'); // Android emulator
    hosts.push('localhost');
  }
  return Array.from(new Set(hosts)).map((h) => `http://${h}:${PORT}`);
})();

// kept for older imports
export const API_URL = API_URLS[0];