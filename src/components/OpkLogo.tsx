import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export function OpkLogo() {
  return (
    <View style={styles.logoMark}>
      <View style={styles.logoIconRow}>
        <View style={[styles.logoIconCell, styles.logoObedCell]}>
          <MaterialCommunityIcons name="silverware-fork-knife" size={13} color="#F8FAFC" />
        </View>
        <View style={[styles.logoIconCell, styles.logoPivoCell]}>
          <MaterialCommunityIcons name="glass-mug-variant" size={15} color="#1F2937" />
        </View>
        <View style={[styles.logoIconCell, styles.logoKoloCell]}>
          <MaterialCommunityIcons name="bike" size={14} color="#F8FAFC" />
        </View>
      </View>
      <Text style={styles.logoText}>OPK</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoMark: {
    alignItems: 'center',
    backgroundColor: '#15251F',
    borderColor: '#2D443A',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    gap: 3,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 7,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    width: 70,
  },
  logoIconRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  logoIconCell: {
    alignItems: 'center',
    borderRadius: 5,
    height: 20,
    justifyContent: 'center',
    width: 18,
  },
  logoObedCell: {
    backgroundColor: '#0F766E',
  },
  logoPivoCell: {
    backgroundColor: '#F8B84E',
  },
  logoKoloCell: {
    backgroundColor: '#2563EB',
  },
  logoText: {
    color: '#F8FAFC',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 11,
  },
});
