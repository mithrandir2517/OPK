import { Text, View, StyleSheet } from 'react-native';
import { ActivityPanel } from '../components/ActivityPanel';

export function KoloScreen({ accent }: { accent: string }) {
  return (
    <>
      <View style={styles.statusPanelLight}>
        <Text style={styles.label}>Počasí</Text>
        <Text style={styles.darkStatusTitle}>Dnes to jde</Text>
        <Text style={styles.darkStatusText}>22 °C · slabý vítr · bez deště · ideální okruh po práci</Text>
      </View>
      <ActivityPanel title="Kolo" action="Dáme kolo?" accent={accent} icon="bike">
        <View style={styles.cardList}>
          <Text style={styles.subsectionTitle}>Nejbližší vyjížďka</Text>
          <View style={styles.menuCard}>
            <Text style={styles.cardTitle}>Okruh po práci</Text>
            <Text style={styles.cardMeta}>Dnes 17:30 · sraz u hospody · 31 km</Text>
            <Text style={styles.cardText}>Počasí na kolo: 22 °C, slabý vítr, bez deště.</Text>
            <Text style={styles.voteText}>2 jedou · Přidat se</Text>
          </View>
        </View>
      </ActivityPanel>
    </>
  );
}

const styles = StyleSheet.create({
  statusPanelLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    padding: 18,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  label: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  darkStatusTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 6,
  },
  darkStatusText: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  cardList: {
    gap: 10,
  },
  subsectionTitle: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '900',
  },
  menuCard: {
    backgroundColor: '#FBFAF8',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  cardMeta: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  cardText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 10,
  },
  voteText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
  },
});
