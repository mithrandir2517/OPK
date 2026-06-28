import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconName } from '../types';

type ActivityPanelProps = {
  title: string;
  action: string;
  accent: string;
  icon: IconName;
  onActionPress?: () => void;
  children: ReactNode;
};

export function ActivityPanel({ title, action, accent, icon, onActionPress, children }: ActivityPanelProps) {
  return (
    <View style={styles.detailPanel}>
      <View style={styles.sectionHeader}>
        <View style={styles.detailTitleRow}>
          <MaterialCommunityIcons name={icon} size={25} color={accent} />
          <Text style={styles.detailTitle}>{title}</Text>
        </View>
        <Pressable style={[styles.smallButton, { backgroundColor: accent }]} onPress={onActionPress}>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#FFFFFF" />
          <Text style={styles.smallButtonText}>{action}</Text>
        </Pressable>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  detailPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 0,
    gap: 14,
    padding: 18,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  detailTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  detailTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 1,
    gap: 8,
  },
  smallButton: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
});
