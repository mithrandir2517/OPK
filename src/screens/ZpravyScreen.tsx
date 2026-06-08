import { StyleSheet, Text, View } from 'react-native';
import { BackToOpk } from '../components/BackToOpk';
import { news } from '../data/mockData';

export function ZpravyScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Zprávy</Text>
        <BackToOpk onPress={onBack} />
      </View>
      <View style={styles.cardList}>
        {news.map((item) => (
          <View key={item.title} style={styles.newsCard}>
            <Text style={styles.newsTag}>{item.tag}</Text>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardText}>{item.summary}</Text>
            <View style={styles.newsActions}>
              <Text style={styles.voteText}>Otevřít článek</Text>
              <Text style={styles.voteText}>Sdílet do party</Text>
            </View>
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
  cardList: {
    gap: 10,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  newsTag: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  cardText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
    marginTop: 10,
  },
  newsActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  voteText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
  },
});
