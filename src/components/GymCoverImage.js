import React from 'react';
import { StyleSheet, View } from 'react-native';
import RemoteImage from './RemoteImage';
import { getGymCoverUri } from '../data/mediaUrls';

export default function GymCoverImage({ gym, height = 160, borderRadius = 12, style }) {
  const uri = getGymCoverUri(gym);
  return (
    <View style={[styles.wrap, { height, borderRadius }, style]}>
      <RemoteImage uri={uri} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.overlay, { borderRadius }]} />
    </View>
  );
}

export function GymHeroCover({ gym, style, children }) {
  const uri = getGymCoverUri(gym);
  return (
    <View style={[styles.hero, style]}>
      <RemoteImage uri={uri} style={StyleSheet.absoluteFillObject} />
      <View style={[StyleSheet.absoluteFillObject, styles.heroOverlay]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  hero: {
    minHeight: 200,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
