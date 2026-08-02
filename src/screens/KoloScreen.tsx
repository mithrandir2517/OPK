import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { recordPartyEventSync, saveActivityRoundSync } from '../backend/opkSync';
import { subscribeActivityVotesSync } from '../backend/pollSync';
import { ActivityPanel } from '../components/ActivityPanel';
import { loadJson, saveJson, storageKeys } from '../storage/localStorage';
import { ActivityVote } from '../types';
import { ActivityRoundState } from '../types';

type KoloScreenProps = {
  accent: string;
  partyCode: string;
  canSync: boolean;
  viewerId: string | null;
  viewerName: string;
  onRoundCreated: (activity: 'kolo', round: ActivityRoundState) => void;
};

const statusOptions = ['Jedu', 'Možná', 'Nejedu'] as const;
const arrivalOptions = ['Teď', 'Za 15 min', 'Za 30 min', 'V 19:30'];

type KoloPlanState = {
  route: string;
  time: string;
  note: string;
};

const defaultPlan: KoloPlanState = {
  route: 'Okruh po práci',
  time: 'Dnes 17:30',
  note: 'Sraz u hospody · 31 km · bez deště',
};

type KoloVoteState = {
  choice: (typeof statusOptions)[number] | null;
  arrival: string;
};

const defaultVote: KoloVoteState = {
  choice: null,
  arrival: 'Za 30 min',
};

function normalizeVote(value: Partial<KoloVoteState> | null): KoloVoteState {
  return {
    choice: value?.choice && statusOptions.includes(value.choice) ? value.choice : null,
    arrival: typeof value?.arrival === 'string' && value.arrival.trim() ? value.arrival : defaultVote.arrival,
  };
}

export function KoloScreen({ accent, partyCode, canSync, viewerId, viewerName, onRoundCreated }: KoloScreenProps) {
  const [route, setRoute] = useState(defaultPlan.route);
  const [time, setTime] = useState(defaultPlan.time);
  const [note, setNote] = useState(defaultPlan.note);
  const [choice, setChoice] = useState<KoloVoteState['choice']>(null);
  const [arrival, setArrival] = useState(defaultVote.arrival);
  const [remoteVotes, setRemoteVotes] = useState<ActivityVote[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [editingPlan, setEditingPlan] = useState(false);
  const [roundAnnounced, setRoundAnnounced] = useState(false);
  const [roundNotice, setRoundNotice] = useState('');
  const voteSnapshot = useRef<KoloVoteState>(defaultVote);
  const planSnapshot = useRef<KoloPlanState>(defaultPlan);
  const roundNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    loadJson<KoloPlanState>(storageKeys.koloState).then((savedPlan) => {
      if (!mounted) {
        return;
      }

      const nextPlan = {
        route: typeof savedPlan?.route === 'string' && savedPlan.route.trim() ? savedPlan.route : defaultPlan.route,
        time: typeof savedPlan?.time === 'string' && savedPlan.time.trim() ? savedPlan.time : defaultPlan.time,
        note: typeof savedPlan?.note === 'string' && savedPlan.note.trim() ? savedPlan.note : defaultPlan.note,
      };
      setRoute(nextPlan.route);
      setTime(nextPlan.time);
      setNote(nextPlan.note);
      planSnapshot.current = nextPlan;

      loadJson<Partial<KoloVoteState>>(storageKeys.koloVote).then((savedVote) => {
        if (!mounted) {
          return;
        }

        const nextVote = normalizeVote(savedVote);
        setChoice(nextVote.choice);
        setArrival(nextVote.arrival);
        voteSnapshot.current = nextVote;
        loadJson<boolean>(storageKeys.koloRoundStarted).then((savedRound) => {
          if (!mounted) {
            return;
          }

          setRoundAnnounced(savedRound === true);
        });
        setStorageReady(true);
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (storageReady) {
      saveJson(storageKeys.koloState, { route, time, note });
      saveJson(storageKeys.koloRoundStarted, roundAnnounced);
    }
  }, [note, route, roundAnnounced, storageReady, time]);

  useEffect(() => {
    if (!canSync) {
      return () => {};
    }

    const unsubscribe = subscribeActivityVotesSync(partyCode, 'kolo', setRemoteVotes);
    return unsubscribe;
  }, [canSync, partyCode]);

  useEffect(() => {
    return () => {
      if (roundNoticeTimer.current) {
        clearTimeout(roundNoticeTimer.current);
      }
    };
  }, []);

  const handleSendInvite = () => {
    const nextPlan = { route, time, note };

    if (canSync && viewerId) {
      void saveActivityRoundSync(partyCode, 'kolo', {
        open: true,
        openedAt: new Date().toISOString(),
        openedByUid: viewerId,
        openedByName: viewerName,
        place: nextPlan.route,
        time: nextPlan.time,
        note: nextPlan.note,
      });
      void recordPartyEventSync({
        partyCode,
        type: 'kolo.round',
        activity: 'kolo',
        actorUid: viewerId,
        actorName: viewerName,
        title: `${viewerName} vyhlásil kolo`,
        body: `Kolo: ${viewerName} poslal pozvánku.`,
      });
      onRoundCreated('kolo', {
        open: true,
        openedAt: new Date().toISOString(),
        openedByUid: viewerId,
        openedByName: viewerName,
        place: nextPlan.route,
        time: nextPlan.time,
        note: nextPlan.note,
      });
    }

    planSnapshot.current = nextPlan;
    setRoundAnnounced(true);
    setEditingPlan(false);
    setRoundNotice('Posláno partě');
    if (roundNoticeTimer.current) {
      clearTimeout(roundNoticeTimer.current);
    }
    roundNoticeTimer.current = setTimeout(() => {
      setRoundNotice('');
    }, 2200);
  };

  const handleCancelPlan = () => {
    setRoute(planSnapshot.current.route);
    setTime(planSnapshot.current.time);
    setNote(planSnapshot.current.note);
    setEditingPlan(false);
  };

  const visibleVotes: ActivityVote[] = canSync
    ? [
        ...remoteVotes.filter((vote) => vote.uid !== viewerId),
        {
          uid: viewerId || 'local',
          displayName: viewerName,
          choice: choice ?? 'Čeká',
          arrival: choice === 'Jedu' ? arrival : undefined,
          updatedAt: new Date().toISOString(),
        },
      ]
    : [
        {
          uid: 'local',
          displayName: viewerName,
          choice: choice ?? 'Čeká',
          arrival: choice === 'Jedu' ? arrival : undefined,
          updatedAt: new Date().toISOString(),
        },
      ];

  const voteCounts = useMemo(() => {
    const counts = new Map<string, number>();

    visibleVotes.forEach((vote) => {
      counts.set(vote.choice, (counts.get(vote.choice) ?? 0) + 1);
    });

    return counts;
  }, [visibleVotes]);

  const topSummary = `${voteCounts.get('Jedu') ?? 0} jedou · ${voteCounts.get('Možná') ?? 0} možná`;

  return (
    <>
      <ActivityPanel
        title="Kolo"
        action={editingPlan ? 'Sbalit' : roundAnnounced ? 'Kolo běží' : 'Dáme kolo?'}
        accent={accent}
        icon="bike"
        onActionPress={() => setEditingPlan((value) => !value)}
      >
        <View style={styles.cardList}>
          <View style={styles.menuCard}>
            <Text style={styles.cardTitle}>{route || 'Trasa není vybraná'}</Text>
            <Text style={styles.cardMeta}>{time || 'Čas není vybraný'}</Text>
            <Text style={styles.cardText}>{note || 'Poznámka bude tady.'}</Text>
            <Text style={styles.voteText}>{topSummary}</Text>
          </View>

          {editingPlan ? (
            <View style={styles.menuCard}>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Kam?</Text>
                <TextInput
                  value={route}
                  onChangeText={setRoute}
                  placeholder="Trasa, místo srazu nebo cíl"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Kdy?</Text>
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder="Dnes 17:30"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Poznámka</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Např. 31 km, sraz u hospody"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>
              <Pressable style={[styles.primaryButton, styles.fullWidthButton]} onPress={handleSendInvite}>
                <MaterialCommunityIcons name="check" size={18} color="#1F2937" />
                <Text style={styles.primaryButtonText}>Vyhlásit</Text>
              </Pressable>
              <Pressable style={[styles.smallGhostButton, styles.fullWidthButton]} onPress={handleCancelPlan}>
                <Text style={styles.voteText}>Zrušit</Text>
              </Pressable>
            </View>
          ) : null}

          {!!roundNotice && <Text style={styles.roundNoticeText}>{roundNotice}</Text>}
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
  roundNoticeText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
  },
  voteText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
  },
  voteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  voteButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
  },
  voteButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  voteButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '900',
  },
  voteButtonTextActive: {
    color: '#FFFFFF',
  },
  arrivalBlock: {
    marginTop: 10,
  },
  formField: {
    gap: 6,
    marginBottom: 12,
  },
  inputLabel: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '900',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#F8B84E',
    borderColor: '#F6D186',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '900',
  },
  fullWidthButton: {
    width: '100%',
  },
  smallGhostButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  arrivalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },
  arrivalChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  arrivalChipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: '#2563EB',
  },
  arrivalChipText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '900',
  },
  arrivalChipTextActive: {
    color: '#1D4ED8',
  },
  voteList: {
    gap: 8,
    marginTop: 12,
  },
  voteRowCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
});
