import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '65%'],
  });

  const languages = [
    { flag: '🇬🇧', code: 'GB', name: 'English' },
    { flag: '🇩🇪', code: 'DE', name: 'Deutsch' },
    { flag: '🇪🇸', code: 'ES', name: 'Español' },
    { flag: '🇵🇰', code: 'PK', name: 'اردو' },
  ];

  const handleEnter = async () => {
    const isLoggedIn = await AsyncStorage.getItem('isLoggedIn');

    if (isLoggedIn === 'true') {
      // Always go to OnboardingQuestions so user can select language
      // The OnboardingQuestions screen will check for existing progress
      // and offer to resume or start fresh for that language
      router.replace('/OnboardingQuestions');
    } else {
      router.replace('/loginScreen');
    }
  };

  return (
    <View style={styles.container}>

      {/* LOGO */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <View style={styles.logoCircle}>
          <View style={styles.logoPin}>
            <View style={styles.logoDot} />
          </View>
        </View>
      </Animated.View>

      {/* TITLE */}
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text style={styles.title}>
          <Text style={styles.titleRegular}>Lingua</Text>
          <Text style={styles.titleItalic}>Bloom</Text>
        </Text>
        <Text style={styles.tagline}>LANGUAGE · CULTURE · CONNECTION</Text>
      </Animated.View>

      {/* LANGUAGE PILLS */}
      <Animated.View style={[styles.pillsRow, { opacity: fadeAnim }]}>
        {languages.map((lang) => (
          <View key={lang.code} style={styles.pill}>
            <Text style={styles.pillFlag}>{lang.flag}</Text>
            <Text style={styles.pillCode}>{lang.code}</Text>
            <Text style={styles.pillName}>{lang.name}</Text>
          </View>
        ))}
      </Animated.View>

      {/* LOADING TEXT + PROGRESS BAR */}
      <Animated.View style={{ opacity: fadeAnim, width: '100%', alignItems: 'center', gap: 10 }}>
        <Text style={styles.loadingText}>LOADING YOUR WORLD</Text>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </Animated.View>

      {/* ARROW BUTTON */}
      <Animated.View style={{ opacity: fadeAnim }}>
        <TouchableOpacity
          style={styles.arrowBtn}
          onPress={handleEnter}
          activeOpacity={0.8}
        >
          <Text style={styles.arrowText}>↓</Text>
        </TouchableOpacity>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9D7E3',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 28,
  },
  logoCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: '#E8A0BB',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPin: {
    width: 44,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#D4608A',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  logoDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 42,
    letterSpacing: -1,
  },
  titleRegular: {
    color: '#C2476E',
    fontWeight: '600',
  },
  titleItalic: {
    color: '#C2476E',
    fontWeight: '800',
    fontStyle: 'italic',
  },
  tagline: {
    fontSize: 11,
    color: '#C2476E',
    letterSpacing: 3,
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#D4608A',
    backgroundColor: 'transparent',
  },
  pillFlag: { fontSize: 14 },
  pillCode: {
    fontSize: 11,
    color: '#C2476E',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  pillName: {
    fontSize: 14,
    color: '#7A2040',
    fontWeight: '500',
  },
  loadingText: {
    fontSize: 11,
    color: '#C2476E',
    letterSpacing: 3,
  },
  progressTrack: {
    width: '80%',
    height: 3,
    backgroundColor: '#F0B0C8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D4608A',
    borderRadius: 2,
  },
  arrowBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#D4608A',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    color: '#C2476E',
    fontWeight: '600',
  },
});
