import { type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BackToOpk } from '../components/BackToOpk';
import { PartyState, UserProfile } from '../types';

type ProfilScreenProps = {
  onBack: () => void;
  party: PartyState;
  profile: UserProfile;
  firebaseUser: null | { uid: string; displayName: string; email: string | null; photoURL: string | null };
  googleAuthPanel: ReactNode;
  onSignOut: () => void;
  onChangeProfile: (profile: UserProfile) => void;
};

const avatarColors = ['#F8B84E', '#0F766E', '#2563EB', '#B45309'];

export function ProfilScreen({
  onBack,
  party,
  profile,
  firebaseUser,
  googleAuthPanel,
  onSignOut,
  onChangeProfile,
}: ProfilScreenProps) {
  const updateProfile = (nextProfile: Partial<UserProfile>) => {
    const updated = { ...profile, ...nextProfile };
    onChangeProfile({
      ...updated,
      avatarInitial: updated.avatarInitial.trim().slice(0, 1).toUpperCase() || 'M',
      name: updated.name,
    });
  };

  const updateName = (name: string) => {
    updateProfile({
      name,
      avatarInitial: name.trim().slice(0, 1).toUpperCase() || profile.avatarInitial,
    });
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Profil</Text>
        <BackToOpk onPress={onBack} />
      </View>
      <View style={styles.profilePanel}>
        <Text style={[styles.profileAvatar, { backgroundColor: profile.avatarColor }]}>
          {profile.avatarInitial}
        </Text>
        <Text style={styles.profileName}>{profile.name || 'Bez jména'}</Text>
        <Text style={styles.profileMeta}>{party.name} · aktivní člen · 42 akcí</Text>
        <View style={styles.connectionRow}>
          <Text style={styles.connectionPill}>{firebaseUser ? 'Přihlášeno' : 'Bez přihlášení'}</Text>
          <Text style={styles.connectionLabel}>
            {firebaseUser
              ? firebaseUser.email || firebaseUser.displayName
              : 'Google účet zatím není propojený'}
          </Text>
        </View>
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

      {!firebaseUser ? googleAuthPanel : null}

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Upravit profil</Text>
        <View style={styles.formField}>
          <Text style={styles.inputLabel}>Jméno</Text>
          <TextInput
            value={profile.name}
            onChangeText={updateName}
            placeholder="Tvoje jméno"
            placeholderTextColor="#9CA3AF"
            style={styles.textInput}
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.inputLabel}>Iniciála</Text>
          <TextInput
            value={profile.avatarInitial}
            onChangeText={(avatarInitial) => updateProfile({ avatarInitial })}
            maxLength={1}
            placeholder="M"
            placeholderTextColor="#9CA3AF"
            style={styles.textInput}
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.inputLabel}>Barva avatara</Text>
          <View style={styles.swatchRow}>
            {avatarColors.map((color) => (
              <Pressable
                key={color}
                onPress={() => updateProfile({ avatarColor: color })}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: color },
                  profile.avatarColor === color && styles.colorSwatchActive,
                ]}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.cardList}>
        {firebaseUser ? (
          <Pressable
            style={styles.rowCard}
            onPress={() => {
              Alert.alert('Odhlásit Google účet?', 'Zůstaneš v aplikaci, ale přijdeš o propojení se synchronizací.', [
                { text: 'Zrušit', style: 'cancel' },
                { text: 'Odhlásit', style: 'destructive', onPress: onSignOut },
              ]);
            }}
          >
            <Text style={styles.cardText}>Odhlásit Google účet</Text>
            <Text style={styles.cardMeta}>otevřít</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.rowCard}
          onPress={() => updateProfile({ notificationsEnabled: !profile.notificationsEnabled })}
        >
          <Text style={styles.cardText}>Upozornění</Text>
          <Text style={styles.cardMeta}>{profile.notificationsEnabled ? 'zapnuto' : 'vypnuto'}</Text>
        </Pressable>
        {['Pozvat kamaráda', 'Nastavení party'].map((item) => (
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
  connectionRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  connectionPill: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    color: '#166534',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  connectionLabel: {
    color: '#D1D5DB',
    fontSize: 12,
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
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  formTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  formField: {
    gap: 6,
  },
  inputLabel: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '900',
  },
  textInput: {
    backgroundColor: '#FBFAF8',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '800',
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSwatch: {
    borderColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    height: 34,
    width: 34,
  },
  colorSwatchActive: {
    borderColor: '#111827',
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
