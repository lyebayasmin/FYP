import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View, ViewStyle } from 'react-native';

export type MascotMood = 'happy' | 'sad' | 'angry' | 'celebrate';

const IMAGES: Record<MascotMood, any> = {
  happy: require('../assets/images/Mascot/bunny_happy.png'),
  sad: require('../assets/images/Mascot/bunny_sad.png'),
  angry: require('../assets/images/Mascot/bunny_angry.png'),
  celebrate: require('../assets/images/Mascot/bunny_celebrate.png'),
};

type Props = {
  mood: MascotMood;
  size?: number;
  message?: string; // optional speech bubble under the bunny
  style?: ViewStyle;
};

/**
 * The LinguaBloom bunny. Pops in when it appears, then keeps moving:
 *  happy     -> gentle bounce
 *  celebrate -> big jump + wiggle
 *  sad       -> slow droopy sway
 *  angry     -> quick shake (a few times, then stops)
 */
export default function Mascot({ mood, size = 100, message, style }: Props) {
  const pop = useRef(new Animated.Value(0)).current;
  const loop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pop.setValue(0);
    loop.setValue(0);

    Animated.spring(pop, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }).start();

    const duration = mood === 'celebrate' ? 380 : mood === 'angry' ? 70 : mood === 'sad' ? 1300 : 650;
    const cycle = Animated.sequence([
      Animated.timing(loop, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(loop, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]);
    const anim = Animated.loop(cycle, { iterations: mood === 'angry' ? 7 : -1 });
    anim.start();

    return () => anim.stop();
  }, [mood]);

  const range = (a: number, b: number) => loop.interpolate({ inputRange: [0, 1], outputRange: [a, b] });

  const translateY =
    mood === 'celebrate' ? range(0, -size * 0.16)
    : mood === 'happy' ? range(0, -size * 0.07)
    : mood === 'sad' ? range(0, size * 0.03)
    : range(0, 0);

  const translateX = mood === 'angry' ? range(-size * 0.04, size * 0.04) : range(0, 0);

  const rotate =
    mood === 'celebrate' ? loop.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '8deg'] })
    : mood === 'sad' ? loop.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] })
    : mood === 'angry' ? loop.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] })
    : loop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '0deg'] });

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View
        style={{
          opacity: pop,
          transform: [{ scale: pop }, { translateY }, { translateX }, { rotate }],
        }}
      >
        <Image source={IMAGES[mood]} style={{ width: size, height: size }} resizeMode="contain" />
      </Animated.View>
      {message ? (
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'center' },
  bubble: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 280,
  },
  bubbleText: { color: '#0F1A35', fontWeight: '700', fontSize: 13, textAlign: 'center' },
});
