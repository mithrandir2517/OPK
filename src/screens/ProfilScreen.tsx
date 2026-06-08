import { StyleSheet, Text, View } from 'react-native';
import { BackToOpk } from '../components/BackToOpk';

export function ProfilScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Profil</Text>
        <BackToOpk onPress={onBack} />
      </View>
      <View style={styles.profilePanel}>
        <Text style={styles.profileAvatar}>M</Text>
        <Text style={styles.profileName}>Marek</Text>
        <Text style={styles.profileMeta}>Parta Vyškov · aktivní člen · 42 akcí</Text>
        <View style={styles.profileStats}>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>42</Text>
            <Text style={styles.profileStatLabel}>návštěv</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>18</Text>
            <Text style={styles.profileStatLabel}>obědů</Text>
          </View>
          <View style={styles.profileStat}>
            <Text style={styles.profileStatValue}>127</Text>
            <Text style={styles.profileStatLabel}>km</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardList}>
        {['Pozvat kamaráda', 'Upozornění', 'Nastavení party', 'Odhlásit se'].map((item) => (
          <View key={item} style={styles.rowCard}>
            <Text style={styles.cardText}>{item}</Text>
            <Text style={styles.cardMeta}>otevřít</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  profilePanel: {
    alignItems: 'center',
    backgroundColor: '#15251F',
    borderRadius: 8,
    gap: 8,
    padding: 20,
  },
  profileAvatar: {
    backgroundColor: '#F8B84E',
    borderRadius: 26,
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
    height: 52,
    lineHeight: 52,
    overflow: 'hidden',
    textAlign: 'center',
    width: 52,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  profileMeta: {
    color: '#D1D5DB',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  profileStat: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    minWidth: 82,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  profileStatValue: {
    color: '#F8B84E',
    fontSize: 18,
    fontWeight: '900',
  },
  profileStatLabel: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '800',
  },
  cardList: {
    gap: 10,
  },
  rowCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  cardText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  cardMeta: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
});
