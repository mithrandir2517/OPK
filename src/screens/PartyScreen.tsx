import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BackToOpk } from '../components/BackToOpk';
import { PartyMember, PartyRef, PartyState } from '../types';

type PartyScreenProps = {
  onBack: () => void;
  party: PartyState;
  partyRefs: PartyRef[];
  showEmptyState: boolean;
  expandedPartyCode: string | null;
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
  showEmptyState,
  expandedPartyCode,
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
  const [actionOpen, setActionOpen] = useState<'create' | 'join' | null>(null);
  const [draftParty, setDraftParty] = useState(party);
  const [displayPartyCodes, setDisplayPartyCodes] = useState<string[]>([]);
  const activePartyCode = expandedPartyCode ?? party.inviteCode;
  const activePartyLoaded = activePartyCode === party.inviteCode;
  const activePartyRef = partyRefs.find((item) => item.inviteCode === activePartyCode);
  const ownerUid = activePartyLoaded ? party.creatorUid : activePartyRef?.creatorUid ?? null;
  const isKnownOwner = !!viewerUid && !!ownerUid && ownerUid === viewerUid;
  const canKnownLeave = !!viewerUid && !!ownerUid && ownerUid !== viewerUid;

  useEffect(() => {
    if (!editOpen) {
      setDraftParty(party);
    }
  }, [editOpen, party]);

  useEffect(() => {
    setDisplayPartyCodes((current) => {
      const next: string[] = [];
      const currentCode = activePartyCode.trim();

      current.forEach((code) => {
        if (!code.trim()) {
          return;
        }

        if (code === currentCode || partyRefs.some((item) => item.inviteCode === code)) {
          if (!next.includes(code)) {
            next.push(code);
          }
        }
      });

      partyRefs.forEach((item) => {
        if (!item.inviteCode.trim()) {
          return;
        }

        if (!next.includes(item.inviteCode)) {
          next.push(item.inviteCode);
        }
      });

      if (currentCode && !next.includes(currentCode)) {
        next.unshift(currentCode);
      }

      return next;
    });
  }, [activePartyCode, partyRefs]);

  const visiblePartyRows = useMemo(
    () =>
      displayPartyCodes
        .map((code) => {
          if (!code.trim()) {
            return null;
          }

          const remote = partyRefs.find((item) => item.inviteCode === code);
          if (remote) {
            return remote;
          }

          if (code === party.inviteCode) {
            return {
              inviteCode: party.inviteCode,
              name: party.name,
              city: party.city,
              memberCount: draftParty.members.length,
              updatedAt: '',
            };
          }

          return null;
        })
        .filter((item): item is PartyRef => Boolean(item)),
    [displayPartyCodes, draftParty.members.length, party.city, party.inviteCode, party.name, partyRefs],
  );

  const updateParty = (nextParty: Partial<PartyState>) => {
    setDraftParty((current) => ({ ...current, ...nextParty }));
  };

  const updateName = (name: string) => {
    updateParty({ name });
  };

  const addMember = () => {
    const member = newMember.trim();

    if (!member || draftParty.members.some((item) => item.displayName.toLowerCase() === member.toLowerCase())) {
      return;
    }

    const customMember: PartyMember = {
      uid: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      displayName: member,
      source: 'manual',
    };

    updateParty({ members: [...draftParty.members, customMember] });
    setNewMember('');
  };

  const removeMember = (member: PartyMember) => {
    if (draftParty.members.length <= 1) {
      return;
    }

    updateParty({ members: draftParty.members.filter((item) => item.uid !== member.uid) });
  };

  const startEditing = () => {
    setDraftParty(party);
    setEditOpen(true);
  };

  const cancelEditing = () => {
    setDraftParty(party);
    setNewMember('');
    setEditOpen(false);
  };

  const closeAction = () => {
    setActionOpen(null);
    setInviteCode('');
  };

  const saveEditing = () => {
    onChangeParty(draftParty);
    setEditOpen(false);
    setNewMember('');
  };

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Moje party</Text>
        <BackToOpk onPress={onBack} />
      </View>

      <View style={styles.actionStrip}>
        <Pressable
          style={[styles.actionPill, actionOpen === 'create' && styles.actionPillActive]}
          onPress={() => setActionOpen((current) => (current === 'create' ? null : 'create'))}
        >
          <MaterialCommunityIcons name="plus" size={20} color={actionOpen === 'create' ? '#111827' : '#6B7280'} />
          <Text style={[styles.actionPillText, actionOpen === 'create' && styles.actionPillTextActive]}>Nová</Text>
        </Pressable>
        <Pressable
          style={[styles.actionPill, actionOpen === 'join' && styles.actionPillActive]}
          onPress={() => setActionOpen((current) => (current === 'join' ? null : 'join'))}
        >
          <MaterialCommunityIcons name="link-variant" size={20} color={actionOpen === 'join' ? '#111827' : '#6B7280'} />
          <Text style={[styles.actionPillText, actionOpen === 'join' && styles.actionPillTextActive]}>Připojit</Text>
        </Pressable>
      </View>

      {actionOpen === 'create' ? (
        <View style={styles.expandedActionCard}>
          <View style={styles.expandedActionHeader}>
            <View>
              <Text style={styles.formTitle}>Nová party</Text>
              <Text style={styles.cardText}>Založí novou sdílenou partu.</Text>
            </View>
            <Pressable style={styles.actionCloseButton} onPress={closeAction}>
              <MaterialCommunityIcons name="close" size={18} color="#6B7280" />
            </Pressable>
          </View>
          <Pressable style={[styles.shareButton, styles.shareButtonPrimary]} onPress={onCreateParty}>
            <Text style={styles.shareButtonPrimaryText}>Založit</Text>
          </Pressable>
        </View>
      ) : null}

      {actionOpen === 'join' ? (
        <View style={styles.expandedActionCard}>
          <View style={styles.expandedActionHeader}>
            <View>
              <Text style={styles.formTitle}>Připojit se</Text>
              <Text style={styles.cardText}>Zadej kód party.</Text>
            </View>
            <Pressable style={styles.actionCloseButton} onPress={closeAction}>
              <MaterialCommunityIcons name="close" size={18} color="#6B7280" />
            </Pressable>
          </View>
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
              ? `Načítám ${joinTargetCode}.`
              : 'Kód se zobrazí po vytvoření.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.stackCard}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.formTitle}>Party</Text>
              <Text style={styles.stackMeta}>{partyRefs.length} skupin</Text>
            </View>
            <View style={styles.stackPills}>
              <Text style={styles.syncBadge}>{canSync ? 'Firebase' : 'Lokálně'}</Text>
              <Text style={styles.listCount}>{partyRefs.length}</Text>
            </View>
          </View>

        {showEmptyState ? (
          <View style={styles.emptyStateCard}>
            <Text style={styles.formTitle}>Žádná party</Text>
            <Text style={styles.cardText}>Vytvoř novou, nebo se připoj přes kód.</Text>
            <View style={styles.emptyStatePills}>
              <Text style={styles.syncBadge}>{canSync ? 'Sdílení připravené' : 'Jen lokálně'}</Text>
              <Text style={styles.syncHint}>Sdílené skupiny se ukážou tady.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.partyList}>
            {visiblePartyRows.map((item) => {
            const isActive = item.inviteCode === activePartyCode;

            return isActive ? (
              <View key={item.inviteCode} style={[styles.partyRow, styles.partyRowActive, styles.partyRowExpanded]}>
                <View style={styles.activeRowTop}>
                  <View style={styles.partyRowCopy}>
                    <Text style={styles.activeCardLabel}>{activePartyLoaded ? 'Aktivní party' : 'Načítám party'}</Text>
                    <Text style={styles.activePartyTitle}>{activePartyLoaded ? party.name || 'Bez názvu' : item.name || 'Načítám partu…'}</Text>
                    <Text style={styles.activePartyMeta}>
                      {activePartyLoaded
                        ? `${party.city || 'bez města'} · ${draftParty.members.length} členů`
                        : `${item.city || 'bez města'} · Čekám na sdílená data z Firebase.`}
                    </Text>
                    <Text style={styles.partyRowCode}>{item.inviteCode}</Text>
                  </View>
                  <View style={styles.headerActions}>
                    <View style={styles.iconSlot}>
                      {editOpen ? (
                        <Pressable style={styles.iconButton} onPress={saveEditing}>
                          <MaterialCommunityIcons name="check" size={20} color="#15251F" />
                        </Pressable>
                      ) : (
                        <Pressable style={styles.iconButton} onPress={startEditing}>
                          <MaterialCommunityIcons name="pencil-outline" size={20} color="#15251F" />
                        </Pressable>
                      )}
                    </View>
                    <View style={styles.iconSlot}>
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
                    </View>
                    <View style={styles.iconSlot}>
                      <Pressable
                        disabled={!canKnownLeave}
                        style={[styles.iconButton, !canKnownLeave && styles.iconButtonDisabled]}
                        onPress={() =>
                          Alert.alert('Opustit party', 'Opravdu chceš opustit tuto party?', [
                            { text: 'Zrušit', style: 'cancel' },
                            { text: 'Opustit', style: 'destructive', onPress: onLeaveParty },
                          ])
                        }
                      >
                        <MaterialCommunityIcons name="logout" size={20} color="#15251F" />
                      </Pressable>
                    </View>
                    <View style={styles.iconSlot}>
                      <Pressable
                        disabled={!isKnownOwner}
                        style={[styles.iconButton, styles.iconButtonDanger, !isKnownOwner && styles.iconButtonDisabled]}
                        onPress={() =>
                          Alert.alert('Smazat party', 'Tím odstraníš sdílenou party pro všechny členy.', [
                            { text: 'Zrušit', style: 'cancel' },
                            { text: 'Smazat', style: 'destructive', onPress: onDeleteParty },
                          ])
                        }
                      >
                        <MaterialCommunityIcons name="delete-outline" size={20} color="#991B1B" />
                      </Pressable>
                    </View>
                  </View>
                </View>
                {!activePartyLoaded ? (
                  <View style={styles.loadingState}>
                    <Text style={styles.loadingStateText}>Načítám sdílenou partu…</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.partyMembers}>
                      {draftParty.members.map((member) => (
                        <Pressable key={member.uid} style={styles.memberChip} onPress={() => removeMember(member)}>
                          <View style={styles.memberChipBody}>
                            <Text style={styles.memberChipText}>{member.displayName}</Text>
                            {editOpen ? <Text style={styles.memberChipMeta}>{member.email ?? member.uid}</Text> : null}
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
                            value={draftParty.name}
                            onChangeText={updateName}
                            placeholder="Parta Vyškov"
                            placeholderTextColor="#9CA3AF"
                            style={styles.textInput}
                          />
                        </View>
                        <View style={styles.formField}>
                          <Text style={styles.inputLabel}>Město</Text>
                          <TextInput
                            value={draftParty.city}
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
                  </>
                )}
              </View>
            ) : (
              <Pressable key={item.inviteCode} style={styles.partyRow} onPress={() => onSelectParty(item.inviteCode)}>
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
            })}
          </View>
        )}
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
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  stackCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
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
  activeCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  activeCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  activeCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  activeCardLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
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
    fontSize: 22,
    fontWeight: '900',
    marginTop: 6,
  },
  activePartyMeta: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
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
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    color: '#166534',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    marginTop: 10,
  },
  partyRowExpanded: {
    alignItems: 'stretch',
    flexDirection: 'column',
    gap: 12,
    justifyContent: 'flex-start',
  },
  activeRowTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  memberChip: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 999,
    borderColor: '#E5E7EB',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  memberChipBody: {
    flexShrink: 1,
    minWidth: 0,
  },
  memberChipText: {
    color: '#15251F',
    fontSize: 12,
    fontWeight: '900',
  },
  memberChipMeta: {
    color: '#6B7280',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 12,
    marginTop: 1,
  },
  memberChipRemove: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '900',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
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
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 12,
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
    backgroundColor: '#111827',
    borderColor: '#111827',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  addMemberButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listCount: {
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: '100%',
    padding: 12,
  },
  partyRowActive: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D4D4D8',
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
  actionStrip: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionPill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  actionPillActive: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D4D4D8',
  },
  actionPillText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '900',
  },
  actionPillTextActive: {
    color: '#111827',
  },
  actionCloseButton: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  expandedActionCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  expandedActionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  emptyStateCard: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  emptyStatePills: {
    gap: 8,
  },
  editPanel: {
    gap: 12,
    marginTop: 2,
  },
  loadingState: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E7E5E4',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  loadingStateText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    minWidth: 168,
    justifyContent: 'flex-end',
  },
  iconSlot: {
    height: 36,
    width: 36,
  },
  footerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 0,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconButtonDanger: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECACA',
  },
  iconButtonDisabled: {
    opacity: 0.35,
  },
  shareButton: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 999,
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
