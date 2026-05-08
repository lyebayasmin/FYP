import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Level names helper
const getLevelName = (level: number): string => {
  if (level <= 3) return 'Beginner';
  if (level <= 6) return 'Intermediate';
  return 'Pro';
};

const getLevelColor = (level: number): string => {
  if (level <= 3) return '#4CAF50';
  if (level <= 6) return '#FF9800';
  return '#9C27B0';
};

const BADGE_ICONS = ['🥉', '🥈', '🥇', '🏅', '🎖️', '👑', '💎', '🌟', '⭐', '🏆'];

export default function ProgressScreen() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [praise, setPraise] = useState('');
  const [beginnerLevel, setBeginnerLevel] = useState(1);
  const [badgeCount, setBadgeCount] = useState(0);

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    const val = await AsyncStorage.getItem('lessonsCompleted');
    const savedBeginnerLevel = await AsyncStorage.getItem('beginnerLevel');
    const savedBadges = await AsyncStorage.getItem('beginnerBadgeCount');
    const beginnerLessons = await AsyncStorage.getItem('beginnerLessonsCompleted');
    
    const total = val ? parseInt(val) : 0;
    const bLevel = savedBeginnerLevel ? parseInt(savedBeginnerLevel) : 1;
    const badges = savedBadges ? parseInt(savedBadges) : 0;
    const bLessons = beginnerLessons ? parseInt(beginnerLessons) : 0;
    
    setCount(bLessons > 0 ? bLessons : total);
    setBeginnerLevel(bLevel);
    setBadgeCount(badges);

    // praise message based on lesson count
    if (total === 0 && bLessons === 0) {
      setPraise("Start your first lesson!");
    } else if ((total + bLessons) % 3 === 0) {
      setPraise(`Amazing! You've completed ${total + bLessons} lessons! Keep it up!`);
    } else if ((total + bLessons) % 3 === 1) {
      setPraise("Great start! Keep going!");
    } else {
      setPraise("You're doing really well! One more for a milestone!");
    }
  };

  const levelName = getLevelName(beginnerLevel);
  const levelColor = getLevelColor(beginnerLevel);
  const currentBadge = badgeCount > 0 ? BADGE_ICONS[Math.min(badgeCount - 1, BADGE_ICONS.length - 1)] : '🎯';

  return (
    <View style={styles.container}>

      <Text style={styles.title}>My Progress</Text>

      {/* Level and Badge Display */}
      <View style={styles.statsRow}>
        <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
          <Text style={styles.levelText}>{levelName}</Text>
        </View>
        <View style={styles.badgeDisplay}>
          <Text style={styles.badgeIcon}>{currentBadge}</Text>
          <Text style={styles.badgeCountText}>{badgeCount} badges</Text>
        </View>
      </View>

      <View style={styles.countBox}>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.label}>Lessons Completed</Text>
      </View>

      {/* ✅ Praise message shown here */}
      <View style={styles.praiseBox}>
        <Text style={styles.praiseText}>{praise}</Text>
      </View>

      {/* ✅ progress bar */}
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${Math.min((count % 3) / 3 * 100, 100)}%` }]} />
      </View>
      <Text style={styles.barLabel}>{count % 3}/3 towards next milestone 🎯</Text>

      <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
        <Text style={styles.btnText}>Go Back</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE4EC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6FA1',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  levelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  badgeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  badgeIcon: {
    fontSize: 20,
  },
  badgeCountText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#8B4513',
  },

  countBox: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    width: '80%',
    elevation: 3,
  },

  count: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#FF3D7F',
  },

  label: {
    fontSize: 14,
    color: 'gray',
    marginTop: 5,
  },

  praiseBox: {
    backgroundColor: '#FF6FA1',
    borderRadius: 15,
    padding: 15,
    width: '90%',
    alignItems: 'center',
    marginBottom: 25,
  },

  praiseText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
    textAlign: 'center',
  },

  barBackground: {
    width: '90%',
    height: 12,
    backgroundColor: '#FFB6C1',
    borderRadius: 10,
    marginBottom: 8,
    overflow: 'hidden',
  },

  barFill: {
    height: '100%',
    backgroundColor: '#FF3D7F',
    borderRadius: 10,
  },

  barLabel: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 30,
  },

  btn: {
    backgroundColor: '#FF6FA1',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },

  btnText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
