import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTrainerPhotoUri } from '../data/mediaUrls';

const PLACEHOLDER = 'rgba(13,27,69,0.95)';

export default function TrainerAvatar({ trainer, size = 70, verified = true }) {
  const uri = getTrainerPhotoUri(trainer);
  const [imageError, setImageError] = useState(false);
  const badge = Math.max(14, Math.round(size * 0.22));
  const radius = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius }]}>
      <View
        style={[
          styles.avatarClip,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderWidth: 2,
            borderColor: '#F5C842',
          },
        ]}
      >
        {!imageError ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size, borderRadius: radius }}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.fallback, { width: size, height: size, borderRadius: radius }]} />
        )}
      </View>
      {verified ? (
        <View
          style={[
            styles.badge,
            { width: badge, height: badge, borderRadius: badge / 2, right: -2, bottom: -2 },
          ]}
        >
          <Ionicons name="checkmark-circle" size={badge} color="#F5C842" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    overflow: 'visible',
  },
  avatarClip: {
    overflow: 'hidden',
    backgroundColor: PLACEHOLDER,
  },
  fallback: {
    backgroundColor: PLACEHOLDER,
  },
  badge: {
    position: 'absolute',
    backgroundColor: '#0D1B45',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
