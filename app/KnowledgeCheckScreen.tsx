import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData, saveUserData } from './utils/userStorage';

const LANG_LABELS: Record<string, string> = {
  english: 'English 🇬🇧',
  german: 'German 🇩🇪',
  spanish: 'Spanish 🇪🇸',
  urdu: 'Urdu 🇵🇰',
};

export default function KnowledgeCheckScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState('english');
  const [selected, setSelected] = useState<'beginner' | 'intermediate' | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const card1Scale = useRef(new Animated.Value(1)).current;
  const card2Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadLanguage();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadLanguage = async () => {
    const user = await getUserData();
    setLanguage((user?.language || 'english').toLowerCase());
  };

  const handleSelect = (level: 'beginner' | 'intermediate') => {
    setSelected(level);
    const anim = level === 'beginner' ? card1Scale : card2Scale;
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleContinue = async () => {
    if (!selected) return;
    const existing = await getUserData();
    await saveUserData({ ...existing, level: selected });
    // Reset lesson progress for fresh start
    await AsyncStorage.setItem('userLevel', selected);
    await AsyncStorage.setItem('lessonIndex', '0');
    await AsyncStorage.removeItem('beginnerSubLevel'); // Reset word-level progression
    await AsyncStorage.setItem('xp', '0');
    
    // For Total Beginners learning non-English languages, go to lesson first
    if (selected === 'beginner' && language !== 'english') {
      // Reset beginner-specific progress
      await AsyncStorage.setItem('beginnerLevel', '1');
      await AsyncStorage.setItem('beginnerLessonIndex', '0');
      await AsyncStorage.setItem('lessonsAtCurrentWordLevel', '0');
      router.replace('/BeginnerLessonScreen');
    } else {
      // Intermediate or English learners go to adaptive lessons
      router.replace('/AdaptiveLessonScreen');
    }
  };

  const langLabel = LANG_LABELS[language] || language;

  return (
    <View style={styles.container}>
      {/* Background decorative circles */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.langBadge}>
            <Text style={styles.langBadgeText}>{langLabel}</Text>
          </View>
          <Text style={styles.title}>How well do you{'\n'}know this language?</Text>
          <Text style={styles.subtitle}>
            We'll personalise your lessons based on your answer
          </Text>
        </View>

        {/* Cards */}
        <View style={styles.cards}>
          {/* Beginner card */}
          <Animated.View style={{ transform: [{ scale: card1Scale }] }}>
            <TouchableOpacity
              style={[
                styles.card,
                selected === 'beginner' && styles.cardSelected,
              ]}
              onPress={() => handleSelect('beginner')}
              activeOpacity={0.9}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardEmoji}>🌱</Text>
                <View
                  style={[
                    styles.radioOuter,
                    selected === 'beginner' && styles.radioOuterSelected,
                  ]}
                >
                  {selected === 'beginner' && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text
                style={[
                  styles.cardTitle,
                  selected === 'beginner' && styles.cardTitleSelected,
                ]}
              >
                Total Beginner
              </Text>
              <Text
                style={[
                  styles.cardDesc,
                  selected === 'beginner' && styles.cardDescSelected,
                ]}
              >
                I've never studied this language. Start me from scratch with greetings and basic words.
              </Text>
              <View
                style={[
                  styles.cardTag,
                  selected === 'beginner' && styles.cardTagSelected,
                ]}
              >
                <Text
                  style={[
                    styles.cardTagText,
                    selected === 'beginner' && styles.cardTagTextSelected,
                  ]}
                >
                  Starts from A1 basics
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Intermediate card */}
          <Animated.View style={{ transform: [{ scale: card2Scale }] }}>
            <TouchableOpacity
              style={[
                styles.card,
                selected === 'intermediate' && styles.cardSelected,
              ]}
              onPress={() => handleSelect('intermediate')}
              activeOpacity={0.9}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardEmoji}>⚡</Text>
                <View
                  style={[
                    styles.radioOuter,
                    selected === 'intermediate' && styles.radioOuterSelected,
                  ]}
                >
                  {selected === 'intermediate' && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text
                style={[
                  styles.cardTitle,
                  selected === 'intermediate' && styles.cardTitleSelected,
                ]}
              >
                Know the Basics
              </Text>
              <Text
                style={[
                  styles.cardDesc,
                  selected === 'intermediate' && styles.cardDescSelected,
                ]}
              >
                I know some words or phrases already. Challenge me with real sentences.
              </Text>
              <View
                style={[
                  styles.cardTag,
                  selected === 'intermediate' && styles.cardTagSelected,
                ]}
              >
                <Text
                  style={[
                    styles.cardTagText,
                    selected === 'intermediate' && styles.cardTagTextSelected,
                  ]}
                >
                  Jumps to A2–B1 level
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Continue button */}
        <TouchableOpacity
          style={[styles.continueBtn, !selected && styles.continueBtnDisabled]}
          onPress={handleContinue}
          activeOpacity={selected ? 0.8 : 1}
        >
          <Text style={styles.continueBtnText}>
            {selected ? 'Start Learning →' : 'Select one to continue'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE4EC',
  },
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#FFB6C1',
    opacity: 0.25,
    top: -80,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF6FA1',
    opacity: 0.12,
    bottom: 40,
    left: -60,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 28,
    alignItems: 'center',
  },
  langBadge: {
    backgroundColor: '#FF6FA1',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  langBadgeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#CC2060',
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  cards: {
    gap: 14,
    marginBottom: 28,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 22,
    borderWidth: 2,
    borderColor: '#F0C0D0',
    elevation: 2,
    shadowColor: '#FF6FA1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardSelected: {
    backgroundColor: '#FF6FA1',
    borderColor: '#FF3D7F',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardEmoji: {
    fontSize: 30,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFB6C1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: 'white',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#333',
    marginBottom: 6,
  },
  cardTitleSelected: {
    color: 'white',
  },
  cardDesc: {
    fontSize: 13,
    color: '#777',
    lineHeight: 20,
    marginBottom: 14,
  },
  cardDescSelected: {
    color: 'rgba(255,255,255,0.85)',
  },
  cardTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFE4EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardTagSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  cardTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6FA1',
  },
  cardTagTextSelected: {
    color: 'white',
  },
  continueBtn: {
    backgroundColor: '#FF3D7F',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF3D7F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  continueBtnDisabled: {
    backgroundColor: '#FFB6C1',
    elevation: 0,
    shadowOpacity: 0,
  },
  continueBtnText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 16,
  },
});
