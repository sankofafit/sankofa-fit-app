import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
const PRO_NAVY = '#1B2F6B';

export default function ProMemberBadge() {
  return (
    <View style={styles.pill}>
      <Ionicons name="shield-checkmark" size={12} color={PRO_NAVY} />
      <Text style={styles.text}>Pro Member</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#F5C842',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
  },
  text: {
    color: PRO_NAVY,
    fontSize: 11,
    fontWeight: '700',
  },
});
