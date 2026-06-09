import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BackToOpk } from '../components/BackToOpk';
import { PartyState } from '../types';

type PartyScreenProps = {
  onBack: () => void;
  party: PartyState;
  canSync: boolean;
  onChangeParty: (party: PartyState) => void;
  onCreateParty: () => void;
  onJoinParty: (inviteCode: string) => void;
  isJoining: boolean;
};

export function PartyScreen({
  onBack,
  party,
  canSync,
  onChangeParty,
  onCreateParty,
  onJoinParty,
  isJoining,
}: PartyScreenProps) {
  const [newMember, setNewMember] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const updateParty = (nextParty: Partial<PartyState>) => {
    onChangeParty({ ...party, ...nextParty });
  };

  const updateName = (name: string) => {
    updateParty({ name });
  };

  const addMember = () => {
    const member = newMember.trim();

    if (!member || party.members.includes(member)) {
      return;
    }

    updateParty({ members: [...party.members, member] });
    setNewMember('');
  };

  const removeMember = (member: string) => {
    if (party.members.length <= 1) {
      return;
    }

    updateParty({ members: party.members.filter((item) => item !== member) });
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Moje party</Text>
        <BackToOpk onPress={onBack} />
      </View>

      <View style={styles.activePartyCard}>
        <Text style={styles.label}>Vybraná parta</Text>
        <Text style={styles.activePartyTitle}>{party.name || 'Bez názvu'}</Text>
        <Text style={styles.darkStatusText}>
          {party.members.length} členové · {party.city || 'bez města'}
        </Text>
        <View style={styles.partyMembers}>
          {party.members.map((member) => (
            <Pressable key={member} style={styles.memberChip} onPress={() => removeMember(member)}>
              <Text style={styles.memberChipText}>{member}</Text>
              <Text style={styles.memberChipRemove}>×</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Upravit partu</Text>
        <View style={styles.formField}>
          <Text style={styles.inputLabel}>Název party</Text>
          <TextInput
            value={party.name}
            onChangeText={updateName}
            placeholder="Parta Vyškov"
            placeholderTextColor="#9CA3AF"
            style={styles.textInput}
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.inputLabel}>Město</Text>
          <TextInput
            value={party.city}
            onChangeText={(city) => updateParty({ city })}
            placeholder="Vyškov"
            placeholderTextColor="#9CA3AF"
            style={styles.textInput}
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.inputLabel}>Přidat člena</Text>
          <View style={styles.memberInputRow}>
            <TextInput
              value={newMember}
              onChangeText={setNewMember}
              placeholder="Jméno kamaráda"
              placeholderTextColor="#9CA3AF"
              style={[styles.textInput, styles.memberInput]}
            />
            <Pressable style={styles.addMemberButton} onPress={addMember}>
              <Text style={styles.addMemberButtonText}>Přidat</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Sdílení party</Text>
        <Text style={styles.cardText}>
          Vytvoř nový kód pro vlastní partu, nebo se připoj přes kód od kamaráda.
        </Text>
        <View style={styles.formField}>
          <Text style={styles.inputLabel}>Kód party</Text>
          <TextInput
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="OPK-VYSKOV-123"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            style={styles.textInput}
          />
        </View>
        <View style={styles.shareActionRow}>
          <Pressable
            style={[styles.shareButton, styles.shareButtonPrimary]}
            onPress={() => onJoinParty(inviteCode)}
          >
            <Text style={styles.shareButtonPrimaryText}>{isJoining ? 'Připojuji…' : 'Připojit se'}</Text>
          </Pressable>
          <Pressable style={styles.shareButton} onPress={onCreateParty}>
            <Text style={styles.shareButtonText}>Vytvořit nový kód</Text>
          </Pressable>
        </View>
        <Text style={styles.syncStatus}>
          {isJoining
            ? 'Čekám na data z party podle zadaného kódu.'
            : 'Nová party vytvoří nový kód a začne se synchronizovat přes Firebase.'}
        </Text>
      </View>

      <View style={styles.inviteCard}>
        <View>
          <Text style={styles.label}>Pozvánka</Text>
          <Text style={styles.inviteCode}>{party.inviteCode}</Text>
          <Text style={styles.syncStatus}>
            {canSync ? 'Sdíleno přes Firebase' : 'Lokálně bez backendu'}
          </Text>
        </View>
        <Text style={styles.darkCardAction}>Sdílet kód</Text>
      </View>

      <View style={styles.cardList}>
        {['Pozvat kamaráda', 'Správci a role', 'Nastavení party'].map((item) => (
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
  partyMembers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  memberChip: {
    alignItems: 'center',
    backgroundColor: '#F4F1EA',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  memberChipText: {
    color: '#15251F',
    fontSize: 13,
    fontWeight: '900',
  },
  memberChipRemove: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '900',
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
  memberInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  memberInput: {
    flex: 1,
  },
  addMemberButton: {
    alignItems: 'center',
    backgroundColor: '#F8B84E',
    borderColor: '#F6D186',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  addMemberButtonText: {
    color: '#15251F',
    fontSize: 14,
    fontWeight: '900',
  },
  shareActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shareButton: {
    alignItems: 'center',
    backgroundColor: '#FBFAF8',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  shareButtonPrimary: {
    backgroundColor: '#15251F',
    borderColor: '#15251F',
  },
  shareButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '900',
  },
  shareButtonPrimaryText: {
    color: '#F8B84E',
    fontSize: 14,
    fontWeight: '900',
  },
  syncStatus: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 2,
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
