import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, syncCurrentProgressToLanguage } from './userStorage';
import { activateLanguage } from './languageSetup';

// All accounts live in one object: { "email@x.com": { name, email, password } }
const USERS_KEY = 'registeredUsers';
const BACKUP_KEY = 'registeredUsers_backup'; // second copy, used to self-heal

export type Account = { name: string; email: string; password: string };
type AccountMap = Record<string, Account>;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Never throws: a missing/corrupt value just means "no accounts here".
const parse = (raw: string | null): AccountMap => {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};

/** Load every saved account (main copy + backup copy merged). */
export const loadAccounts = async (): Promise<AccountMap> => {
  const [[, main], [, backup]] = await AsyncStorage.multiGet([USERS_KEY, BACKUP_KEY]);
  const a = parse(main);
  const b = parse(backup);
  const merged: AccountMap = { ...b, ...a };

  // If the main copy was lost/corrupted but the backup is fine, restore it.
  if (Object.keys(merged).length !== Object.keys(a).length) {
    try {
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(merged));
    } catch {}
  }
  return merged;
};

export const findAccount = async (email: string): Promise<Account | null> => {
  const accounts = await loadAccounts();
  const key = normalizeEmail(email);
  if (accounts[key]) return accounts[key];
  // tolerate old entries that were saved with different letter-case
  const match = Object.keys(accounts).find((k) => normalizeEmail(k) === key);
  return match ? accounts[match] : null;
};

/** Save a new account and VERIFY it was really written. Throws if it was not. */
export const saveAccount = async (account: Account): Promise<void> => {
  const accounts = await loadAccounts();
  const key = normalizeEmail(account.email);
  accounts[key] = { ...account, email: key };
  const json = JSON.stringify(accounts);

  await AsyncStorage.multiSet([
    [USERS_KEY, json],
    [BACKUP_KEY, json],
  ]);

  const check = await AsyncStorage.getItem(USERS_KEY);
  if (!parse(check)[key]) {
    throw new Error('Account could not be saved on this device.');
  }
};

// Things that belong to ONE account and must not leak to the next account on this phone
const SESSION_DATA_KEYS = [
  'userData', 'onboardingComplete', 'userLevel', 'currentTier', 'beginnerLevel', 'beginnerLessonIndex',
  'beginnerBadgeCount', 'beginnerLessonsCompleted', 'xp', 'beginnerSubLevel', 'lessonsAtCurrentWordLevel',
  'lastLessonDate', 'lessonIndex', 'isIntermediateStart',
];

/** Log out: save this account's progress, then clear it from the phone's "current" slot. */
export const endSession = async (): Promise<void> => {
  try {
    const email = await AsyncStorage.getItem('userEmail');
    const lang = ((await getUserData())?.language || '').toLowerCase();
    if (email && lang) {
      await syncCurrentProgressToLanguage(lang); // saved under THIS account
      await AsyncStorage.setItem(`lastLanguage:${normalizeEmail(email)}`, lang);
    }
  } catch {}
  await AsyncStorage.multiRemove([...SESSION_DATA_KEYS, 'isLoggedIn', 'authToken', 'userName', 'userEmail']);
};

/** Mark the user as logged in. */
export const startSession = async (account: Account): Promise<void> => {
  const email = normalizeEmail(account.email);
  await AsyncStorage.multiRemove(SESSION_DATA_KEYS); // never inherit the previous account's data
  await AsyncStorage.multiSet([
    ['isLoggedIn', 'true'],
    ['userName', account.name],
    ['userEmail', email],
  ]);
  // Returning account: bring back the language they were learning (with its own progress)
  try {
    const last = await AsyncStorage.getItem(`lastLanguage:${email}`);
    if (last) await activateLanguage(last);
  } catch {}
};