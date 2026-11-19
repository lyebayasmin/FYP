import { scheduleGoalReminders } from './utils/dailyGoal';
import { getCommittedGoal, commitGoal, Goal } from './utils/goal';
import { saveUserData, getUserData, syncCurrentProgressToLanguage } from './utils/userStorage';
import { activateLanguage, saveLanguageSetup } from './utils/languageSetup';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANG_OPTIONS = [
  { id: 'English', label: 'English', emoji: '🇬🇧' },
  { id: 'German', label: 'German', emoji: '🇩🇪' },
  { id: 'Spanish', label: 'Spanish', emoji: '🇪🇸' },
  { id: 'Urdu', label: 'Urdu', emoji: '🇵🇰' },
];

const TIME_OPTIONS = [
  { id: '15 min', label: '15 min/day', emoji: '⚡' },
  { id: '30 min', label: '30 min/day', emoji: '⏱️' },
  { id: '1 hr', label: '1 hour/day', emoji: '⏳' },
  { id: '2 hr', label: '2 hours/day', emoji: '🔥' },
];

const GOAL_OPTIONS = [
  { id: 'Compete', label: 'Leaderboards', emoji: '🏆' },
  { id: 'Streak', label: 'Daily Streaks', emoji: '🎯' },
];

const NOTIFY_OPTIONS = [
  { id: 'Yes', label: 'Remind me', emoji: '🔔' },
  { id: 'No', label: 'No thanks', emoji: '🔕' },
];

const STEPS = [
  { title: 'What do you want to learn?', options: LANG_OPTIONS, stateKey: 'language' },
  { title: 'Daily commitment?', options: TIME_OPTIONS, stateKey: 'time' },
  { title: 'What motivates you?', options: GOAL_OPTIONS, stateKey: 'goal' },
  { title: 'Keep you on track?', options: NOTIFY_OPTIONS, stateKey: 'notify' }
];

const OptionCard = ({ item, isSelected, onPress }: any) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={styles.cardWrapper}
    >
      <Animated.View style={[
        styles.card, 
        isSelected && styles.selectedCard,
        { transform: [{ scale }] }
      ]}>
        <Text style={styles.cardEmoji}>{item.emoji}</Text>
        <View style={styles.cardTextContainer}>
          <Text style={[styles.text, isSelected && styles.selectedText]}>{item.label}</Text>
        </View>
        {isSelected && (
          <View style={styles.checkBadge}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function OnboardingQuestions() {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    language: '',
    time: '',
    goal: '',
    notify: ''
  });
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true })
    ]).start();
  };

  useEffect(() => {
    animateIn();
  }, [step]);

  const goNext = (val: string, currentKey: string) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -20, duration: 300, useNativeDriver: true })
    ]).start(async () => {
      // Step 1 = language. If this language was already set up before, skip the
      // other 3 questions and open its lesson straight away.
      if (currentKey === 'language') {
        const route = await activateLanguage(val);
        if (route) {
          router.replace(route as any);
          return;
        }
      }
      if (step < STEPS.length - 1) {
        setStep(step + 1);
      } else {
        finish({ ...answers, [currentKey]: val });
      }
    });
  };

  const handleSelect = (val: string) => {
    const currentKey = STEPS[step].stateKey;
    setAnswers(prev => ({ ...prev, [currentKey]: val }));

    // Wait 400ms to show the selected state before animating out
    setTimeout(() => goNext(val, currentKey), 400);
  };

  // Only reached for a language that has NOT been set up before
  const finish = async (rawAnswers: any) => {
    const lang = String(rawAnswers.language).toLowerCase();

    // The motivation picked for THIS language sticks for this language only
    const committed = await getCommittedGoal(lang);
    const goal: Goal = committed ?? (rawAnswers.goal === 'Compete' ? 'Compete' : 'Streak');
    if (!committed) await commitGoal(goal, lang);
    const finalAnswers = { ...rawAnswers, language: lang, goal };

    // keep the language we are leaving up to date before switching
    const previous = ((await getUserData())?.language || '').toLowerCase();
    if (previous && previous !== lang) {
      try { await syncCurrentProgressToLanguage(previous); } catch {}
    }

    await saveLanguageSetup({
      language: lang,
      time: finalAnswers.time,
      goal,
      notify: finalAnswers.notify,
    });
    await saveUserData(finalAnswers);
    scheduleGoalReminders(); // apply the chosen daily commitment (mobile only)
    await AsyncStorage.setItem('onboardingComplete', 'true');

    // brand-new language: start with clean progress
    for (const k of [
      'userLevel', 'currentTier', 'beginnerLevel', 'beginnerLessonIndex', 'beginnerBadgeCount',
      'beginnerLessonsCompleted', 'xp', 'beginnerSubLevel', 'lessonsAtCurrentWordLevel',
    ]) {
      await AsyncStorage.removeItem(k);
    }

    if (lang === 'english') {
      await AsyncStorage.setItem('userLevel', 'intermediate');
      await AsyncStorage.setItem('currentTier', 'basic');
      router.replace('/WelcomeScreen');
    } else {
      router.replace('/KnowledgeCheckScreen');
    }
  };

  if (step >= STEPS.length) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.text}>Preparing your lessons...</Text>
      </View>
    );
  }

  const currentStepData = STEPS[step];

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: `${((step) / STEPS.length) * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>Step {step + 1} of {STEPS.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Text style={styles.q}>{currentStepData.title}</Text>
          
          <View style={styles.list}>
            {currentStepData.options.map((item) => {
              const isSelected = answers[currentStepData.stateKey as keyof typeof answers] === item.id;
              return (
                <OptionCard 
                  key={item.id} 
                  item={item} 
                  isSelected={isSelected} 
                  onPress={() => handleSelect(item.id)} 
                />
              );
            })}
          </View>
        </Animated.View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A35',
    paddingTop: 60,
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A855F7',
    borderRadius: 3,
  },
  progressText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  q: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 32,
    marginTop: 20,
  },
  list: {
    flexDirection: 'column',
    gap: 16,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    backgroundColor: '#172545',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  selectedCard: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#A855F7',
  },
  cardEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  text: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 18,
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  checkBadge: {
    backgroundColor: '#A855F7',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 26, 53, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#172545',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#1E293B',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalEmoji: {
    fontSize: 52,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  modalBtnPrimary: {
    backgroundColor: '#A855F7',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalBtnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBtnSecondary: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4C1D95',
  },
  modalBtnSecondaryText: {
    color: '#C4B5FD',
    fontWeight: 'bold',
    fontSize: 15,
  },
});