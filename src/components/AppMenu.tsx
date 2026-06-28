import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconName, SectionKey } from '../types';

type AppMenuProps = {
  onClose: () => void;
  onSelect: (section: SectionKey) => void;
};

const menuItems: Array<{ section: SectionKey; title: string; text: string; icon: IconName }> = [
  { section: 'profil', title: 'Já', text: 'Profil, odznaky a nastavení.', icon: 'account-circle-outline' },
  { section: 'party', title: 'Moje party', text: 'Skupiny a pozvánky.', icon: 'account-group-outline' },
  { section: 'kronika', title: 'Kronika', text: 'Fotky, videa a hlášky.', icon: 'image-multiple-outline' },
  { section: 'zpravy', title: 'Zprávy', text: 'Souhrny z okolí Vyškova.', icon: 'newspaper-variant-outline' },
];

export function AppMenu({ onClose, onSelect }: AppMenuProps) {
  return (
    <View style={styles.menuOverlay}>
      <Pressable style={styles.menuScrim} onPress={onClose} />
      <View style={styles.menuPanel}>
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle}>Další</Text>
          <Pressable style={styles.menuCloseButton} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={22} color="#6B7280" />
          </Pressable>
        </View>
        {menuItems.map((item) => (
          <Pressable
            key={item.title}
            style={styles.menuItem}
            onPress={() => onSelect(item.section)}
          >
            <View style={styles.menuItemIcon}>
              <MaterialCommunityIcons name={item.icon} size={22} color="#15251F" />
            </View>
            <View style={styles.menuItemCopy}>
              <Text style={styles.menuItemTitle}>{item.title}</Text>
              <Text style={styles.drawerItemText}>{item.text}</Text>
            </View>
          </Pressable>
        ))}
        <View style={styles.menuFooter}>
          <Text style={styles.menuFooterText}>Žádná party</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  menuScrim: {
    backgroundColor: 'rgba(17, 24, 39, 0.32)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  menuPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 14,
    gap: 8,
    padding: 12,
    position: 'absolute',
    right: 20,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    top: 12,
    width: 274,
  },
  menuHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  menuTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  menuCloseButton: {
    alignItems: 'center',
    borderRadius: 7,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  menuItem: {
    alignItems: 'center',
    backgroundColor: '#FBFAF8',
    borderColor: '#EEE8DF',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    padding: 12,
  },
  menuItemIcon: {
    alignItems: 'center',
    backgroundColor: '#F4F1EA',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  menuItemCopy: {
    flex: 1,
  },
  menuItemTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  drawerItemText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  menuFooter: {
    borderTopColor: '#EEF0F3',
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 10,
  },
  menuFooterText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
