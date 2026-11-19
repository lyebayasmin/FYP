import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { authStyles as s } from '../components/authStyles';
import { checkEmail } from './utils/email';
import { findAccount, saveAccount, startSession } from './utils/auth';


export default function SignUpScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setFormError('');
    if (!name.trim() || !email.trim() || !password) {
      setFormError('Please fill in all fields.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailProblem = checkEmail(cleanEmail);
    if (emailProblem) {
      setFormError(emailProblem);
      return;
    }
    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (await findAccount(cleanEmail)) {
        setFormError('An account with this email already exists. Please log in.');
        return;
      }
      const account = { name: name.trim(), email: cleanEmail, password };
      await saveAccount(account); // throws if it could not be stored
      await AsyncStorage.removeItem('userData'); // new account = fresh onboarding choices
      await startSession(account);
      router.replace('/HomeScreen');
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.headerContainer}>
          <Text style={s.title}>Create Account 🌸</Text>
          <Text style={s.subtitle}>Join LinguaBloom and start learning!</Text>
        </View>

        <View style={s.inputContainer}>
          <Text style={s.inputLabel}>Full Name</Text>
          <TextInput
            placeholder="Enter your full name"
            placeholderTextColor="#64748B"
            style={s.input}
            value={name}
            onChangeText={(v) => { setName(v); setFormError(''); }}
            maxLength={50}
          />
        </View>

        <View style={s.inputContainer}>
          <Text style={s.inputLabel}>Email Address</Text>
          <TextInput
            placeholder="name@example.com"
            placeholderTextColor="#64748B"
            style={s.input}
            value={email}
            onChangeText={(v) => { setEmail(v); setFormError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            maxLength={254}
          />
        </View>

        <View style={s.inputContainer}>
          <Text style={s.inputLabel}>Password</Text>
          <View style={s.passwordRow}>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor="#64748B"
              secureTextEntry={!showPw}
              style={[s.input, { flex: 1, paddingRight: 64 }]}
              value={password}
              onChangeText={(v) => { setPassword(v); setFormError(''); }}
              autoCapitalize="none"
              maxLength={128}
            />
            <TouchableOpacity style={s.showBtn} onPress={() => setShowPw((v) => !v)}>
              <Text style={s.showText}>{showPw ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {formError !== '' && (
          <View style={s.errorBox}>
            <Text style={s.errorText}>⚠️ {formError}</Text>
          </View>
        )}

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Create Account</Text>}
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={s.line} />
          <Text style={s.orText}>OR</Text>
          <View style={s.line} />
        </View>

        <Text style={s.footerText}>Already have an account?</Text>
        <TouchableOpacity style={s.btnOutline} onPress={() => router.replace('/loginScreen')}>
          <Text style={s.btnOutlineText}>Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
