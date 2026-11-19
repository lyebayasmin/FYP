import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { authStyles as s } from '../components/authStyles';
import { checkEmail } from './utils/email';
import { findAccount, startSession } from './utils/auth';


export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailProblem = checkEmail(cleanEmail);
    if (emailProblem) {
      setErrorMsg(emailProblem);
      return;
    }

    setLoading(true);
    try {
      const user = await findAccount(cleanEmail);
      if (!user) {
        setErrorMsg('No account found with this email. Please create one.');
        return;
      }
      if (user.password !== password) {
        setErrorMsg('Incorrect password. Please try again.');
        return;
      }
      await startSession(user);
      router.replace('/HomeScreen');
    } catch {
      setErrorMsg('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={s.headerContainer}>
          <Text style={s.title}>Welcome Back 👋</Text>
          <Text style={s.subtitle}>Login to continue your learning journey</Text>
        </View>

        <View style={s.inputContainer}>
          <Text style={s.inputLabel}>Email Address</Text>
          <TextInput
            placeholder="name@example.com"
            placeholderTextColor="#64748B"
            style={s.input}
            value={email}
            onChangeText={(v) => { setEmail(v); setErrorMsg(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
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
              onChangeText={(v) => { setPassword(v); setErrorMsg(''); }}
              autoCapitalize="none"
            />
            <TouchableOpacity style={s.showBtn} onPress={() => setShowPw((v) => !v)}>
              <Text style={s.showText}>{showPw ? 'Hide' : 'Show'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {errorMsg !== '' && (
          <View style={[s.errorBox, { marginTop: 12 }]}>
            <Text style={s.errorText}>⚠️ {errorMsg}</Text>
          </View>
        )}

        <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Login</Text>}
        </TouchableOpacity>

        <View style={s.divider}>
          <View style={s.line} />
          <Text style={s.orText}>OR</Text>
          <View style={s.line} />
        </View>

        <Text style={s.footerText}>Don't have an account?</Text>
        <TouchableOpacity style={s.btnOutline} onPress={() => router.push('/SignUpScreen')}>
          <Text style={s.btnOutlineText}>Create Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
