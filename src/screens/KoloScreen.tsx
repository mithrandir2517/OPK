import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { saveActivityVoteSync, subscribeActivityVotesSync } from '../backend/pollSync';
import { ActivityPanel } from '../components/ActivityPanel';
import { loadJson, saveJson, storageKeys } from '../storage/localStorage';
import { ActivityVote } from '../types';

type KoloScreenProps = {
  accent: string;
  partyCode: string;
  canSync: boolean;
  viewerId: string | null;
  viewerName: string;
};

const statusOptions = ['Jedu', 'Možná', 'Nejedu'] as const;
const arrivalOptions = ['Teď', 'Za 15 min', 'Za 30 min', 'V 19:30'];

type KoloVoteState = {
  choice: (typeof statusOptions)[number];
  arrival: string;
};

const defaultVote: KoloVoteState = {
  choice: 'Jedu',
  arrival: 'Za 30 min',
};

function normalizeVote(value: Partial<KoloVoteState> | null): KoloVoteState {
  return {
    choice: value?.choice && statusOptions.includes(value.choice) ? value.choice : defaultVote.choice,
    arrival: typeof value?.arrival === 'string' && value.arrival.trim() ? value.arrival : defaultVote.arrival,
  };
}

export function KoloScreen({ accent, partyCode, canSync, viewerId, viewerName }: KoloScreenProps) {
  const [choice, setChoice] = useState<KoloVoteState['choice']>(defaultVote.choice);
  const [arrival, setArrival] = useState(defaultVote.arrival);
  const [remoteVotes, setRemoteVotes] = useState<ActivityVote[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadJson<Partial<KoloVoteState>>(storageKeys.koloVote).then((savedVote) => {
      if (!mounted) {
        return;
      }

      const nextVote = normalizeVote(savedVote);
      setChoice(nextVote.choice);
      setArrival(nextVote.arrival);
      setStorageReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (storageReady) {
      saveJson(storageKeys.koloVote, { choice, arrival });
    }
  }, [arrival, choice, storageReady]);

  useEffect(() => {
    if (!canSync) {
      return () => {};
    }

    const unsubscribe = subscribeActivityVotesSync(partyCode, 'kolo', setRemoteVotes);
    return unsubscribe;
  }, [canSync, partyCode]);

  useEffect(() => {
    if (!storageReady || !canSync || !viewerId) {
      return;
    }

    void saveActivityVoteSync(partyCode, 'kolo', {
      uid: viewerId,
      displayName: viewerName,
      choice,
      arrival: choice === 'Jedu' ? arrival : undefined,
      updatedAt: new Date().toISOString(),
    });
  }, [arrival, canSync, choice, partyCode, storageReady, viewerId, viewerName]);

  const visibleVotes: ActivityVote[] = canSync
    ? [
        ...remoteVotes.filter((vote) => vote.uid !== viewerId),
        {
          uid: viewerId || 'local',
          displayName: viewerName,
          choice,
          arrival: choice === 'Jedu' ? arrival : undefined,
          updatedAt: new Date().toISOString(),
        },
      ]
    : [
        {
          uid: 'local',
          displayName: viewerName,
          choice,
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
      <View style={styles.statusPanelLight}>
        <Text style={styles.label}>Počasí</Text>
        <Text style={styles.darkStatusTitle}>Dnes to jde</Text>
        <Text style={styles.darkStatusText}>22 °C · slabý vítr · bez deště · {topSummary}</Text>
      </View>
      <ActivityPanel title="Kolo" action="Dáme kolo?" accent={accent} icon="bike">
        <View style={styles.cardList}>
          <Text style={styles.subsectionTitle}>Nejbližší vyjížďka</Text>
          <View style={styles.menuCard}>
            <Text style={styles.cardTitle}>Okruh po práci</Text>
            <Text style={styles.cardMeta}>Dnes 17:30 · sraz u hospody · 31 km</Text>
            <Text style={styles.cardText}>Počasí na kolo: 22 °C, slabý vítr, bez deště.</Text>

            <View style={styles.voteRow}>
              {statusOptions.map((option) => {
                const isActive = choice === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setChoice(option)}
                    style={[styles.voteButton, isActive && styles.voteButtonActive]}
                  >
                    <Text style={[styles.voteButtonText, isActive && styles.voteButtonTextActive]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {choice === 'Jedu' && (
              <View style={styles.arrivalBlock}>
                <Text style={styles.inputLabel}>Kdy dorazíš?</Text>
                <View style={styles.arrivalRow}>
                  {arrivalOptions.map((option) => {
                    const isActive = arrival === option;

                    return (
                      <Pressable
                        key={option}
                        onPress={() => setArrival(option)}
                        style={[styles.arrivalChip, isActive && styles.arrivalChipActive]}
                      >
                        <Text style={[styles.arrivalChipText, isActive && styles.arrivalChipTextActive]}>
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <Text style={styles.voteText}>{topSummary} · Přidat se</Text>
          </View>

          <View style={styles.menuCard}>
            <Text style={styles.cardTitle}>Hlasy</Text>
            <Text style={styles.cardMeta}>{canSync ? 'Sdíleno přes Firebase' : 'Jen v tomhle telefonu'}</Text>
            <View style={styles.voteList}>
              {visibleVotes.map((vote) => (
                <View key={`${vote.uid}-${vote.choice}`} style={styles.voteRowCard}>
                  <View>
                    <Text style={styles.cardText}>{vote.displayName}</Text>
                    <Text style={styles.cardMeta}>{vote.choice}</Text>
                  </View>
                  {!!vote.arrival && vote.choice === 'Jedu' && <Text style={styles.voteText}>{vote.arrival}</Text>}
                </View>
              ))}
            </View>
          </View>
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
  inputLabel: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '900',
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
