import { saveUserData, getLanguageProgress, loadLanguageProgressToStorage } from './utils/userStorage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OnboardingQuestions() {
  const router = useRouter();

  const [language, setLanguage] = useState('');
  const [time, setTime] = useState('');
  const [goal, setGoal] = useState('');
  const [notify, setNotify] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedProgress, setSavedProgress] = useState<any>(null);

  const finish = async () => {
    if (!language) {
      setErrorMsg('Please select a language!');
      return;
    }
    if (!time) {
      setErrorMsg('Please select your daily study time!');
      return;
    }
    if (!goal) {
      setErrorMsg('Please select your goal!');
      return;
    }
    if (!notify) {
      setErrorMsg('Please select your reminder preference!');
      return;
    }

    setErrorMsg('');
    await saveUserData({ language, time, goal, notify });
    await AsyncStorage.setItem('onboardingComplete', 'true');
    
    // Check if there's saved progress for this language
    const existingProgress = await getLanguageProgress(language.toLowerCase());
    
    if (existingProgress && (existingProgress.beginnerLessonIndex > 0 || existingProgress.xp > 0)) {
      // Show modal to ask if user wants to continue or start fresh
      setSavedProgress(existingProgress);
      setShowResumeModal(true);
    } else {
      // No saved progress, proceed normally
      await proceedToLearning(false);
    }
  };

  const proceedToLearning = async (resumeProgress: boolean) => {
    setShowResumeModal(false);
    
    if (resumeProgress && savedProgress) {
      // Load saved progress into AsyncStorage
      await loadLanguageProgressToStorage(language.toLowerCase());
      
      // Go directly to WelcomeScreen - user will continue from their saved level
      // The WelcomeScreen and lesson screens will use the loaded progress
      router.replace('/WelcomeScreen');
    } else {
      // Start fresh - clear any existing progress
      await AsyncStorage.removeItem('userLevel');
      await AsyncStorage.removeItem('currentTier');
      await AsyncStorage.removeItem('beginnerLevel');
      await AsyncStorage.removeItem('beginnerLessonIndex');
      await AsyncStorage.removeItem('beginnerBadgeCount');
      await AsyncStorage.removeItem('beginnerLessonsCompleted');
      await AsyncStorage.removeItem('xp');
      await AsyncStorage.removeItem('beginnerSubLevel');
      await AsyncStorage.removeItem('lessonsAtCurrentWordLevel');
      
      // For English, skip knowledge check and go directly to welcome/lessons
      // (assuming user already knows basic English)
      if (language.toLowerCase() === 'english') {
        await AsyncStorage.setItem('userLevel', 'intermediate');
        await AsyncStorage.setItem('currentTier', 'basic');
        router.replace('/WelcomeScreen');
      } else {
        // For other languages, go to knowledge check to assess level
        router.replace('/KnowledgeCheckScreen');
      }
    }
  };

  // Use badge-based level naming
  // 0 badges = Beginner, 1 badge = Intermediate, 2+ badges = Advanced
  const getDisplayLevelName = (badgeCount: number): string => {
    if (badgeCount === 0) return 'Beginner Level';
    if (badgeCount === 1) return 'Intermediate Level';
    return 'Advanced Level';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <Text style={styles.title}>✨ Setup Your Learning</Text>

      {/* LANGUAGE */}
      <Text style={styles.q}>Which language do you want to learn?</Text>

      <View style={styles.grid}>
        {['English', 'German', 'Spanish', 'Urdu'].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => { setLanguage(item); setErrorMsg(''); }}
            style={[styles.card, language === item && styles.selectedCard]}
          >
            <Text style={language === item ? styles.selectedText : styles.text}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* TIME */}
      <Text style={styles.q}>Daily study time?</Text>

      <View style={styles.grid}>
        {['15 min', '30 min', '1 hr', '2 hr'].map((item) => (
          <TouchableOpacity
            key={item}
            onPress={() => { setTime(item); setErrorMsg(''); }}
            style={[styles.card, time === item && styles.selectedCard]}
          >
            <Text style={time === item ? styles.selectedText : styles.text}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* GOAL */}
      <Text style={styles.q}>Your goal?</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.cardSmall, goal === 'Compete' && styles.selectedCard]}
          onPress={() => { setGoal('Compete'); setErrorMsg(''); }}
        >
          <Text style={goal === 'Compete' ? styles.selectedText : styles.text}>
            Compete
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cardSmall, goal === 'Streak' && styles.selectedCard]}
          onPress={() => { setGoal('Streak'); setErrorMsg(''); }}
        >
          <Text style={goal === 'Streak' ? styles.selectedText : styles.text}>
            Streaks
          </Text>
        </TouchableOpacity>
      </View>

      {/* NOTIFICATIONS */}
      <Text style={styles.q}>Enable reminders?</Text>

      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.cardSmall, notify === 'Yes' && styles.selectedCard]}
          onPress={() => { setNotify('Yes'); setErrorMsg(''); }}
        >
          <Text style={notify === 'Yes' ? styles.selectedText : styles.text}>
            Yes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cardSmall, notify === 'No' && styles.selectedCard]}
          onPress={() => { setNotify('No'); setErrorMsg(''); }}
        >
          <Text style={notify === 'No' ? styles.selectedText : styles.text}>
            No
          </Text>
        </TouchableOpacity>
      </View>

      {/* ERROR MESSAGE */}
      {errorMsg !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      {/* BUTTON */}
      <TouchableOpacity style={styles.btn} onPress={finish}>
        <Text style={styles.btnText}>Continue</Text>
      </TouchableOpacity>

      {/* Resume Progress Modal */}
      <Modal visible={showResumeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>📚</Text>
            <Text style={styles.modalTitle}>Welcome Back!</Text>
            <Text style={styles.modalSubtitle}>
              You have saved progress in {language}:{'\n\n'}
              Level: {getDisplayLevelName(savedProgress?.beginnerBadgeCount || 0)}{'\n'}
              Current Lesson: {(savedProgress?.beginnerLessonIndex || 0) + 1}{'\n'}
              Badges Earned: {savedProgress?.beginnerBadgeCount || 0}{'\n'}
              XP: {savedProgress?.xp || 0}
            </Text>

            <TouchableOpacity 
              style={styles.modalBtnPrimary} 
              onPress={() => proceedToLearning(true)}
            >
              <Text style={styles.modalBtnPrimaryText}>Continue Where I Left Off</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.modalBtnSecondary} 
              onPress={() => proceedToLearning(false)}
            >
              <Text style={styles.modalBtnSecondaryText}>Start From Beginning</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFE4EC',
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#FF3D7F',
  },
  q: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  card: {
    width: '48%',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 15,
    marginTop: 10,
    alignItems: 'center',
    elevation: 2,
  },
  cardSmall: {
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 15,
    marginTop: 10,
    width: '40%',
    alignItems: 'center',
    elevation: 2,
  },
  selectedCard: {
    backgroundColor: '#FF6FA1',
  },
  text: {
    color: '#444',
    fontWeight: '500',
  },
  selectedText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorBox: {
    backgroundColor: '#FF3D7F',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  btn: {
    backgroundColor: '#FF6FA1',
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    elevation: 10,
  },
  modalEmoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF3D7F',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalBtnPrimary: {
    backgroundColor: '#FF3D7F',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalBtnPrimaryText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBtnSecondary: {
    backgroundColor: '#FFE4EC',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnSecondaryText: {
    color: '#FF3D7F',
    fontWeight: 'bold',
    fontSize: 15,
  },
});