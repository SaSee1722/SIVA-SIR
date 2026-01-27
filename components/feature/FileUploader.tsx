import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';

interface FileUploaderProps {
  onUpload: (file: {
    fileName: string;
    fileType: string;
    fileSize: number;
    base64Data?: string;
    uri?: string;
  }) => Promise<void>;
  role?: 'student' | 'staff';
  disabled?: boolean;
}

export function FileUploader({ onUpload, role = 'student', disabled = false }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const theme = role === 'student' ? colors.student : colors.staff;

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true, // Enable multiple images
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        setUploading(true);
        try {
          for (const asset of result.assets) {
            await onUpload({
              fileName: asset.fileName || `photo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${asset.uri.split('.').pop()}`,
              fileType: 'image/jpeg',
              fileSize: asset.fileSize || 0,
              base64Data: `data:image/jpeg;base64,${asset.base64}`,
            });
          }
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      console.error('Picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
      setUploading(false);
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true, // Enable multiple documents
      });

      if (!result.canceled && result.assets) {
        setUploading(true);
        try {
          for (const file of result.assets) {
            await onUpload({
              fileName: file.name,
              fileType: file.mimeType || 'application/octet-stream',
              fileSize: file.size || 0,
              uri: file.uri,
            });
          }
        } finally {
          setUploading(false);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
      setUploading(false);
    }
  };

  const isDisabled = uploading || disabled;

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        <Pressable
          onPress={handleImagePicker}
          disabled={isDisabled}
          style={({ pressed }) => [
            styles.uploadCard,
            { backgroundColor: colors.common.white },
            isDisabled && styles.disabled,
            pressed && !isDisabled && styles.pressed,
          ]}
        >
          <LinearGradient
            colors={['#60A5FA', '#3B82F6']}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="image" size={32} color={colors.common.white} />
          </LinearGradient>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Photo</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
            From gallery
          </Text>
        </Pressable>

        <Pressable
          onPress={handleDocumentPicker}
          disabled={isDisabled}
          style={({ pressed }) => [
            styles.uploadCard,
            { backgroundColor: colors.common.white },
            isDisabled && styles.disabled,
            pressed && !isDisabled && styles.pressed,
          ]}
        >
          <LinearGradient
            colors={['#A78BFA', '#8B5CF6']}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="insert-drive-file" size={32} color={colors.common.white} />
          </LinearGradient>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Document</Text>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]}>
            PDF, DOC, etc.
          </Text>
        </Pressable>
      </View>

      {uploading && (
        <View style={styles.uploadOverlay}>
          <LinearGradient
            colors={[theme.primary, theme.primary + 'EE']}
            style={styles.overlayContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialIcons name="cloud-upload" size={24} color={colors.common.white} />
            <Text style={styles.uploadingText}>Uploading your files...</Text>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    position: 'relative',
  },
  container: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  uploadCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    ...shadows.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 13,
    marginTop: 4,
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  overlayContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    ...shadows.lg,
  },
  uploadingText: {
    color: colors.common.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
