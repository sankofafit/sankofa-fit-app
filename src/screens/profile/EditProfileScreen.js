import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../theme/colours';
import { GOLD } from '../../theme/premium';
import ProfileOverlayShell, { useProfileOverlayClose } from './ProfileOverlayShell';
import { profileScreenStyles as ps } from './profileStyles';

export default function EditProfileScreen({ onClose }) {
  return (
    <ProfileOverlayShell title="Edit Profile" onClose={onClose}>
      <EditProfileContent />
    </ProfileOverlayShell>
  );
}

function EditProfileContent() {
  const { userData, refreshUser } = useUser();
  const closeAnimated = useProfileOverlayClose();
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [formData, setFormData] = useState({
    fullName: userData?.full_name || '',
    phone: userData?.phone_gh?.replace('+233', '0') || '',
    age: String(userData?.age || ''),
    height: String(userData?.height_cm || ''),
    weight: String(userData?.weight_kg || ''),
    city: userData?.city || '',
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        fullName: userData.full_name || '',
        phone: userData.phone_gh?.replace('+233', '0') || '',
        age: String(userData.age || ''),
        height: String(userData.height_cm || ''),
        weight: String(userData.weight_kg || ''),
        city: userData.city || '',
      });
    }
  }, [userData]);

  const update = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const inputStyle = (field) => [ps.input, focusedField === field && ps.inputFocused];

  const handleSave = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      Alert.alert('Session expired', 'Please log in again.');
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({
        full_name: formData.fullName,
        phone_gh: formData.phone,
        age: parseInt(formData.age, 10) || null,
        height_cm: parseFloat(formData.height) || null,
        weight_kg: parseFloat(formData.weight) || null,
        city: formData.city || null,
      })
      .eq('id', user.id);

    setLoading(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    await refreshUser();
    Alert.alert('Profile updated! ✓', undefined, [{ text: 'OK', onPress: () => closeAnimated() }]);
  };

  return (
    <View style={ps.bodyPad}>
        <TouchableOpacity delayPressIn={0} activeOpacity={0.75} style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={40} color="rgba(245,200,66,0.5)" />
          </View>
          <Text style={styles.avatarHint}>Tap to change photo (coming soon)</Text>
        </TouchableOpacity>

        <Text style={ps.sectionLabel}>Personal info</Text>

        <Text style={ps.fieldLabel}>Full name</Text>
        <TextInput
          value={formData.fullName}
          onChangeText={(v) => update('fullName', v)}
          style={inputStyle('fullName')}
          onFocus={() => setFocusedField('fullName')}
          onBlur={() => setFocusedField(null)}
          placeholderTextColor="rgba(255,255,255,0.35)"
        />

        <Text style={ps.fieldLabel}>Phone number</Text>
        <TextInput
          value={formData.phone}
          onChangeText={(v) => update('phone', v)}
          style={inputStyle('phone')}
          keyboardType="phone-pad"
          onFocus={() => setFocusedField('phone')}
          onBlur={() => setFocusedField(null)}
          placeholder="+233..."
          placeholderTextColor="rgba(255,255,255,0.35)"
        />

        <Text style={ps.fieldLabel}>Age</Text>
        <TextInput
          value={formData.age}
          onChangeText={(v) => update('age', v.replace(/\D/g, ''))}
          style={inputStyle('age')}
          keyboardType="number-pad"
          onFocus={() => setFocusedField('age')}
          onBlur={() => setFocusedField(null)}
          placeholderTextColor="rgba(255,255,255,0.35)"
        />

        <Text style={ps.fieldLabel}>Height (cm)</Text>
        <TextInput
          value={formData.height}
          onChangeText={(v) => update('height', v.replace(/[^0-9.]/g, ''))}
          style={inputStyle('height')}
          keyboardType="decimal-pad"
          onFocus={() => setFocusedField('height')}
          onBlur={() => setFocusedField(null)}
          placeholderTextColor="rgba(255,255,255,0.35)"
        />

        <Text style={ps.fieldLabel}>Weight (kg)</Text>
        <TextInput
          value={formData.weight}
          onChangeText={(v) => update('weight', v.replace(/[^0-9.]/g, ''))}
          style={inputStyle('weight')}
          keyboardType="decimal-pad"
          onFocus={() => setFocusedField('weight')}
          onBlur={() => setFocusedField(null)}
          placeholderTextColor="rgba(255,255,255,0.35)"
        />

        <Text style={ps.fieldLabel}>City</Text>
        <TextInput
          value={formData.city}
          onChangeText={(v) => update('city', v)}
          style={inputStyle('city')}
          onFocus={() => setFocusedField('city')}
          onBlur={() => setFocusedField(null)}
          placeholder="Accra"
          placeholderTextColor="rgba(255,255,255,0.35)"
        />

        <TouchableOpacity delayPressIn={0}
          style={ps.goldButton}
          activeOpacity={0.75}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#1B2F6B" />
          ) : (
            <Text style={ps.goldButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: GOLD,
    backgroundColor: 'rgba(27,47,107,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    color: Colors.SLATE,
    fontSize: 12,
    marginTop: 8,
  },
});
