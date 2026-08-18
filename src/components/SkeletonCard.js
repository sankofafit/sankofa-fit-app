import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

export default function SkeletonCard({
  width = '100%',
  height = 100,
  borderRadius = 16,
  style,
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: 'rgba(27,47,107,0.6)',
          opacity,
        },
        style,
      ]}
    />
  );
}

export function GymCardSkeleton() {
  return (
    <View style={styles.gymSkeleton}>
      <SkeletonCard width="100%" height={160} borderRadius={0} />
      <View style={styles.gymSkeletonBody}>
        <SkeletonCard height={18} width="60%" />
        <SkeletonCard height={13} width="40%" />
        <View style={styles.gymSkeletonTags}>
          <SkeletonCard height={24} width={70} borderRadius={20} />
          <SkeletonCard height={24} width={80} borderRadius={20} />
        </View>
      </View>
    </View>
  );
}

export function TrainerCardSkeleton() {
  return (
    <View style={styles.trainerSkeleton}>
      <SkeletonCard width={60} height={60} borderRadius={30} style={{ flexShrink: 0 }} />
      <View style={styles.trainerSkeletonBody}>
        <SkeletonCard height={18} width="50%" />
        <SkeletonCard height={13} width="70%" />
        <SkeletonCard height={13} width="40%" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gymSkeleton: {
    backgroundColor: 'rgba(27,47,107,0.3)',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  gymSkeletonBody: {
    padding: 14,
    gap: 8,
  },
  gymSkeletonTags: {
    flexDirection: 'row',
    gap: 8,
  },
  trainerSkeleton: {
    backgroundColor: 'rgba(27,47,107,0.3)',
    borderRadius: 16,
    marginBottom: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  trainerSkeletonBody: {
    flex: 1,
    gap: 8,
  },
});
