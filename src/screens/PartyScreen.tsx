import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BackToOpk } from '../components/BackToOpk';
import { PartyMember, PartyState } from '../types';

type PartyScreenProps = {
  onBack: () => void;
  party: PartyState;
  canSync: boolean;
  onChangeParty: (party: PartyState) => void;
  onCreateParty: () => void;
  onJoinParty: (inviteCode: string) => void;
  isJoining: boolean;
  syncError: string | null;
  joinTargetCode: string | null;
};

export function PartyScreen({
  onBack,
  party,
  canSync,
  onChangeParty,
  onCreateParty,
  onJoinParty,
  isJoining,
  syncError,
  joinTargetCode,
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

    if (!member || party.members.some((item) => item.displayName.toLowerCase() === member.toLowerCase())) {
      return;
    }

    const customMember: PartyMember = {
      uid: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      displayName: member,
      source: 'manual',
    };

    updateParty({ members: [...party.members, customMember] });
    setNewMember('');
  };

  const removeMember = (member: PartyMember) => {
    if (party.members.length <= 1) {
      return;
    }

    updateParty({ members: party.members.filter((item) => item.uid !== member.uid) });
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Moje party</Text>
        <BackToOpk onPress={onBack} />
      </View>

      <View style={styles.activePartyCard}>
        <Text style={styles.label}>Aktuální party</Text>
        <Text style={styles.activePartyTitle}>{isJoining ? 'Načítám partu…' : party.name || 'Bez názvu'}</Text>
        <Text style={styles.darkStatusText}>
          {isJoining ? 'Čekám na sdílená data z Firebase.' : `${party.members.length} členové · ${party.city || 'bez města'}`}
        </Text>
        <View style={styles.statusRow}>
          <Text style={styles.syncBadge}>{canSync ? 'Sdíleno přes Firebase' : 'Jen lokálně'}</Text>
          <Text style={styles.syncHint}>{joinTargetCode ?? party.inviteCode}</Text>
        </View>
        <View style={styles.partyMembers}>
          {party.members.map((member) => (
            <Pressable key={member.uid} style={styles.memberChip} onPress={() => removeMember(member)}>
              <View style={styles.memberChipBody}>
                <Text style={styles.memberChipText}>{member.displayName}</Text>
                <Text style={styles.memberChipMeta}>{member.email ?? member.uid}</Text>
              </View>
              <Text style={styles.memberChipRemove}>×</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Nastavení party</Text>
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
          <Text style={styles.inputLabel}>Lokální člen</Text>
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
        <Text style={styles.formTitle}>Nová party</Text>
        <Text style={styles.cardText}>Založí novou sdílenou partu z aktuálního názvu a města.</Text>
        <Pressable style={[styles.shareButton, styles.shareButtonPrimary]} onPress={onCreateParty}>
          <Text style={styles.shareButtonPrimaryText}>Vytvořit novou party</Text>
        </Pressable>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Připojit se</Text>
        <Text style={styles.cardText}>Zadej kód od kamaráda a načti jeho partu na tento telefon.</Text>
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
        <Pressable style={[styles.shareButton, styles.shareButtonPrimary]} onPress={() => onJoinParty(inviteCode)}>
          <Text style={styles.shareButtonPrimaryText}>{isJoining ? 'Připojuji…' : 'Připojit se'}</Text>
        </Pressable>
        <Text style={styles.syncStatus}>
          {syncError
            ? `Firebase chyba: ${syncError}`
            : isJoining && joinTargetCode
            ? `Načítám partu z kódu ${joinTargetCode}.`
            : 'Po vytvoření se sdílený kód objeví tady.'}
        </Text>
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
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  syncBadge: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    color: '#166534',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  syncHint: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
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
    gap: 8,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  memberChipBody: {
    minWidth: 0,
  },
  memberChipText: {
    color: '#15251F',
    fontSize: 13,
    fontWeight: '900',
  },
  memberChipMeta: {
    color: '#6B7280',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    marginTop: 1,
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
  shareButton: {
    alignItems: 'center',
    backgroundColor: '#FBFAF8',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
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
  cardText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
});
