import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TabbedListProps {
    tabs: string[];
    activeTab: number;
    onTabChange: (index: number) => void;
    children: React.ReactNode;
}

export default function TabbedList({ tabs, activeTab, onTabChange, children }: TabbedListProps) {
    return (
        <View style={styles.container}>
            <View style={styles.tabRow}>
                {tabs.map((tab, index) => {
                    const isActive = activeTab === index;
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={styles.tab}
                            onPress={() => onTabChange(index)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                                {tab}
                            </Text>
                            {isActive && <View style={styles.indicator} />}
                        </TouchableOpacity>
                    );
                })}
            </View>
            <View style={styles.contentContainer}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: Spacing.lg,
    },
    tabRow: {
        flexDirection: 'row',
        marginHorizontal: Spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray200,
    },
    tab: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        position: 'relative',
    },
    tabText: {
        fontSize: FontSizes.sm,
        fontWeight: FontWeights.medium,
        color: Colors.gray500,
    },
    activeTabText: {
        color: Colors.primary,
        fontWeight: FontWeights.semibold,
    },
    indicator: {
        position: 'absolute',
        bottom: -1,
        left: '15%',
        right: '15%',
        height: 3,
        backgroundColor: Colors.primary,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },
    contentContainer: {
        flex: 1,
        marginTop: Spacing.md,
        paddingHorizontal: Spacing.base,
    },
});
