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
    <View style={[styles.detailPanel, { borderTopColor: accent }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.detailTitleRow}>
          <MaterialCommunityIcons name={icon} size={25} color={accent} />
          <Text style={styles.detailTitle}>{title}</Text>
        </View>
        <Pressable style={[styles.smallButton, { backgroundColor: accent }]} onPress={onActionPress}>
          <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
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
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    borderTopWidth: 5,
    elevation: 2,
    gap: 14,
    padding: 16,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  detailTitle: {
    color: '#111827',
    fontSize: 24,
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
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 12,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
