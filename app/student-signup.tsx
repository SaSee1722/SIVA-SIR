import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, FlatList, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Screen } from '@/components/layout/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/constants/theme';
import { useAlert } from '@/template';
import { classService } from '@/services/classService';
import { Class } from '@/types';

export default function StudentSignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [year, setYear] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [systemNumber, setSystemNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<Class[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();

  const DEFAULT_YEARS = useMemo(() => ['I YEAR', 'II YEAR', 'III YEAR', 'IV YEAR'], []);

  const loadClasses = useCallback(async () => {
    try {
      const availableClasses = await classService.getAllClasses();
      setClasses(availableClasses);

      const years = new Set<string>(DEFAULT_YEARS);
      availableClasses.forEach(c => {
        if (c.year) years.add(c.year);
      });
      setAvailableYears(Array.from(years).sort());
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  }, [DEFAULT_YEARS]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    if (year) {
      const filtered = classes.filter(c => c.year === year);
      setFilteredClasses(filtered);
      setSelectedClasses(prev => prev.filter(c => filtered.some(f => f.className === c)));
    } else {
      setFilteredClasses([]);
      setSelectedClasses([]);
    }
  }, [year, classes]);

  const handleYearSelect = (selectedYear: string) => {
    setYear(selectedYear);
    setShowYearPicker(false);
  };

  const handleClassToggle = (className: string) => {
    setSelectedClasses(prev =>
      prev.includes(className)
        ? prev.filter(c => c !== className)
        : [...prev, className]
    );
  };

  const handleSignup = async () => {
    if (!name || !email || !password || selectedClasses.length === 0 || !year || !rollNumber || !systemNumber) {
      showAlert('Error', 'Please fill in all fields (Select at least one class)');
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, 'student', {
        name,
        class: selectedClasses.join(', '),
        year,
        rollNumber,
        systemNumber,
      });
      router.replace('/student-dashboard');
    } catch (error: any) {
      if (error.message === 'verification_required') {
        showAlert(
          'Verification Required',
          'Account created! Please check your email and verify your account before logging in.',
          [{ text: 'OK', onPress: () => router.replace('/student-login') }]
        );
      } else if (error.message?.includes('rate limit')) {
        showAlert(
          'Slow Down',
          'Too many signup attempts. Please wait a while before trying again, or use a different email address.',
          [{ text: 'OK' }]
        );
      } else {
        showAlert('Signup Failed', error.message || 'Could not create account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen role="student">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.student.text} />
          </Pressable>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.student.text }]}>Create Student Account</Text>
            <Text style={[styles.subtitle, { color: colors.student.textSecondary }]}>
              Set up your profile to get started
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Full Name"
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              role="student"
            />
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              role="student"
            />
            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Create a strong password"
              secureTextEntry
              role="student"
            />

            <Input
              label="Register Number"
              value={rollNumber}
              onChangeText={setRollNumber}
              placeholder="e.g., 2112001"
              role="student"
            />

            <Input
              label="System Number"
              value={systemNumber}
              onChangeText={setSystemNumber}
              placeholder="e.g., SYS-01"
              role="student"
            />

            {/* Year Picker */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[styles.label, { color: colors.student.text }]}>Year / Department</Text>
              <Pressable
                onPress={() => setShowYearPicker(true)}
                style={[
                  styles.pickerButton,
                  {
                    backgroundColor: colors.student.surface,
                    borderColor: colors.student.border,
                  }
                ]}
              >
                <Text style={[
                  styles.pickerText,
                  { color: year ? colors.student.text : colors.student.textSecondary }
                ]}>
                  {year || 'Select your year'}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={colors.student.textSecondary} />
              </Pressable>
            </View>

            {/* Class Picker */}
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[styles.label, { color: colors.student.text }]}>Section / Class</Text>
              <Pressable
                onPress={() => {
                  if (!year) {
                    showAlert('Info', 'Please select your Year first');
                    return;
                  }
                  setShowClassPicker(true);
                }}
                disabled={!year}
                style={[
                  styles.pickerButton,
                  {
                    backgroundColor: !year ? colors.common.gray100 : colors.student.surface,
                    borderColor: colors.student.border,
                    opacity: !year ? 0.6 : 1,
                  }
                ]}
              >
                <Text style={[
                  styles.pickerText,
                  { color: selectedClasses.length > 0 ? colors.student.text : colors.student.textSecondary }
                ]}>
                  {selectedClasses.length > 0
                    ? selectedClasses.join(', ')
                    : (year ? 'Select your section(s)' : 'Select year first')}
                </Text>
                <MaterialIcons name="arrow-drop-down" size={24} color={colors.student.textSecondary} />
              </Pressable>
            </View>

            <Button
              title="Create Account"
              onPress={handleSignup}
              loading={loading}
              role="student"
              style={{ marginTop: spacing.md }}
            />

            <Pressable
              onPress={() => router.back()}
              style={styles.linkButton}
            >
              <Text style={[styles.linkText, { color: colors.student.textSecondary }]}>
                Already have an account?{' '}
                <Text style={{ color: colors.student.primary, fontWeight: '600' }}>
                  Sign In
                </Text>
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Year Picker Modal */}
        <Modal
          visible={showYearPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowYearPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.student.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.student.text }]}>
                  Select Your Year
                </Text>
                <Pressable onPress={() => setShowYearPicker(false)} hitSlop={8}>
                  <MaterialIcons name="close" size={24} color={colors.student.text} />
                </Pressable>
              </View>

              {availableYears.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.student.textSecondary }]}>
                    No years available. Please enter manually?
                  </Text>
                  <Button
                    title="Enter Manually"
                    onPress={() => {
                      setShowYearPicker(false);
                    }}
                    role="student"
                    style={{ marginTop: spacing.md }}
                  />
                </View>
              ) : (
                <FlatList
                  data={availableYears}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => handleYearSelect(item)}
                      style={[
                        styles.classItem,
                        {
                          backgroundColor: year === item ? colors.student.surfaceLight : colors.student.surface,
                          borderColor: year === item ? colors.student.primary : colors.student.border,
                        }
                      ]}
                    >
                      <Text style={[styles.className, { color: colors.student.text }]}>{item}</Text>
                    </Pressable>
                  )}
                  ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
                  contentContainerStyle={{ padding: spacing.md }}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Class Picker Modal */}
        <Modal
          visible={showClassPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowClassPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.student.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.student.text }]}>
                  Select Section(s) ({year})
                </Text>
                <Pressable onPress={() => setShowClassPicker(false)} hitSlop={8}>
                  <MaterialIcons name="close" size={24} color={colors.student.text} />
                </Pressable>
              </View>

              <FlatList
                data={filteredClasses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isSelected = selectedClasses.includes(item.className);
                  return (
                    <Pressable
                      onPress={() => handleClassToggle(item.className)}
                      style={[
                        styles.classItem,
                        {
                          backgroundColor: isSelected ? colors.student.surfaceLight : colors.student.surface,
                          borderColor: isSelected ? colors.student.primary : colors.student.border,
                        }
                      ]}
                    >
                      <View style={styles.classInfo}>
                        <Text style={[styles.className, { color: colors.student.text }]}>{item.className}</Text>
                        {item.description && (
                          <Text style={[styles.classDescription, { color: colors.student.textSecondary }]}>
                            {item.description}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <MaterialIcons name="check-circle" size={24} color={colors.student.primary} />
                      )}
                    </Pressable>
                  );
                }}
                ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
                contentContainerStyle={{ padding: spacing.md }}
              />
              <View style={styles.modalFooter}>
                <Button
                  title={selectedClasses.length > 0 ? `Selected ${selectedClasses.length} Classes` : "Select Classes"}
                  onPress={() => setShowClassPicker(false)}
                  role="student"
                  disabled={selectedClasses.length === 0}
                />
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  form: {
    paddingBottom: spacing.xxl * 2,
  },
  label: {
    ...typography.bodySmall,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  pickerText: {
    ...typography.body,
  },
  linkButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  linkText: {
    ...typography.bodySmall,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.gray200,
  },
  modalTitle: {
    ...typography.h3,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
    fontWeight: '600',
  },
  emptySubtext: {
    ...typography.bodySmall,
    marginTop: spacing.xs,
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    ...typography.body,
    fontWeight: '600',
  },
  classDescription: {
    ...typography.caption,
    marginTop: 2,
  },
  modalFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.common.gray200,
  },
});
