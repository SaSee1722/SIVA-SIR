import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Image, Linking, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { UploadedFile } from '@/types';
import { colors, typography, borderRadius, spacing, shadows } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

interface FileListProps {
  files: UploadedFile[];
  role?: 'student' | 'staff';
  showStudentInfo?: boolean;
  onDelete?: (fileId: string) => void;
}

export function FileList({ files, role = 'student', showStudentInfo = false, onDelete }: FileListProps) {
  const theme = role === 'student' ? colors.student : colors.staff;
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  const handleDownload = async (file: UploadedFile) => {
    if (!file.thumbnailUri) return;

    setDownloadingId(file.id);
    try {
      const filename = file.fileName;
      // Use cacheDirectory or documentDirectory with a clean name
      const fileUri = FileSystem.documentDirectory + filename.replace(/\s+/g, '_');

      const downloadResumable = FileSystem.createDownloadResumable(
        file.thumbnailUri,
        fileUri,
        {}
      );

      const result = await downloadResumable.downloadAsync();

      if (result && result.uri) {
        const isImage = file.fileType.includes('image');
        const isVideo = file.fileType.includes('video');

        if (isImage || isVideo) {
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status === 'granted') {
            await MediaLibrary.createAssetAsync(result.uri);
            setDownloadedIds(prev => new Set(prev).add(file.id));
            Alert.alert('Success', 'File saved to Gallery! ✨');
          } else {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(result.uri);
            }
          }
        } else {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(result.uri);
            setDownloadedIds(prev => new Set(prev).add(file.id));
          } else {
            Alert.alert('Success', 'File downloaded successfully');
          }
        }
      }
    } catch (error: any) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setDownloadingId(null);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return 'image';
    if (fileType.includes('video')) return 'videocam';
    if (fileType.includes('pdf')) return 'picture-as-pdf';
    return 'insert-drive-file';
  };

  const getFileGradient = (fileType: string): readonly [string, string, ...string[]] => {
    if (fileType.includes('image')) return ['#F87171', '#EF4444'];
    if (fileType.includes('video')) return ['#A78BFA', '#8B5CF6'];
    if (fileType.includes('pdf')) return ['#FB923C', '#F97316'];
    return ['#60A5FA', '#3B82F6'];
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (files.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.common.white }, shadows.sm]}>
        <View style={styles.emptyIconCircle}>
          <MaterialIcons name="folder-open" size={48} color={colors.common.gray400} />
        </View>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          No files uploaded yet
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.common.gray400 }]}>
          Your uploaded documents will appear here
        </Text>
      </View>
    );
  }

  return (
    <>
      <FlatList
        data={files}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => setPreviewFile(item)}
            style={({ pressed }) => [
              styles.fileCard,
              { backgroundColor: colors.common.white },
              shadows.sm,
              pressed && styles.cardPressed
            ]}
          >
            {item.fileType.includes('image') && item.thumbnailUri ? (
              <Image
                source={{ uri: item.thumbnailUri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={getFileGradient(item.fileType)}
                style={styles.iconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name={getFileIcon(item.fileType) as any} size={28} color={colors.common.white} />
              </LinearGradient>
            )}

            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                {item.fileName}
              </Text>
              {showStudentInfo && (
                <View style={styles.studentBadge}>
                  <MaterialIcons name="person" size={14} color={theme.primary} />
                  <Text style={[styles.studentName, { color: theme.primary }]}>
                    {item.studentName}
                  </Text>
                </View>
              )}
              <View style={styles.fileMetaRow}>
                <View style={[styles.metaChip, { backgroundColor: theme.surfaceLight }]}>
                  <MaterialIcons name="storage" size={12} color={theme.textSecondary} />
                  <Text style={[styles.fileDetails, { color: theme.textSecondary }]}>
                    {formatFileSize(item.fileSize)}
                  </Text>
                </View>
                <View style={[styles.metaChip, { backgroundColor: theme.surfaceLight }]}>
                  <MaterialIcons name="calendar-today" size={12} color={theme.textSecondary} />
                  <Text style={[styles.fileDetails, { color: theme.textSecondary }]}>
                    {formatDate(item.uploadedAt)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              {role === 'staff' && (
                <Pressable
                  onPress={() => handleDownload(item)}
                  disabled={downloadingId === item.id}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { backgroundColor: downloadedIds.has(item.id) ? '#DCFCE7' : '#F0F9FF' },
                    pressed && styles.pressed,
                  ]}
                  hitSlop={8}
                >
                  {downloadingId === item.id ? (
                    <ActivityIndicator size="small" color="#16A34A" />
                  ) : downloadedIds.has(item.id) ? (
                    <MaterialIcons name="check-circle" size={22} color="#16A34A" />
                  ) : (
                    <MaterialIcons name="cloud-download" size={20} color="#0EA5E9" />
                  )}
                </Pressable>
              )}

              <Pressable
                onPress={() => setPreviewFile(item)}
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: theme.surfaceLight },
                  pressed && styles.pressed,
                ]}
                hitSlop={8}
              >
                <MaterialIcons name="fullscreen" size={22} color={theme.primary} />
              </Pressable>

              {onDelete && (role === 'student') && (
                <Pressable
                  onPress={() => onDelete(item.id)}
                  style={({ pressed }) => [
                    styles.actionButton,
                    { backgroundColor: '#FEE2E2' },
                    pressed && styles.pressed,
                  ]}
                  hitSlop={8}
                >
                  <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                </Pressable>
              )}
            </View>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

      {/* Fullscreen Preview Modal */}
      <Modal
        visible={!!previewFile}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setPreviewFile(null)}
      >
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle} numberOfLines={1}>{previewFile?.fileName}</Text>
            <Pressable onPress={() => setPreviewFile(null)} style={styles.previewClose}>
              <MaterialIcons name="close" size={28} color={colors.common.white} />
            </Pressable>
          </View>

          <View style={styles.previewContent}>
            {previewFile?.fileType.includes('image') ? (
              <Image
                source={{ uri: previewFile.thumbnailUri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            ) : (
              <WebView
                source={{ uri: previewFile?.thumbnailUri || '' }}
                style={styles.fullWeb}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderRadius: borderRadius.xl,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.common.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cardPressed: {
    backgroundColor: colors.common.gray100,
    transform: [{ scale: 0.98 }],
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.common.gray100,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  studentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.xs,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
  },
  fileMetaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  fileDetails: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.common.black,
  },
  previewHeader: {
    height: 80,
    paddingTop: 40,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  previewTitle: {
    color: colors.common.white,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.md,
  },
  previewClose: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  fullWeb: {
    width: width,
    height: height - 80,
    backgroundColor: 'transparent',
  },
});
