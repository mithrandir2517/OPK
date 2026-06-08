import { StyleSheet, Text, View } from 'react-native';
import { BackToOpk } from '../components/BackToOpk';

export function PartyScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Moje party</Text>
        <BackToOpk onPress={onBack} />
      </View>

      <View style={styles.activePartyCard}>
        <Text style={styles.label}>Vybraná parta</Text>
        <Text style={styles.activePartyTitle}>Parta Vyškov</Text>
        <Text style={styles.darkStatusText}>3 členové · Vyškov · OPK režim</Text>
        <View style={styles.partyModeRow}>
          <Text style={styles.partyModeActive}>Oběd</Text>
          <Text style={styles.partyModeActive}>Pivo</Text>
          <Text style={styles.partyModeActive}>Kolo</Text>
        </View>
        <View style={styles.partyMembers}>
          {['Marek', 'Tomáš', 'Pavel'].map((member) => (
            <Text key={member} style={styles.memberChip}>
              {member}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.inviteCard}>
        <View>
          <Text style={styles.label}>Pozvánka</Text>
          <Text style={styles.inviteCode}>OPK-VYSKOV</Text>
        </View>
        <Text style={styles.darkCardAction}>Sdílet kód</Text>
      </View>

      <View style={styles.cardList}>
        {[
          'Vytvořit novou partu',
          'Pozvat kamaráda',
          'Správci a role',
          'Nastavení party',
        ].map((item) => (
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
  activePartyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  label: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  activePartyTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 6,
  },
  darkStatusText: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  partyModeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 14,
  },
  partyModeActive: {
    backgroundColor: '#15251F',
    borderRadius: 6,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  partyMembers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  memberChip: {
    backgroundColor: '#F4F1EA',
    borderRadius: 8,
    color: '#15251F',
    fontSize: 13,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  inviteCard: {
    alignItems: 'center',
    backgroundColor: '#15251F',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  inviteCode: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  darkCardAction: {
    color: '#F8B84E',
    fontSize: 13,
    fontWeight: '900',
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
