import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Modal, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { Screen } from '@/components/layout/Screen';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius, shadows } from '@/constants/theme';
import { useAlert } from '@/template';
import { classService } from '@/services/classService';
import { Class } from '@/types';

/**
 * Sub-component for each class card
 */
const ClassCard = ({ item, onDelete, onPress }: { item: Class; onDelete: (id: string, name: string) => void; onPress: () => void }) => {
    const [studentCount, setStudentCount] = useState<number | null>(null);

    useEffect(() => {
        const loadStudentCount = async () => {
            try {
                const count = await classService.getClassStudentCount(item.className);
                setStudentCount(count);
            } catch (error) {
                console.error('Error loading student count:', error);
            }
        };
        loadStudentCount();
    }, [item.className]);

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.classCard,
                { backgroundColor: colors.staff.surface, borderColor: colors.staff.border },
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }
            ]}
        >
            <View style={styles.classHeader}>
                <View style={styles.classIconContainer}>
                    <MaterialIcons name="school" size={24} color={colors.staff.primary} />
                </View>
                <View style={styles.classDetails}>
                    <Text style={[styles.classNameText, { color: colors.staff.text }]}>
                        {item.className}
                    </Text>
                    <Text style={[styles.classDescriptionText, { color: colors.staff.textSecondary }]}>
                        {item.description} Department • {item.year}
                    </Text>
                </View>
                <Pressable
                    onPress={() => onDelete(item.id, item.className)}
                    style={styles.deleteButton}
                    hitSlop={8}
                >
                    <MaterialIcons name="delete" size={20} color="#EF4444" />
                </Pressable>
            </View>

            <View style={styles.classFooter}>
                <View style={styles.statItem}>
                    <MaterialIcons name="people" size={16} color={colors.staff.textSecondary} />
                    <Text style={[styles.statText, { color: colors.staff.textSecondary }]}>
                        {studentCount !== null ? `${studentCount} students` : 'Loading...'}
                    </Text>
                </View>
                <View style={styles.viewStudentsHint}>
                    <Text style={[styles.viewStudentsText, { color: colors.staff.primary }]}>
                        View Students
                    </Text>
                    <MaterialIcons name="chevron-right" size={16} color={colors.staff.primary} />
                </View>
            </View>
        </Pressable>
    );
};

export default function ClassManagementScreen() {
    const { user } = useAuth();
    const router = useRouter();
    const { showAlert } = useAlert();

    const [classes, setClasses] = useState<Class[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [creating, setCreating] = useState(false);

    // Selected Class Students View
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [students, setStudents] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    // Form fields
    const [className, setClassName] = useState('');
    const [department, setDepartment] = useState('');
    const [year, setYear] = useState('');

    // Add Student state
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);

    const yearOptions = ['I YEAR', 'II YEAR', 'III YEAR', 'IV YEAR'];

    const loadClasses = useCallback(async () => {
        if (!user?.id) return;
        try {
            setLoading(true);
            const staffClasses = await classService.getClassesByStaff(user.id);
            setClasses(staffClasses);
        } catch (error) {
            console.error('Error loading classes:', error);
            showAlert('Error', 'Failed to load classes');
        } finally {
            setLoading(false);
        }
    }, [showAlert, user?.id]);

    useEffect(() => {
        loadClasses();
    }, [loadClasses]);

    const handleSelectClass = async (cls: Class) => {
        setSelectedClass(cls);
        setLoadingStudents(true);
        try {
            const classStudents = await classService.getClassStudents(cls.className);
            setStudents(classStudents);
        } catch (error) {
            console.error('Error loading students:', error);
            showAlert('Error', 'Failed to load student list');
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleSearchStudents = async (query: string) => {
        setStudentSearchQuery(query);
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        if (!selectedClass) return;

        setSearching(true);
        try {
            const results = await classService.searchStudentsToEnroll(query, selectedClass.className);
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching students:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleAddStudent = async (studentId: string) => {
        if (!selectedClass) return;
        try {
            await classService.addStudentToClass(studentId, selectedClass.className);
            // Refresh student list
            const classStudents = await classService.getClassStudents(selectedClass.className);
            setStudents(classStudents);
            setShowAddStudentModal(false);
            setStudentSearchQuery('');
            setSearchResults([]);
            showAlert('Success', 'Student added to class');
        } catch (error) {
            console.error('Error adding student:', error);
            showAlert('Error', 'Failed to add student to class');
        }
    };

    const handleRemoveStudent = async (studentId: string, studentName: string) => {
        if (!selectedClass) return;

        showAlert(
            'Confirm Removal',
            `Are you sure you want to remove ${studentName} from this class?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await classService.removeStudentFromClass(studentId, selectedClass.className);
                            // Refresh student list
                            const classStudents = await classService.getClassStudents(selectedClass.className);
                            setStudents(classStudents);
                        } catch (error) {
                            console.error('Error removing student:', error);
                            showAlert('Error', 'Failed to remove student');
                        }
                    }
                }
            ]
        );
    };

    const handleCreateClass = async () => {
        if (!className.trim()) {
            showAlert('Error', 'Please enter a class name (e.g., CSE-A)');
            return;
        }

        if (!year) {
            showAlert('Error', 'Please select a academic year');
            return;
        }

        if (!department.trim()) {
            showAlert('Error', 'Please enter a department (e.g., CSE)');
            return;
        }

        setCreating(true);
        try {
            await classService.createClass(
                className.trim(),
                department.trim(),
                year,
                user!.id
            );

            setShowCreateModal(false);
            setClassName('');
            setDepartment('');
            setYear('');

            await loadClasses();
            showAlert('Success', 'Class created successfully!');
        } catch (error: any) {
            showAlert('Error', error.message || 'Failed to create class');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteClass = async (classId: string, name: string) => {
        showAlert(
            'Delete Class',
            `Are you sure you want to delete "${name}"? This will hide it from student signup and remove it from all enrolled students.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await classService.deleteClass(classId, name);
                            await loadClasses();
                            showAlert('Success', 'Class deleted successfully');
                        } catch (error: any) {
                            showAlert('Error', error.message || 'Failed to delete class');
                        }
                    },
                },
            ]
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
                <MaterialIcons name="arrow-back" size={24} color={colors.staff.text} />
            </Pressable>
            <View style={styles.headerContent}>
                <Text style={[styles.title, { color: colors.staff.text }]}>Class Management</Text>
                <Text style={[styles.subtitle, { color: colors.staff.textSecondary }]}>
                    Organize your students by year and department
                </Text>
            </View>
            <Button
                title="Create New Class"
                onPress={() => setShowCreateModal(true)}
                role="staff"
                icon={<MaterialIcons name="add" size={20} color={colors.common.white} />}
                style={{ marginBottom: spacing.lg }}
            />
        </View>
    );

    return (
        <Screen role="staff" scrollable={false}>
            <View style={styles.container}>
                {renderHeader()}

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.staff.primary} />
                        <Text style={[styles.loadingText, { color: colors.staff.textSecondary, marginTop: spacing.md }]}>
                            Loading classes...
                        </Text>
                    </View>
                ) : classes.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialIcons name="school" size={64} color={colors.staff.border} />
                        <Text style={[styles.emptyText, { color: colors.staff.text }]}>
                            No classes yet
                        </Text>
                        <Text style={[styles.emptySubtext, { color: colors.staff.textSecondary }]}>
                            Create your first class to get started
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={classes}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <ClassCard
                                item={item}
                                onDelete={handleDeleteClass}
                                onPress={() => handleSelectClass(item)}
                            />
                        )}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                    />
                )}

                {/* Students List Modal */}
                <Modal
                    visible={!!selectedClass}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setSelectedClass(null)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.staff.background, height: '80%' }]}>
                            <View style={styles.modalHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View>
                                        <Text style={[styles.modalTitle, { color: colors.staff.text }]}>
                                            {selectedClass?.className}
                                        </Text>
                                        <Text style={[styles.studentCountSub, { color: colors.staff.textSecondary }]}>
                                            {students.length} Students Enrolled
                                        </Text>
                                    </View>
                                    <Pressable
                                        onPress={() => setShowAddStudentModal(true)}
                                        style={[styles.addStudentBtn, { backgroundColor: colors.staff.primary + '15' }]}
                                    >
                                        <MaterialIcons name="person-add" size={20} color={colors.staff.primary} />
                                        <Text style={[styles.addStudentBtnText, { color: colors.staff.primary }]}>Add</Text>
                                    </Pressable>
                                </View>
                                <Pressable onPress={() => setSelectedClass(null)} hitSlop={8}>
                                    <MaterialIcons name="close" size={24} color={colors.staff.text} />
                                </Pressable>
                            </View>

                            <View style={[styles.modalBody, { flex: 1, paddingBottom: 0 }]}>
                                {loadingStudents ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="large" color={colors.staff.primary} />
                                    </View>
                                ) : students.length === 0 ? (
                                    <View style={styles.emptyContainer}>
                                        <MaterialIcons name="people-outline" size={48} color={colors.staff.border} />
                                        <Text style={[styles.emptyText, { color: colors.staff.text, fontSize: 18 }]}>
                                            No students found
                                        </Text>
                                        <Text style={[styles.emptySubtext, { color: colors.staff.textSecondary }]}>
                                            Students will appear here after they sign up for this class.
                                        </Text>
                                    </View>
                                ) : (
                                    <FlatList
                                        data={students}
                                        keyExtractor={(item) => item.id}
                                        contentContainerStyle={{ paddingBottom: spacing.xl }}
                                        renderItem={({ item }) => (
                                            <View style={[styles.studentItem, { borderColor: colors.staff.border }]}>
                                                <View style={[styles.studentAvatar, { backgroundColor: colors.staff.surfaceLight }]}>
                                                    <Text style={[styles.avatarText, { color: colors.staff.primary }]}>
                                                        {item.name.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <View style={styles.studentInfo}>
                                                    <Text style={[styles.studentName, { color: colors.staff.text }]}>
                                                        {item.name}
                                                    </Text>
                                                    <Text style={[styles.studentRoll, { color: colors.staff.textSecondary }]}>
                                                        Roll: {item.rollNumber || 'N/A'} • {item.email}
                                                    </Text>
                                                </View>
                                                <Pressable
                                                    onPress={() => handleRemoveStudent(item.id, item.name)}
                                                    style={styles.removeStudentBtn}
                                                    hitSlop={8}
                                                >
                                                    <MaterialIcons name="person-remove" size={20} color="#EF4444" />
                                                </Pressable>
                                            </View>
                                        )}
                                        ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
                                    />
                                )}
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Create Class Modal */}
                <Modal
                    visible={showCreateModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowCreateModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.staff.background }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.staff.text }]}>
                                    Create New Class
                                </Text>
                                <Pressable onPress={() => setShowCreateModal(false)} hitSlop={8}>
                                    <MaterialIcons name="close" size={24} color={colors.staff.text} />
                                </Pressable>
                            </View>

                            <View style={styles.modalBody}>
                                {showYearPicker ? (
                                    <View style={{ marginTop: spacing.md }}>
                                        <View style={[styles.modalHeader, { paddingHorizontal: 0, paddingTop: 0, borderBottomWidth: 0 }]}>
                                            <Text style={[styles.modalTitle, { color: colors.staff.text, fontSize: 18 }]}>
                                                Select Academic Year
                                            </Text>
                                            <Pressable onPress={() => setShowYearPicker(false)}>
                                                <MaterialIcons name="close" size={20} color={colors.staff.textSecondary} />
                                            </Pressable>
                                        </View>
                                        <View style={{ marginTop: spacing.sm }}>
                                            {yearOptions.map((option) => (
                                                <Pressable
                                                    key={option}
                                                    onPress={() => {
                                                        setYear(option);
                                                        setShowYearPicker(false);
                                                    }}
                                                    style={({ pressed }) => [
                                                        styles.yearOption,
                                                        year === option && { backgroundColor: colors.staff.primary + '15' },
                                                        { borderWidth: 1, borderColor: colors.staff.border },
                                                        pressed && { opacity: 0.7 }
                                                    ]}
                                                >
                                                    <Text style={[
                                                        styles.yearOptionText,
                                                        { color: year === option ? colors.staff.primary : colors.staff.text }
                                                    ]}>
                                                        {option}
                                                    </Text>
                                                    {year === option && (
                                                        <MaterialIcons name="check" size={20} color={colors.staff.primary} />
                                                    )}
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                ) : (
                                    <>
                                        <Input
                                            label="Section / Class Name *"
                                            value={className}
                                            onChangeText={setClassName}
                                            placeholder="e.g., CSE-A, EEE-B"
                                            role="staff"
                                        />
                                        <Input
                                            label="Department *"
                                            value={department}
                                            onChangeText={setDepartment}
                                            placeholder="e.g., Computer Science"
                                            role="staff"
                                        />

                                        {/* Year Picker Trigger */}
                                        <View style={{ marginBottom: spacing.md }}>
                                            <Text style={[styles.label, { color: colors.staff.text }]}>Year *</Text>
                                            <Pressable
                                                onPress={() => setShowYearPicker(true)}
                                                style={[
                                                    styles.pickerButton,
                                                    {
                                                        backgroundColor: colors.staff.surface,
                                                        borderColor: colors.staff.border,
                                                    }
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.pickerText,
                                                    { color: year ? colors.staff.text : colors.staff.textSecondary }
                                                ]}>
                                                    {year || 'Select Academic Year'}
                                                </Text>
                                                <MaterialIcons name="arrow-drop-down" size={24} color={colors.staff.textSecondary} />
                                            </Pressable>
                                        </View>

                                        <View style={styles.modalActions}>
                                            <Button
                                                title="Cancel"
                                                onPress={() => setShowCreateModal(false)}
                                                variant="secondary"
                                                role="staff"
                                                style={{ flex: 1 }}
                                            />
                                            <Button
                                                title="Create Class"
                                                onPress={handleCreateClass}
                                                loading={creating}
                                                role="staff"
                                                style={{ flex: 1 }}
                                            />
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Add Student Search Modal */}
                <Modal
                    visible={showAddStudentModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowAddStudentModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: colors.staff.background, height: '70%' }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: colors.staff.text }]}>
                                    Add Student to {selectedClass?.className}
                                </Text>
                                <Pressable
                                    onPress={() => {
                                        setShowAddStudentModal(false);
                                        setStudentSearchQuery('');
                                        setSearchResults([]);
                                    }}
                                    hitSlop={8}
                                >
                                    <MaterialIcons name="close" size={24} color={colors.staff.text} />
                                </Pressable>
                            </View>

                            <View style={styles.modalBody}>
                                <Input
                                    placeholder="Search by name, roll number or email..."
                                    value={studentSearchQuery}
                                    onChangeText={handleSearchStudents}
                                    role="staff"
                                    leftIcon={<MaterialIcons name="search" size={20} color={colors.staff.textSecondary} />}
                                />

                                <View style={{ flex: 1, marginTop: spacing.md }}>
                                    {searching ? (
                                        <ActivityIndicator size="small" color={colors.staff.primary} />
                                    ) : studentSearchQuery.length < 2 ? (
                                        <Text style={{ textAlign: 'center', color: colors.staff.textSecondary, marginTop: spacing.xl }}>
                                            Type at least 2 characters to search
                                        </Text>
                                    ) : searchResults.length === 0 ? (
                                        <Text style={{ textAlign: 'center', color: colors.staff.textSecondary, marginTop: spacing.xl }}>
                                            No eligible students found
                                        </Text>
                                    ) : (
                                        <FlatList
                                            data={searchResults}
                                            keyExtractor={(item) => item.id}
                                            renderItem={({ item }) => (
                                                <Pressable
                                                    onPress={() => handleAddStudent(item.id)}
                                                    style={({ pressed }) => [
                                                        styles.searchResultItem,
                                                        { borderColor: colors.staff.border },
                                                        pressed && { backgroundColor: colors.staff.surfaceLight }
                                                    ]}
                                                >
                                                    <View style={[styles.studentAvatar, { width: 32, height: 32, borderRadius: 16 }]}>
                                                        <Text style={[styles.avatarText, { fontSize: 12 }]}>
                                                            {item.name.charAt(0).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                    <View style={{ flex: 1, marginLeft: spacing.sm }}>
                                                        <Text style={[styles.studentName, { fontSize: 14 }]}>{item.name}</Text>
                                                        <Text style={{ fontSize: 12, color: colors.staff.textSecondary }}>
                                                            {item.rollNumber || 'No Roll'} • {item.email}
                                                        </Text>
                                                    </View>
                                                    <MaterialIcons name="add-circle-outline" size={24} color={colors.staff.primary} />
                                                </Pressable>
                                            )}
                                        />
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        padding: spacing.xl,
        paddingBottom: spacing.lg,
    },
    backButton: {
        marginBottom: spacing.md,
    },
    headerContent: {
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h1,
    },
    subtitle: {
        ...typography.bodySmall,
        marginTop: spacing.xs,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...typography.body,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xxl,
    },
    emptyText: {
        ...typography.h3,
        marginTop: spacing.lg,
    },
    emptySubtext: {
        ...typography.bodySmall,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    listContent: {
        paddingBottom: spacing.xxl,
        paddingHorizontal: spacing.xl,
    },
    classCard: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.lg,
        ...shadows.sm,
    },
    classHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    classIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.staff.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    classDetails: {
        flex: 1,
    },
    classNameText: {
        ...typography.h3,
    },
    classDescriptionText: {
        ...typography.caption,
        marginTop: 2,
    },
    deleteButton: {
        padding: spacing.xs,
    },
    classFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.common.gray100,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    statText: {
        ...typography.caption,
        fontWeight: '500',
    },
    viewStudentsHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    viewStudentsText: {
        ...typography.caption,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '90%',
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
    studentCountSub: {
        ...typography.caption,
        marginTop: 2,
    },
    modalBody: {
        padding: spacing.lg,
        paddingBottom: spacing.xl * 2,
    },
    studentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        marginBottom: spacing.xs,
    },
    studentAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        ...typography.h3,
        fontWeight: 'bold',
    },
    studentInfo: {
        flex: 1,
    },
    studentName: {
        ...typography.body,
        fontWeight: '600',
    },
    studentRoll: {
        ...typography.caption,
        marginTop: 2,
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
    yearOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.xs,
    },
    yearOptionText: {
        ...typography.body,
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
    },
    addStudentBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.sm,
        borderRadius: borderRadius.md,
        marginLeft: spacing.md,
        gap: 4,
    },
    addStudentBtnText: {
        ...typography.caption,
        fontWeight: 'bold',
    },
    removeStudentBtn: {
        padding: spacing.xs,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        marginBottom: spacing.xs,
    },
});
