import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserData } from './utils/userStorage';
import grammarLessons from '../data/GrammarLessons.json';

type LanguageKey = 'english' | 'urdu' | 'spanish' | 'german';

export default function GrammarScreen() {
  const router = useRouter();
  const [language, setLanguage] = useState<LanguageKey>('english');
  const [loading, setLoading] = useState(true);
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    const user = await getUserData();
    const lang = (user?.language || 'english').toLowerCase();
    const safeLang: LanguageKey =
      lang === 'spanish' ||
      lang === 'german' ||
      lang === 'urdu' ||
      lang === 'english'
        ? lang
        : 'english';
    setLanguage(safeLang);
    setLoading(false);
  };

  const markComplete = async () => {
    const val = await AsyncStorage.getItem('lessonsCompleted');
    const current = val ? parseInt(val) : 0;
    await AsyncStorage.setItem('lessonsCompleted', String(current + 1));
    await AsyncStorage.setItem('lastLessonDate', new Date().toDateString());

    // Show quiz prompt
    setShowQuizPrompt(true);
  };

  const handleQuizYes = () => {
    setShowQuizPrompt(false);
    router.replace('/QuizScreen?type=grammar');
  };

  const handleQuizNo = () => {
    setShowQuizPrompt(false);
    router.replace('/LessonTypeScreen');
  };

  const filteredLessons = grammarLessons.filter(
    (item) => item.language === language
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Loading Grammar...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>📐 Grammar Lessons</Text>
        <Text style={styles.subtitle}>Language: {language.toUpperCase()}</Text>

        {filteredLessons.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.topicBadge}>
              <Text style={styles.topicText}>{item.topic}</Text>
            </View>

            <Text style={styles.ruleLabel}>Rule:</Text>
            <Text style={styles.rule}>{item.rule}</Text>
            {language !== 'english' && item.rule_translation && (
              <Text style={styles.ruleTranslation}>🇬🇧 {item.rule_translation}</Text>
            )}

            <Text style={styles.exampleLabel}>Example:</Text>
            <Text style={styles.example}>{item.example}</Text>
            {language !== 'english' && item.example_translation && (
              <Text style={styles.exampleTranslation}>🇬🇧 {item.example_translation}</Text>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.completeBtn} onPress={markComplete}>
          <Text style={styles.completeBtnText}>✅ Lesson Completed</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Quiz Prompt Modal */}
      <Modal
        visible={showQuizPrompt}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEmoji}>🎉</Text>
            <Text style={styles.modalTitle}>Lesson Complete!</Text>
            <Text style={styles.modalSubtitle}>
              Ready to test your grammar knowledge?
            </Text>

            <TouchableOpacity style={styles.modalBtnYes} onPress={handleQuizYes}>
              <Text style={styles.modalBtnYesText}>Yes, Take a Quiz! 📐</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtnNo} onPress={handleQuizNo}>
              <Text style={styles.modalBtnNoText}>No, Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE4EC',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FF6FA1',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: 'gray',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
  },
  topicBadge: {
    backgroundColor: '#FF6FA1',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  topicText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  ruleLabel: {
    fontSize: 12,
    color: '#FF3D7F',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  rule: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  exampleLabel: {
    fontSize: 12,
    color: '#FF3D7F',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  example: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  ruleTranslation: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    marginBottom: 6,
  },
  exampleTranslation: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  completeBtn: {
    backgroundColor: '#FF6FA1',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 40,
    alignItems: 'center',
  },
  completeBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFE4EC',
  },
  loading: {
    fontSize: 16,
    color: '#FF6FA1',
  },
  // Modal
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
    lineHeight: 20,
  },
  modalBtnYes: {
    backgroundColor: '#FF6FA1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalBtnYesText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalBtnNo: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  modalBtnNoText: {
    color: '#FF6FA1',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
