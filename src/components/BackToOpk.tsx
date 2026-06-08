import { StyleSheet, Text } from 'react-native';

export function BackToOpk({ onPress }: { onPress: () => void }) {
  return (
    <Text style={styles.sectionLink} onPress={onPress}>
      Zpět na OPK
    </Text>
  );
}

const styles = StyleSheet.create({
  sectionLink: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
});
