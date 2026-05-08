import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignUpScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async () => {
    setErrorMsg('');

    if (!name) {
      setErrorMsg('⚠️ Please enter your name!');
      return;
    }
    if (!email) {
      setErrorMsg('⚠️ Please enter your email!');
      return;
    }
    if (!password) {
      setErrorMsg('⚠️ Please enter a password!');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('⚠️ Password must be at least 6 characters!');
      return;
    }

    // Check if email already registered
    const savedEmail = await AsyncStorage.getItem('userEmail');
    if (savedEmail === email) {
      setErrorMsg('⚠️ This email is already registered! Please login instead.');
      return;
    }

    // ✅ Save user credentials and mark as logged in
    await AsyncStorage.setItem('userName', name);
    await AsyncStorage.setItem('userEmail', email);
    await AsyncStorage.setItem('userPassword', password);
    await AsyncStorage.setItem('isLoggedIn', 'true');

    router.replace('/OnboardingQuestions');
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Create Account 🌸</Text>
      <Text style={styles.subtitle}>Join LinguaBloom and start learning!</Text>

      <TextInput
        placeholder="Full Name"
        style={styles.input}
        onChangeText={(val) => { setName(val); setErrorMsg(''); }}
      />
      <TextInput
        placeholder="Email"
        style={styles.input}
        onChangeText={(val) => { setEmail(val); setErrorMsg(''); }}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password (min 6 characters)"
        secureTextEntry
        style={styles.input}
        onChangeText={(val) => { setPassword(val); setErrorMsg(''); }}
      />

      {errorMsg !== '' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.btn} onPress={handleSignup}>
        <Text style={styles.btnText}>Create Account</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.line} />
      </View>

      <Text style={styles.loginText}>Already have an account?</Text>
      <TouchableOpacity style={styles.btnOutline} onPress={() => router.replace('/loginScreen')}>
        <Text style={styles.btnOutlineText}>Login</Text>
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
  loginText: {
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
