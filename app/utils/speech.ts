// Offline text-to-speech using the phone's built-in voice engine (expo-speech).
// No internet, API key or backend needed. For offline use the phone must have
// the voice data for the language installed (see warnIfVoiceMissing below).
import * as Speech from 'expo-speech';
import { Alert, Platform } from 'react-native';

const VOICE_LANG: Record<string, string> = {
  spanish: 'es-ES',
  german: 'de-DE',
  urdu: 'ur-PK',
  english: 'en-US',
};

const LABELS: Record<string, string> = {
  spanish: 'Spanish',
  german: 'German',
  urdu: 'Urdu',
  english: 'English',
};

const toCode = (lang: string) => VOICE_LANG[(lang || '').toLowerCase()] ?? 'en-US';

/** Speak text in the given app language ('spanish' | 'german' | 'urdu' | 'english'). */
export const speak = (text: string, lang: string) => {
  try {
    // Turn "___" blanks into a short pause so sentences read naturally.
    const clean = (text || '').replace(/_{2,}/g, ' ... ').replace(/\s+/g, ' ').trim();
    if (!clean) return;
    Speech.stop();
    Speech.speak(clean, {
      language: toCode(lang),
      rate: 0.85, // slightly slower = clearer pronunciation for learners
      pitch: 1.0,
      onError: () => {},
    });
  } catch {
    // never crash the lesson/quiz because of audio
  }
};

export const stopSpeaking = () => {
  try {
    Speech.stop();
  } catch {}
};

const warned: Record<string, boolean> = {};

/**
 * If the phone has no voice installed for this language, tell the user once
 * (per app session) how to download it so speech also works offline.
 */
export const warnIfVoiceMissing = async (lang: string) => {
  try {
    const key = (lang || '').toLowerCase();
    if (key === 'english' || warned[key]) return;
    const prefix = toCode(key).split('-')[0].toLowerCase();
    const voices = await Speech.getAvailableVoicesAsync();
    if (!voices || voices.length === 0) return; // unknown (e.g. web) – don't nag
    const found = voices.some((v) =>
      (v.language || '').toLowerCase().replace('_', '-').startsWith(prefix)
    );
    if (found) return;
    warned[key] = true;
    const label = LABELS[key] || lang;
    Alert.alert(
      `${label} voice not installed`,
      Platform.OS === 'android'
        ? `To hear ${label} pronunciation (also offline), open Settings → System → Languages → Text-to-speech output → Google engine → Install voice data, and download ${label}.`
        : `To hear ${label} pronunciation, open Settings → Accessibility → Spoken Content → Voices, and download a ${label} voice.`
    );
  } catch {}
};
