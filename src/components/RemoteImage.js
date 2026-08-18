import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

export default function RemoteImage({ uri, style, resizeMode = 'cover', imageStyle }) {
  const [loaded, setLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const flat = StyleSheet.flatten(style) || {};
  const borderRadius = flat.borderRadius ?? 0;
  const showPlaceholder = !loaded || imageError;

  return (
    <View style={[style, styles.clip]}>
      {showPlaceholder ? (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            styles.placeholder,
            { borderRadius },
          ]}
        />
      ) : null}
      {!imageError ? (
        <Image
          source={{ uri }}
          style={[StyleSheet.absoluteFillObject, imageStyle, { borderRadius }]}
          resizeMode={resizeMode}
          onLoad={() => setLoaded(true)}
          onError={() => setImageError(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
    backgroundColor: 'rgba(13,27,69,0.9)',
  },
  placeholder: {
    backgroundColor: 'rgba(13,27,69,0.9)',
  },
});
