import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import GoldButton from '../components/GoldButton';
import { supabase } from '../lib/supabase';
import { logActivity, LOG_ACTIONS } from '../utils/activityLogger';
import { PASSWORD_RESET_REDIRECT } from '../constants/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllUserData, LAST_LOGGED_IN_USER_ID_KEY } from '../utils/clearUserData';

const GOLD = '#F5C842';
const INPUT_BG = 'rgba(27,47,107,0.5)';

export default function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  const inputBorder = (field) => ({
    borderColor: focusedField === field ? GOLD : 'rgba(245,200,66,0.25)',
    borderWidth: 1,
  });

  const handleSignUp = async () => {
    resetMessages();
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in name, email, and password.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      const user = data.user;
      if (!user) {
        setError('Could not create account. Try again.');
        return;
      }
      const phoneGh = phone.trim() ? `+233${phone.replace(/^\+233/, '').replace(/\D/g, '')}` : null;
      const { error: profileError } = await supabase.from('users').insert({
        id: user.id,
        email: email.trim(),
        full_name: fullName.trim(),
        phone_gh: phoneGh,
      });
      if (profileError) {
        setError(profileError.message);
        return;
      }
      await clearAllUserData();
      await AsyncStorage.setItem(LAST_LOGGED_IN_USER_ID_KEY, user.id);
      if (!data.session) {
        setInfo('Check your email to confirm your account, then log in.');
        setMode('login');
      }
    } catch (e) {
      setError(e.message ?? 'Sign up failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    resetMessages();
    if (!email.trim() || !password) {
      setError('Enter email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (loginError) {
        setError(loginError.message);
      } else if (data?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', data.user.id)
          .single();

        await logActivity({
          actorId: data.user.id,
          actorEmail: data.user.email,
          actorName: profile?.full_name || data.user.email,
          actorType: 'user',
          action: LOG_ACTIONS.AUTH_LOGIN,
          category: 'auth',
          description: `${profile?.full_name || 'User'} logged in to app`,
          metadata: {
            platform: Platform.OS,
            user_name: profile?.full_name,
          },
          status: 'success',
        });
      }
    } catch (e) {
      setError(e.message ?? 'Log in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail || !resetEmail.includes('@')) {
      setResetError('Please enter a valid email address');
      return;
    }

    setResetLoading(true);
    setResetError('');

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: PASSWORD_RESET_REDIRECT,
      });

      if (resetErr) {
        setResetError(resetErr.message);
      } else {
        setResetSent(true);
      }
    } catch {
      setResetError('Something went wrong. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const onSubmit = mode === 'signup' ? handleSignUp : handleLogin;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require('../../assets/icon.png')}
            style={{
              width: 120,
              height: 120,
              borderRadius: 24,
              marginBottom: 16,
              alignSelf: 'center',
            }}
            resizeMode="contain"
          />
          <Text
            style={{
              color: 'white',
              fontSize: 28,
              fontWeight: '900',
              textAlign: 'center',
              marginBottom: 4,
              letterSpacing: -0.5,
            }}
          >
            Sankofa Fit
          </Text>
          <Text
            style={{
              color: '#F5C842',
              fontSize: 14,
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: 40,
              letterSpacing: 1,
            }}
          >
            Reclaim your strength
          </Text>

          <Text style={styles.formTitle}>
            {showForgotPassword && mode === 'login'
              ? 'Reset Password'
              : mode === 'signup'
                ? 'Create Account'
                : 'Welcome Back'}
          </Text>

          {showForgotPassword && mode === 'login' ? (
            <View style={styles.forgotWrap}>
              <TouchableOpacity
                onPress={() => {
                  setShowForgotPassword(false);
                  setResetEmail('');
                  setResetSent(false);
                  setResetError('');
                }}
                style={styles.forgotBackRow}
              >
                <Ionicons name="arrow-back" size={20} color="white" />
                <Text style={styles.forgotBackText}>Back to Login</Text>
              </TouchableOpacity>

              {!resetSent ? (
                <>
                  <View style={styles.forgotIconCircle}>
                    <Ionicons name="lock-open-outline" size={32} color={GOLD} />
                  </View>

                  <Text style={styles.forgotTitle}>Reset Password</Text>
                  <Text style={styles.forgotSubtitle}>
                    Enter your email address and we'll send you a link to reset your password.
                  </Text>

                  <Text style={styles.label}>Email Address</Text>
                  <View style={[styles.inputWithIcon, inputBorder('resetEmail')]}>
                    <Ionicons name="mail-outline" size={18} color="#6B7B99" style={styles.inputIcon} />
                    <TextInput
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      placeholder="your@email.com"
                      placeholderTextColor="#6B7B99"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.inputWithIconField}
                      onFocus={() => setFocusedField('resetEmail')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>

                  {resetError ? <Text style={styles.errorText}>{resetError}</Text> : null}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleForgotPassword}
                    disabled={resetLoading}
                    style={[styles.forgotPrimaryBtn, resetLoading && styles.forgotPrimaryBtnDisabled]}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#1B2F6B" />
                    ) : (
                      <Text style={styles.forgotPrimaryBtnText}>Send Reset Link</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.forgotSuccessCircle}>
                    <Ionicons name="checkmark-circle" size={48} color="#30D158" />
                  </View>

                  <Text style={styles.forgotTitle}>Email Sent! 📧</Text>
                  <Text style={styles.forgotSubtitle}>We sent a password reset link to:</Text>
                  <Text style={styles.forgotEmailHighlight}>{resetEmail}</Text>
                  <Text style={styles.forgotHint}>
                    Check your inbox and click the link to reset your password. The link expires in 1 hour.
                  </Text>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setResetSent(false);
                      setResetError('');
                    }}
                    style={styles.forgotPrimaryBtn}
                  >
                    <Text style={styles.forgotPrimaryBtnText}>Back to Login</Text>
                  </TouchableOpacity>

                  <TouchableOpacity activeOpacity={0.75} onPress={handleForgotPassword} style={styles.forgotResend}>
                    <Text style={styles.forgotResendText}>
                      Didn't receive it? <Text style={styles.forgotResendLink}>Resend email</Text>
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <>
          {mode === 'signup' ? (
            <>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Kwame Mensah"
                placeholderTextColor="rgba(255,255,255,0.35)"
                style={[styles.input, inputBorder('name')]}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
              />
            </>
          ) : null}

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={[styles.input, inputBorder('email')]}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {mode === 'signup' ? (
            <>
              <Text style={styles.label}>Phone (Ghana)</Text>
              <View style={[styles.phoneRow, inputBorder('phone')]}>
                <Text style={styles.phonePrefix}>+233</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="24 123 4567"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  style={styles.phoneInput}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="phone-pad"
                />
              </View>
            </>
          ) : null}

          <Text style={styles.label}>Password</Text>
          <View style={[styles.passwordRow, inputBorder('password')]}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.passwordInput}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color="rgba(255,255,255,0.5)"
              />
            </Pressable>
          </View>

          {mode === 'login' ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                setResetEmail(email.trim());
                setResetError('');
                setResetSent(false);
                setShowForgotPassword(true);
              }}
              style={styles.forgotPasswordLink}
            >
              <Text style={styles.forgotPasswordLinkText}>Forgot Password?</Text>
            </TouchableOpacity>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {info ? <Text style={styles.infoText}>{info}</Text> : null}

          {submitting ? (
            <ActivityIndicator color={GOLD} style={styles.loader} />
          ) : (
            <GoldButton
              label={mode === 'signup' ? 'Create Account' : 'Log In'}
              onPress={onSubmit}
              fullWidth
              haptic="light"
              style={styles.primaryBtn}
            />
          )}

          <Pressable
            onPress={() => {
              resetMessages();
              setShowForgotPassword(false);
              setResetEmail('');
              setResetSent(false);
              setResetError('');
              setMode(mode === 'login' ? 'signup' : 'login');
            }}
            disabled={submitting}
          >
            <Text style={styles.toggleLink}>
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Log in'}
            </Text>
          </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#080C1C',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  formTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    padding: 14,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 14,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  phonePrefix: {
    color: GOLD,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: 16,
  },
  forgotPasswordLinkText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
  },
  forgotWrap: {
    width: '100%',
  },
  forgotBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 24,
  },
  forgotBackText: {
    color: 'white',
    fontSize: 14,
  },
  forgotIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245,200,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  forgotSuccessCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(48,209,88,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  forgotTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  forgotSubtitle: {
    color: '#6B7B99',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  forgotEmailHighlight: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  forgotHint: {
    color: '#6B7B99',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputWithIconField: {
    flex: 1,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
  },
  forgotPrimaryBtn: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  forgotPrimaryBtnDisabled: {
    backgroundColor: 'rgba(245,200,66,0.5)',
  },
  forgotPrimaryBtnText: {
    color: '#1B2F6B',
    fontSize: 16,
    fontWeight: '800',
  },
  forgotResend: {
    marginTop: 16,
    alignItems: 'center',
  },
  forgotResendText: {
    color: '#6B7B99',
    fontSize: 13,
  },
  forgotResendLink: {
    color: GOLD,
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  infoText: {
    color: '#30D158',
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
  },
  loader: {
    marginVertical: 20,
  },
  primaryBtn: {
    marginTop: 16,
  },
  link: {
    color: GOLD,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
  },
  toggleLink: {
    color: GOLD,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 24,
  },
});
