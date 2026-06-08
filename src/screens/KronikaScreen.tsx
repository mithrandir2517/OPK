import { StyleSheet, Text, View } from 'react-native';
import { BackToOpk } from '../components/BackToOpk';
import { memories } from '../data/mockData';

export function KronikaScreen({ onBack }: { onBack: () => void }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Kronika</Text>
        <BackToOpk onPress={onBack} />
      </View>
      <View style={styles.cardList}>
        {memories.map((memory) => (
          <View key={memory.title} style={styles.memoryCard}>
            <Text style={styles.cardTitle}>{memory.title}</Text>
            <Text style={styles.cardMeta}>{memory.meta}</Text>
            <Text style={styles.cardText}>{memory.text}</Text>
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
  memoryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
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
});
