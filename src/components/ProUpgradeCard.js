import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const NAVY = '#1B2F6B';
const GOLD = '#F5C842';

export default function ProUpgradeCard({
  onPress,
  headline,
  subtext,
  bullets = [],
  bulletItems,
  style,
  contentStyle,
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.wrap, style]}>
      <LinearGradient
        colors={['#F5C842', '#D4A017', '#F5C842']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, contentStyle]}
      >
        <View style={styles.topRow}>
          <View style={styles.badge}>
            <Ionicons name="star" size={14} color={GOLD} />
            <Text style={styles.badgeText}>PRO FEATURE</Text>
          </View>
          <Ionicons name="lock-closed" size={24} color={NAVY} />
        </View>

        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subtext}>{subtext}</Text>

        {bulletItems?.length
          ? bulletItems.map((item, i) => (
              <View key={`${item.icon}-${i}`} style={styles.bulletRow}>
                <Ionicons name={item.icon} size={15} color={NAVY} />
                <Text style={styles.bulletRowText}>{item.text}</Text>
              </View>
            ))
          : bullets.map((item, i) => (
              <Text key={`${i}-${String(item).slice(0, 12)}`} style={styles.bullet}>
                {item}
              </Text>
            ))}

        <View style={styles.cta}>
          <Ionicons name="flash" size={18} color={GOLD} />
          <Text style={styles.ctaText}>Upgrade to Pro — GHS 70/month</Text>
        </View>

        <Text style={styles.footerNote}>Cancel anytime · MTN MoMo accepted</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
    borderRadius: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: NAVY,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    color: GOLD,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headline: {
    color: NAVY,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 6,
    lineHeight: 26,
  },
  subtext: {
    color: 'rgba(27,47,107,0.75)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  bullet: {
    color: NAVY,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bulletRowText: {
    color: NAVY,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  cta: {
    backgroundColor: NAVY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: GOLD,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footerNote: {
    color: 'rgba(27,47,107,0.6)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
