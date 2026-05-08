import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');

    if (!email) {
      setErrorMsg('⚠️ Please enter your email!');
      return;
    }
    if (!password) {
      setErrorMsg('⚠️ Please enter your password!');
      return;
    }

    const savedEmail = await AsyncStorage.getItem('userEmail');
    const savedPassword = await AsyncStorage.getItem('userPassword');

    if (!savedEmail) {
      setErrorMsg('⚠️ No account found. Please sign up first!');
      return;
    }

    if (email !== savedEmail || password !== savedPassword) {
      setErrorMsg('⚠️ Incorrect email or password!');
      return;
    }

    await AsyncStorage.setItem('isLoggedIn', 'true');

    // Always go to OnboardingQuestions so user can select language
    // The OnboardingQuestions screen will check for existing progress in the selected language
    // and offer to resume or start fresh
    router.replace('/OnboardingQuestions');
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Welcome Back 👋</Text>
      <Text style={styles.subtitle}>Login to continue learning</Text>

      <TextInput
        placeholder="Email"
        style={styles.input}
        onChangeText={(val) => { setEmail(val); setErrorMsg(''); }}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        style={styles.input}
        onChangeText={(val) => { setPassword(val); setErrorMsg(''); }}
      />

      {errorMsg !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.btn} onPress={handleLogin}>
        <Text style={styles.btnText}>Login</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.line} />
      </View>

      <Text style={styles.signupText}>Don't have an account?</Text>
      <TouchableOpacity style={styles.btnOutline} onPress={() => router.push('/SignUpScreen')}>
        <Text style={styles.btnOutlineText}>Create Account</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFE4EC',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FF3D7F',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: 'gray',
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 15,
  },
  errorBox: {
    backgroundColor: '#FF3D7F',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  btn: {
    backgroundColor: '#FF6FA1',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  btnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#FFB6C1',
  },
  orText: {
    marginHorizontal: 10,
    color: 'gray',
    fontWeight: 'bold',
  },
  signupText: {
    textAlign: 'center',
    color: 'gray',
    marginBottom: 10,
    fontSize: 14,
  },
  btnOutline: {
    borderWidth: 2,
    borderColor: '#FF6FA1',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnOutlineText: {
    color: '#FF6FA1',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
