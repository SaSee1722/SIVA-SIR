import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '@/services/authService';
import { User } from '@/types';
import { colors, typography, borderRadius, spacing } from '@/constants/theme';

interface StaffSelectorProps {
    onSelect: (staff: User | null) => void;
    selectedStaffId: string | null;
}

export function StaffSelector({ onSelect, selectedStaffId }: StaffSelectorProps) {
    const [staffList, setStaffList] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchStaff() {
            try {
                const users = await authService.getAllUsers();
                const staff = users.filter((u) => u.role === 'staff');
                setStaffList(staff);
            } catch (error) {
                console.error('Fetch staff error:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchStaff();
    }, []);

    if (isLoading) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator color={colors.student.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Send to Staff Member</Text>
            <FlatList
                data={staffList}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const isSelected = selectedStaffId === item.id;
                    return (
                        <Pressable
                            onPress={() => onSelect(isSelected ? null : item)}
                            style={[
                                styles.staffCard,
                                isSelected && styles.staffCardSelected,
                            ]}
                        >
                            <View style={[
                                styles.avatar,
                                isSelected ? { backgroundColor: colors.common.white } : { backgroundColor: colors.student.surfaceLight }
                            ]}>
                                <Text style={[
                                    styles.avatarText,
                                    isSelected ? { color: colors.student.primary } : { color: colors.student.text }
                                ]}>
                                    {item.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[
                                styles.staffName,
                                isSelected ? { color: colors.common.white } : { color: colors.student.text }
                            ]} numberOfLines={1}>
                                {item.name}
                            </Text>
                            {(item as any).department && (
                                <Text style={[
                                    styles.staffDept,
                                    isSelected ? { color: 'rgba(255,255,255,0.8)' } : { color: colors.student.textSecondary }
                                ]} numberOfLines={1}>
                                    {(item as any).department}
                                </Text>
                            )}
                            {isSelected && (
                                <View style={styles.checkIcon}>
                                    <MaterialIcons name="check-circle" size={16} color={colors.common.white} />
                                </View>
                            )}
                        </Pressable>
                    );
                }}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No staff members found</Text>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.bodySmall,
        fontWeight: '700',
        color: colors.student.text,
        marginBottom: spacing.sm,
        marginLeft: 4,
    },
    listContent: {
        paddingHorizontal: 4,
        paddingBottom: 4,
        gap: spacing.sm,
    },
    staffCard: {
        width: 110,
        padding: spacing.sm,
        backgroundColor: colors.common.white,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.student.border,
        minHeight: 120,
    },
    staffCardSelected: {
        backgroundColor: colors.student.primary,
        borderColor: colors.student.primary,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
    },
    staffName: {
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },
    staffDept: {
        fontSize: 10,
        marginTop: 2,
        textAlign: 'center',
    },
    checkIcon: {
        position: 'absolute',
        top: 4,
        right: 4,
    },
    loading: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        ...typography.bodySmall,
        color: colors.student.textSecondary,
        fontStyle: 'italic',
        marginTop: spacing.sm,
    },
});
