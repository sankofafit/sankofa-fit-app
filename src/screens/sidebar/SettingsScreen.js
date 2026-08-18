import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { runLogoutCleanup } from '../../utils/clearUserData';
import { PASSWORD_RESET_REDIRECT } from '../../constants/auth';
import SidebarFullScreenShell from './SidebarFullScreenShell';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';
import {
  scheduleDailyMorningNotification,
  cancelMorningNotification,
  getNotificationStatus,
  sendTestNotification,
  loadNotificationSettings,
  saveNotificationSettings,
} from '../../utils/notifications';
import { useUser } from '../../context/UserContext';

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value, onPress, right }) {
  return (
    <TouchableOpacity delayPressIn={0} style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={0.75}>
      <Text style={styles.rowLabel}>{label}</Text>
      {right ?? (value ? <Text style={styles.rowValue}>{value}</Text> : null)}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={Colors.SLATE} /> : null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ onClose }) {
  const insets = useSafeAreaInsets();
  const { userData } = useUser();
  const [locationOn, setLocationOn] = useState(true);
  const [sheet, setSheet] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    loadNotificationStatus();
  }, []);

  const loadNotificationStatus = async () => {
    const status = await getNotificationStatus();
    setNotificationsEnabled(status.enabled);
  };

  const handleToggleNotifications = async (value) => {
    setNotifLoading(true);
    try {
      const firstName = userData?.full_name?.split(' ')[0] || 'Champion';
      const current = await loadNotificationSettings();
      if (value) {
        const success = await scheduleDailyMorningNotification(firstName);
        setNotificationsEnabled(success);
        if (success) {
          await saveNotificationSettings({ ...current, morning: true });
          Alert.alert(
            '🔔 Notifications On!',
            "You'll receive a motivational message every morning at 7AM.",
            [{ text: 'Great!' }],
          );
        } else {
          Alert.alert(
            'Permission Required',
            'Please enable notifications for Sankofa Fit in your phone Settings.',
            [{ text: 'OK' }],
          );
        }
      } else {
        await cancelMorningNotification();
        await saveNotificationSettings({ ...current, morning: false });
        setNotificationsEnabled(false);
      }
    } finally {
      setNotifLoading(false);
    }
  };

  const handleTestNotification = async () => {
    const firstName = userData?.full_name?.split(' ')[0] || 'Champion';
    const sent = await sendTestNotification(firstName);
    if (sent) {
      Alert.alert('🔔 Test Sent!', "You'll receive a notification in 3 seconds.", [{ text: 'OK' }]);
    }
  };

  const updatePassword = async () => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setSheet(null);
    setNewPassword('');
    setCurrentPassword('');
    Alert.alert('Password updated');
  };

  const updateEmail = async () => {
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    setSheet(null);
    setNewEmail('');
    Alert.alert('Check your inbox to confirm the new email.');
  };

  const handleResetPasswordEmail = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      return;
    }

    Alert.alert('Reset Password', `We'll send a password reset link to:\n${user.email}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Reset Link',
        onPress: async () => {
          const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
            redirectTo: PASSWORD_RESET_REDIRECT,
          });
          if (error) {
            Alert.alert('Error', error.message);
          } else {
            Alert.alert('Email Sent! 📧', 'Check your inbox for the password reset link.', [
              { text: 'OK' },
            ]);
          }
        },
      },
    ]);
  };

  return (
    <>
      <SidebarFullScreenShell title="SETTINGS" onClose={onClose}>
        <Section title="APPEARANCE">
          <Row label="App Theme" value="Auto (follows phone)" right={<Ionicons name="phone-portrait-outline" size={18} color={Colors.SLATE} />} />
          <Row label="Text Size" value="Normal" onPress={() => Alert.alert('Text size', 'Text size options coming soon.')} />
        </Section>

        <Section title="PRIVACY">
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Location Access</Text>
            <Switch value={locationOn} onValueChange={setLocationOn} trackColor={{ true: 'rgba(245,200,66,0.4)' }} thumbColor={locationOn ? GOLD : '#ccc'} />
          </View>
          <Row label="Motion & Fitness (Steps)" onPress={() => Linking.openURL('app-settings:')} />
        </Section>

        <Section title="NOTIFICATIONS">
          <View style={styles.notifRow}>
            <View style={styles.notifRowLeft}>
              <View style={styles.notifIconWrap}>
                <Ionicons name="notifications-outline" size={18} color="#F5C842" />
              </View>
              <View>
                <Text style={styles.notifTitle}>Morning Motivation</Text>
                <Text style={styles.notifSub}>Daily at 7AM Ghana time</Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              disabled={notifLoading}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(245,200,66,0.4)' }}
              thumbColor={notificationsEnabled ? '#F5C842' : '#6B7B99'}
            />
          </View>
          {notificationsEnabled ? (
            <TouchableOpacity delayPressIn={0} activeOpacity={0.75} style={styles.notifTestRow} onPress={handleTestNotification}>
              <View style={styles.notifIconWrapGreen}>
                <Ionicons name="send-outline" size={18} color="#30D158" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>Send Test Notification</Text>
                <Text style={styles.notifSub}>Receive a test message in 3 seconds</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.SLATE} />
            </TouchableOpacity>
          ) : null}
        </Section>

        <Section title="ACCOUNT">
          <Row label="Change Password" onPress={handleResetPasswordEmail} />
          <Row label="Change Email" onPress={() => setSheet('email')} />
        </Section>

        <Section title="ABOUT">
          <Row label="App Version" value="Sankofa Fit v1.0.0" />
          <Row label="Terms of Service" onPress={() => Linking.openURL('https://sankofafit.com/terms')} />
          <Row label="Privacy Policy" onPress={() => Linking.openURL('https://sankofafit.com/privacy')} />
        </Section>

        <Section title="DANGER ZONE">
          <TouchableOpacity delayPressIn={0}
            onPress={() =>
              Alert.alert(
                'Delete Account',
                'This will permanently delete your account and all data. This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await runLogoutCleanup();
                      await supabase.auth.signOut();
                    },
                  },
                ],
              )
            }
          >
            <Text style={styles.dangerText}>Delete Account</Text>
          </TouchableOpacity>
        </Section>
      </SidebarFullScreenShell>

      <Modal visible={!!sheet} transparent animationType="slide">
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalOverlay} onPress={() => setSheet(null)} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={styles.sheetTitle}>
              {sheet === 'password' ? 'Update password' : 'Change email'}
            </Text>
            {sheet === 'password' ? (
              <>
                <TextInput
                  secureTextEntry
                  placeholder="Current password"
                  placeholderTextColor={Colors.SLATE}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  style={styles.input}
                />
                <TextInput
                  secureTextEntry
                  placeholder="New password"
                  placeholderTextColor={Colors.SLATE}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  style={styles.input}
                />
                <TouchableOpacity delayPressIn={0} style={styles.goldBtn} onPress={updatePassword}>
                  <Text style={styles.goldBtnText}>Update Password</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="New email"
                  placeholderTextColor={Colors.SLATE}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  style={styles.input}
                />
                <TouchableOpacity delayPressIn={0} style={styles.goldBtn} onPress={updateEmail}>
                  <Text style={styles.goldBtnText}>Update Email</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: { color: GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  rowLabel: { flex: 1, color: Colors.WHITE, fontWeight: '600' },
  rowValue: { color: Colors.SLATE, fontSize: 13 },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  notifTestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  notifRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(245,200,66,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIconWrapGreen: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(48,209,88,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitle: { color: Colors.WHITE, fontSize: 14, fontWeight: '600' },
  notifSub: { color: Colors.SLATE, fontSize: 11, marginTop: 2 },
  dangerText: { color: '#EF4444', fontWeight: '700', paddingVertical: 12 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: '#0D1B45', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  sheetTitle: { color: Colors.WHITE, fontWeight: '800', fontSize: 16, marginBottom: 16 },
  input: {
    backgroundColor: 'rgba(27,47,107,0.5)',
    borderRadius: 12,
    padding: 14,
    color: Colors.WHITE,
    marginBottom: 12,
  },
  goldBtn: { backgroundColor: GOLD, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  goldBtnText: { color: '#1B2F6B', fontWeight: '800' },
});
