import { useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BackToOpk } from '../components/BackToOpk';
import { PartyMember, PartyRef, PartyState } from '../types';

type PartyScreenProps = {
  onBack: () => void;
  party: PartyState;
  partyRefs: PartyRef[];
  viewerUid: string | null;
  canSync: boolean;
  onChangeParty: (party: PartyState) => void;
  onCreateParty: () => void;
  onJoinParty: (inviteCode: string) => void;
  onSelectParty: (inviteCode: string) => void;
  onLeaveParty: () => void;
  onDeleteParty: () => void;
  isJoining: boolean;
  syncError: string | null;
  joinTargetCode: string | null;
};

export function PartyScreen({
  onBack,
  party,
  partyRefs,
  viewerUid,
  canSync,
  onChangeParty,
  onCreateParty,
  onJoinParty,
  onSelectParty,
  onLeaveParty,
  onDeleteParty,
  isJoining,
  syncError,
  joinTargetCode,
}: PartyScreenProps) {
  const [newMember, setNewMember] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const isOwner = !!viewerUid && party.creatorUid === viewerUid;
  const canLeave = !!viewerUid && !isOwner;

  const partyCards = useMemo(
    () => [
      {
        name: party.name,
        city: party.city,
        inviteCode: party.inviteCode,
        memberCount: party.members.length,
        isActive: true,
      },
      ...partyRefs.filter((item) => item.inviteCode !== party.inviteCode).map((item) => ({
        name: item.name,
        city: item.city,
        inviteCode: item.inviteCode,
        memberCount: item.memberCount,
        isActive: false,
      })),
    ],
    [party, partyRefs],
  );

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

      <View style={styles.stackCard}>
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.formTitle}>Party</Text>
            <Text style={styles.stackMeta}>{partyCards.length} sdílených skupin</Text>
          </View>
          <View style={styles.stackPills}>
            <Text style={styles.syncBadge}>{canSync ? 'Firebase' : 'Lokálně'}</Text>
            <Text style={styles.listCount}>{partyRefs.length}</Text>
          </View>
        </View>

        <View style={styles.partyList}>
          {partyCards.map((item) => {
            const isActive = item.inviteCode === party.inviteCode;

            if (!isActive) {
              return (
                <Pressable
                  key={item.inviteCode}
                  style={styles.partyRow}
                  onPress={() => onSelectParty(item.inviteCode)}
                >
                  <View style={styles.partyRowCopy}>
                    <Text style={styles.partyRowTitle}>{item.name || 'Bez názvu'}</Text>
                    <Text style={styles.partyRowMeta}>
                      {item.city || 'bez města'} · {item.memberCount} členů
                    </Text>
                    <Text style={styles.partyRowCode}>{item.inviteCode}</Text>
                  </View>
                  <Text style={styles.partyRowAction}>Otevřít</Text>
                </Pressable>
              );
            }

            return (
              <View key={item.inviteCode} style={[styles.partyRow, styles.partyRowActive, styles.partyRowExpanded]}>
                <View style={styles.partyRowCopy}>
                  <Text style={styles.partyRowTitle}>{isJoining ? 'Načítám partu…' : item.name || 'Bez názvu'}</Text>
                  <Text style={styles.partyRowMeta}>
                    {isJoining ? 'Čekám na sdílená data z Firebase.' : `${item.city || 'bez města'} · ${party.members.length} členové`}
                  </Text>
                  <Text style={styles.partyRowCode}>{item.inviteCode}</Text>
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
                {editOpen ? (
                  <View style={styles.editPanel}>
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
                ) : null}
                <View style={styles.footerActions}>
                  <Pressable style={styles.iconButton} onPress={() => setEditOpen((open) => !open)}>
                    <MaterialCommunityIcons name={editOpen ? 'pencil-off' : 'pencil-outline'} size={20} color="#15251F" />
                  </Pressable>
                  <Pressable
                    style={styles.iconButton}
                    onPress={async () => {
                      try {
                        await Share.share({ message: `Kód party: ${item.inviteCode}` });
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <MaterialCommunityIcons name="share-variant-outline" size={20} color="#15251F" />
                  </Pressable>
                  {canLeave ? (
                    <Pressable
                      style={styles.iconButton}
                      onPress={() =>
                        Alert.alert('Opustit party', 'Opravdu chceš opustit tuto party?', [
                          { text: 'Zrušit', style: 'cancel' },
                          { text: 'Opustit', style: 'destructive', onPress: onLeaveParty },
                        ])
                      }
                    >
                      <MaterialCommunityIcons name="logout" size={20} color="#15251F" />
                    </Pressable>
                  ) : null}
                  {isOwner ? (
                    <Pressable
                      style={[styles.iconButton, styles.iconButtonDanger]}
                      onPress={() =>
                        Alert.alert('Smazat party', 'Tím odstraníš sdílenou party pro všechny členy.', [
                          { text: 'Zrušit', style: 'cancel' },
                          { text: 'Smazat', style: 'destructive', onPress: onDeleteParty },
                        ])
                      }
                    >
                      <MaterialCommunityIcons name="delete-outline" size={20} color="#991B1B" />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.actionGrid}>
        <View style={styles.actionCard}>
          <Text style={styles.formTitle}>Nová party</Text>
          <Text style={styles.cardText}>Založí novou sdílenou partu z aktuálního názvu a města.</Text>
          <Pressable style={[styles.shareButton, styles.shareButtonPrimary]} onPress={onCreateParty}>
            <Text style={styles.shareButtonPrimaryText}>Vytvořit</Text>
          </Pressable>
        </View>

        <View style={styles.actionCard}>
          <Text style={styles.formTitle}>Připojit se</Text>
          <Text style={styles.cardText}>Zadej kód od kamaráda a načti jeho partu na tento telefon.</Text>
          <View style={styles.formField}>
            <Text style={styles.inputLabel}>Kód party</Text>
            <TextInput
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="OPK846"
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
  stackCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  stackMeta: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  stackPills: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
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
  partyRowExpanded: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: 12,
    justifyContent: 'flex-start',
  },
  memberChip: {
    alignItems: 'center',
    backgroundColor: '#F4F1EA',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    overflow: 'hidden',
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  memberChipBody: {
    flexShrink: 1,
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
  listCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listCount: {
    backgroundColor: '#F4F1EA',
    borderRadius: 999,
    color: '#374151',
    fontSize: 12,
    fontWeight: '900',
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
  },
  partyList: {
    gap: 8,
  },
  partyRow: {
    alignItems: 'center',
    backgroundColor: '#FBFAF8',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: '100%',
    padding: 12,
  },
  partyRowActive: {
    backgroundColor: '#F5F9F7',
    borderColor: '#9BC1AD',
  },
  partyRowCopy: {
    flex: 1,
    minWidth: 0,
  },
  partyRowTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '900',
  },
  partyRowMeta: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  partyRowCode: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  partyRowAction: {
    color: '#15251F',
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 0,
    marginLeft: 12,
  },
  actionGrid: {
    gap: 10,
  },
  actionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  editPanel: {
    gap: 12,
    marginTop: 2,
  },
  footerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FBFAF8',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  iconButtonDanger: {
    backgroundColor: '#FFF1F1',
    borderColor: '#F9B4B4',
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
