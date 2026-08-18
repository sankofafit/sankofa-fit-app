import * as ImageManipulator from 'expo-image-manipulator';

export const compressImage = async (uri, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
  } = options;

  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: maxWidth,
            height: maxHeight,
          },
        },
      ],
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    );

    console.log('Compressed image URI:', result.uri);
    return result;
  } catch (e) {
    console.log('Compress error:', e);
    return { uri };
  }
};
