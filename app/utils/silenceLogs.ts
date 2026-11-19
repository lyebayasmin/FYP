import { LogBox } from 'react-native';

// Hides the red/yellow notification warning that Expo Go shows on phones.
// Must be imported FIRST in app/_layout.tsx so it is active before expo-notifications loads.
LogBox.ignoreLogs([
  'expo-notifications',
  'Android Push notifications',
  'remote notifications',
  'functionality provided by expo-notifications',
]);

LogBox.ignoreLogs(['setNotificationChannelAsync', 'NullPointerException', 'ExpoNotificationChannelManager']);
