import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  StatusBar as NativeStatusBar,
} from 'react-native';
import { GoogleSignin, type SignInResponse } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut } from 'firebase/auth';
import { ActivityPanel } from './src/components/ActivityPanel';
import { AppMenu } from './src/components/AppMenu';
import { OpkLogo } from './src/components/OpkLogo';
import { activityMeta, beerReplies, lunchRestaurants, navItems } from './src/data/mockData';
import { KoloScreen } from './src/screens/KoloScreen';
import { KronikaScreen } from './src/screens/KronikaScreen';
import { PartyScreen } from './src/screens/PartyScreen';
import { ProfilScreen } from './src/screens/ProfilScreen';
import { ZpravyScreen } from './src/screens/ZpravyScreen';
import {
  fetchPartySync,
  savePartySync,
  savePivoSync,
  subscribePartySync,
  subscribePivoSync,
} from './src/backend/opkSync';
import { saveActivityVoteSync, subscribeActivityVotesSync } from './src/backend/pollSync';
import { loadJson, saveJson, storageKeys } from './src/storage/localStorage';
import { ActivityKey, ActivityVote, PartyMember, PartyState, PivoState, SectionKey, UserProfile } from './src/types';
import {
  firebaseAuth,
  firebaseEnabled,
  googleWebClientId,
} from './src/backend/firebase';

const sectionKeys: SectionKey[] = ['obed', 'pivo', 'kolo', 'kronika', 'zpravy', 'profil', 'party'];
const defaultProfile: UserProfile = {
  name: 'Marek',
  avatarInitial: 'M',
  avatarColor: '#F8B84E',
  notificationsEnabled: true,
};
const defaultParty: PartyState = {
  name: 'Parta Vyškov',
  city: 'Vyškov',
  members: [
    { uid: 'legacy-marek', displayName: 'Marek', source: 'legacy' },
    { uid: 'legacy-tomas', displayName: 'Tomáš', source: 'legacy' },
    { uid: 'legacy-pavel', displayName: 'Pavel', source: 'legacy' },
  ],
  inviteCode: 'OPK-VYSKOV',
};

type PartySyncMode = 'ready' | 'joining';

function isSectionKey(value: unknown): value is SectionKey {
  return typeof value === 'string' && sectionKeys.includes(value as SectionKey);
}

function normalizeProfile(value: Partial<UserProfile> | null): UserProfile {
  const name = typeof value?.name === 'string' && value.name.trim() ? value.name : defaultProfile.name;
  const initial =
    typeof value?.avatarInitial === 'string' && value.avatarInitial.trim()
      ? value.avatarInitial.trim().slice(0, 1).toUpperCase()
      : name.trim().slice(0, 1).toUpperCase();

  return {
    name,
    avatarInitial: initial || defaultProfile.avatarInitial,
    avatarColor:
      typeof value?.avatarColor === 'string' && value.avatarColor.trim()
        ? value.avatarColor
        : defaultProfile.avatarColor,
    notificationsEnabled:
      typeof value?.notificationsEnabled === 'boolean'
        ? value.notificationsEnabled
        : defaultProfile.notificationsEnabled,
  };
}

function normalizePartyMembers(value: unknown): PartyMember[] {
  if (!Array.isArray(value)) {
    return defaultParty.members;
  }

  const mapped: PartyMember[] = [];

  value.forEach((member, index) => {
    if (typeof member === 'string') {
      const displayName = member.trim();
      if (!displayName) {
        return;
      }

      mapped.push({
        uid: `legacy-${index}-${displayName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        displayName,
        email: null,
        source: 'legacy',
      });
      return;
    }

    if (
      member &&
      typeof member === 'object' &&
      typeof (member as Record<string, unknown>).uid === 'string' &&
      typeof (member as Record<string, unknown>).displayName === 'string'
    ) {
      const record = member as Record<string, string | unknown>;
      const uid = (record.uid as string).trim();
      const displayName = (record.displayName as string).trim();

      if (!uid || !displayName) {
        return;
      }

      const rawSource = record.source;
      const source =
        typeof rawSource === 'string' && (rawSource === 'google' || rawSource === 'manual' || rawSource === 'legacy')
          ? (rawSource as PartyMember['source'])
          : 'legacy';
      mapped.push({
        uid,
        displayName,
        email: typeof record.email === 'string' ? record.email : null,
        source,
      });
    }
  });

  return mapped.length > 0 ? mapped : defaultParty.members;
}

function normalizeParty(value: Partial<PartyState> | null): PartyState {
  return {
    name: typeof value?.name === 'string' ? value.name : defaultParty.name,
    city: typeof value?.city === 'string' ? value.city : defaultParty.city,
    members: normalizePartyMembers(value?.members),
    inviteCode:
      typeof value?.inviteCode === 'string' && value.inviteCode.trim()
        ? value.inviteCode
        : defaultParty.inviteCode,
  };
}

function normalizePartyCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function makePartyCode(baseName: string, city: string) {
  const compactBase = `${baseName} ${city}`
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
  const base = compactBase || 'OPK';
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `${base}OPK${suffix}`;
}

function makePartyMember(user: { uid: string; displayName: string; email: string | null }, profile: UserProfile): PartyMember {
  const displayName = profile.name.trim() !== defaultProfile.name ? profile.name.trim() : user.displayName.trim();

  return {
    uid: user.uid,
    displayName: displayName || user.email || 'Google uživatel',
    email: user.email,
    source: 'google',
  };
}

function mergeCurrentMember(party: PartyState, firebaseUser: { uid: string; displayName: string; email: string | null }, profile: UserProfile) {
  const member = makePartyMember(firebaseUser, profile);

  return party.members.some((item) => item.uid === member.uid)
    ? party
    : {
        ...party,
        members: [...party.members, member],
      };
}

function arePartyMembersEqual(first: PartyMember[], second: PartyMember[]) {
  return (
    first.length === second.length &&
    first.every((member, index) => {
      const other = second[index];
      return (
        member.uid === other.uid &&
        member.displayName === other.displayName &&
        (member.email || null) === (other.email || null) &&
        (member.source || 'legacy') === (other.source || 'legacy')
      );
    })
  );
}

export default function App() {
  const [selectedSection, setSelectedSection] = useState<SectionKey>('pivo');
  const [menuOpen, setMenuOpen] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [authGateDismissed, setAuthGateDismissed] = useState(false);
  const [partySyncMode, setPartySyncMode] = useState<PartySyncMode>('ready');
  const [joinTargetCode, setJoinTargetCode] = useState<string | null>(null);
  const [partySyncError, setPartySyncError] = useState<string | null>(null);
  const [partySyncDebug, setPartySyncDebug] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [party, setParty] = useState<PartyState>(defaultParty);
  const [firebaseUser, setFirebaseUser] = useState<null | { uid: string; displayName: string; email: string | null; photoURL: string | null }>(null);
  const googleClientIdReady = !!googleWebClientId;

  useEffect(() => {
    let mounted = true;

    Promise.all([
      loadJson<SectionKey>(storageKeys.selectedSection),
      loadJson<Partial<UserProfile>>(storageKeys.profile),
      loadJson<Partial<PartyState>>(storageKeys.party),
    ]).then(([savedSection, savedProfile, savedParty]) => {
      if (mounted && isSectionKey(savedSection)) {
        setSelectedSection(savedSection);
      }

      if (mounted) {
        setProfile(normalizeProfile(savedProfile));
        setParty(normalizeParty(savedParty));
        setStorageReady(true);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!firebaseAuth) {
      return;
    }

    return onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) {
        setFirebaseUser(null);
        return;
      }

      setFirebaseUser({
        uid: user.uid,
        displayName: user.displayName || user.email || 'Google uživatel',
        email: user.email,
        photoURL: user.photoURL,
      });
    });
  }, []);

  useEffect(() => {
    if (storageReady) {
      saveJson(storageKeys.selectedSection, selectedSection);
      saveJson(storageKeys.profile, profile);
      if (partySyncMode !== 'joining' && !joinTargetCode) {
        saveJson(storageKeys.party, party);
      }
    }
  }, [joinTargetCode, party, partySyncMode, profile, selectedSection, storageReady]);

  useEffect(() => {
    if (storageReady && firebaseEnabled && firebaseUser && partySyncMode === 'ready') {
      void savePartySync(party).catch((error: unknown) => {
        setPartySyncError(error instanceof Error ? error.message : 'Nepovedlo se uložit party do Firebase.');
      });
      setPartySyncDebug(`Uloženo: ${party.name} / ${party.city} / ${party.inviteCode}`);
    }
  }, [firebaseUser, party, partySyncMode, storageReady]);

  useEffect(() => {
    if (!storageReady || !firebaseUser) {
      return;
    }

    const preferredName = profile.name.trim() !== defaultProfile.name ? profile.name.trim() : firebaseUser.displayName.trim();

    if (!preferredName) {
      return;
    }

    setProfile((current) =>
      current.name === defaultProfile.name
        ? normalizeProfile({
            ...current,
            name: preferredName,
          })
        : current,
    );
  }, [firebaseUser, profile.name, storageReady]);

  useEffect(() => {
    if (!storageReady || !firebaseUser) {
      return;
    }

    const member = makePartyMember(firebaseUser, profile);

    if (!member.displayName.trim()) {
      return;
    }

    setParty((current) =>
      current.members.some((item) => item.uid === member.uid)
        ? current
        : {
            ...current,
            members: [...current.members, member],
          },
    );
  }, [firebaseUser, profile.name, storageReady]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    if (!firebaseEnabled || !firebaseUser || joinTargetCode) {
      return;
    }

    const unsubscribe = subscribePartySync(
      party.inviteCode,
      (remoteParty) => {
      const mergedRemoteParty = mergeCurrentMember(remoteParty, firebaseUser, profile);

      setParty((current) => {
        if (
          current.name === mergedRemoteParty.name &&
          current.city === mergedRemoteParty.city &&
          current.inviteCode === mergedRemoteParty.inviteCode &&
          arePartyMembersEqual(current.members, mergedRemoteParty.members)
        ) {
          return current;
        }

        return mergedRemoteParty;
      });
      setPartySyncMode('ready');
      setPartySyncError(null);
      setPartySyncDebug(`Načteno: ${mergedRemoteParty.name} / ${mergedRemoteParty.city} / ${mergedRemoteParty.inviteCode}`);
      },
      (error) => {
        setPartySyncError(error.message);
        setPartySyncMode('ready');
      },
    );

    return unsubscribe;
  }, [firebaseUser, joinTargetCode, party.inviteCode, storageReady]);

  useEffect(() => {
    if (!storageReady || !firebaseEnabled || !firebaseUser || !joinTargetCode) {
      return;
    }

    let mounted = true;
    const timeout = setTimeout(() => {
      if (!mounted) {
        return;
      }

      setPartySyncError(`Party ${joinTargetCode} se ve Firebase nenašla.`);
    }, 5000);

    const unsubscribe = subscribePartySync(
      joinTargetCode,
      (remoteParty) => {
        if (!mounted) {
          return;
        }

      const mergedRemoteParty = mergeCurrentMember(remoteParty, firebaseUser, profile);

      setParty(mergedRemoteParty);
      setPartySyncMode('ready');
      setJoinTargetCode(null);
      setPartySyncError(null);
      setPartySyncDebug(`Načteno: ${mergedRemoteParty.name} / ${mergedRemoteParty.city} / ${mergedRemoteParty.inviteCode}`);
      },
      (error) => {
        if (!mounted) {
          return;
        }

        setPartySyncError(error.message);
        setPartySyncMode('ready');
      },
    );

    void fetchPartySync(joinTargetCode)
      .then((remoteParty) => {
        if (!mounted || !remoteParty) {
          return;
        }

        setParty(remoteParty);
        setPartySyncMode('ready');
        setJoinTargetCode(null);
        setPartySyncError(null);
        setPartySyncDebug(`Načteno: ${remoteParty.name} / ${remoteParty.city} / ${remoteParty.inviteCode}`);
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }

        setPartySyncError(error instanceof Error ? error.message : 'Nepovedlo se načíst party z Firebase.');
        setPartySyncMode('ready');
      });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      unsubscribe();
    };
  }, [firebaseUser, joinTargetCode, storageReady]);

  const selectedActivity = useMemo<ActivityKey>(
    () =>
      selectedSection === 'obed' || selectedSection === 'pivo' || selectedSection === 'kolo'
        ? selectedSection
        : 'pivo',
    [selectedSection],
  );

  const activeActivity = activityMeta[selectedActivity];
  const activePartyCode = joinTargetCode ?? party.inviteCode;
  const showAuthGate = storageReady && firebaseEnabled && !firebaseUser && !authGateDismissed;

  const handleCreateParty = () => {
    const creator =
      firebaseUser
        ? makePartyMember({ uid: firebaseUser.uid, displayName: firebaseUser.displayName, email: firebaseUser.email }, profile)
        : {
            uid: 'legacy-creator',
            displayName: profile.name.trim() !== defaultProfile.name ? profile.name.trim() : 'Marek',
            source: 'manual' as const,
          };

    setJoinTargetCode(null);
    setPartySyncError(null);
    const nextParty = {
      ...party,
      inviteCode: makePartyCode(party.name, party.city),
      members: [creator],
    };

    setParty(nextParty);
    setPartySyncMode('ready');

    if (firebaseEnabled && firebaseUser) {
      void savePartySync(nextParty).catch((error: unknown) => {
        setPartySyncError(error instanceof Error ? error.message : 'Nepovedlo se založit party ve Firebase.');
      });
    }
  };

  const handleJoinParty = (inviteCode: string) => {
    const normalized = normalizePartyCode(inviteCode);
    if (!normalized) {
      return;
    }

    setJoinTargetCode(normalized);
    setPartySyncError(null);
    setPartySyncDebug(null);
    setPartySyncMode('joining');
  };

  if (showAuthGate) {
    return (
      <AuthGateScreen
        signInCard={<GoogleAuthCard enabled={firebaseEnabled && googleClientIdReady && !firebaseUser} />}
        onContinue={() => setAuthGateDismissed(true)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
              <OpkLogo />
              <Pressable style={styles.partyPill} onPress={() => setSelectedSection('party')}>
              <Text style={styles.partyLabel}>Parta</Text>
              <Text style={styles.partyName}>{partySyncMode === 'joining' ? 'Načítám…' : party.name}</Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color="#6B7280" />
            </Pressable>
          </View>
          <Pressable style={styles.menuButton} onPress={() => setMenuOpen((open) => !open)}>
            <MaterialCommunityIcons name="menu" size={24} color="#111827" />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
          {selectedSection === 'pivo' && (
            <PivoScreen
              accent={activeActivity.accent}
              partyCode={activePartyCode}
              canSync={firebaseEnabled && !!firebaseUser}
            />
          )}
          {selectedSection === 'obed' && (
            <ObedScreen
              accent={activeActivity.accent}
              partyCode={activePartyCode}
              canSync={firebaseEnabled && !!firebaseUser}
              viewerId={firebaseUser?.uid ?? null}
              viewerName={firebaseUser?.displayName ?? profile.name}
            />
          )}
          {selectedSection === 'kolo' && (
            <KoloScreen
              accent={activeActivity.accent}
              partyCode={activePartyCode}
              canSync={firebaseEnabled && !!firebaseUser}
              viewerId={firebaseUser?.uid ?? null}
              viewerName={firebaseUser?.displayName ?? profile.name}
            />
          )}
          {selectedSection === 'kronika' && (
            <KronikaScreen
              onBack={() => setSelectedSection(selectedActivity)}
              partyCode={activePartyCode}
              canSync={firebaseEnabled && !!firebaseUser}
            />
          )}
          {selectedSection === 'zpravy' && <ZpravyScreen onBack={() => setSelectedSection(selectedActivity)} />}
          {selectedSection === 'profil' && (
            <ProfilScreen
              onBack={() => setSelectedSection(selectedActivity)}
              party={party}
              profile={profile}
              firebaseUser={firebaseUser}
              googleAuthPanel={<GoogleAuthCard enabled={firebaseEnabled && googleClientIdReady && !firebaseUser} />}
              onSignOut={() => {
                if (firebaseAuth) {
                  void GoogleSignin.signOut();
                  void signOut(firebaseAuth);
                  setAuthGateDismissed(false);
                }
              }}
              onChangeProfile={setProfile}
            />
          )}
          {selectedSection === 'party' && (
            <PartyScreen
              onBack={() => setSelectedSection(selectedActivity)}
              party={party}
              canSync={firebaseEnabled && !!firebaseUser}
              onChangeParty={setParty}
              onCreateParty={handleCreateParty}
              onJoinParty={handleJoinParty}
              isJoining={partySyncMode === 'joining'}
              syncError={partySyncError}
              joinTargetCode={joinTargetCode}
            />
          )}
        </ScrollView>

        {menuOpen && (
          <AppMenu
            onClose={() => setMenuOpen(false)}
            onSelect={(section) => {
              setSelectedSection(section);
              setMenuOpen(false);
            }}
          />
        )}

        <View style={styles.bottomNav}>
          {navItems.map((item) => {
            const isActive = selectedSection === item.key;

            return (
              <Pressable
                key={item.key}
                onPress={() => setSelectedSection(item.key)}
                style={[styles.navButton, isActive && styles.navButtonActive]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={23}
                  color={isActive ? '#F8B84E' : '#6B7280'}
                />
                <Text style={[styles.navItem, isActive && styles.navItemActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function GoogleAuthCard({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!googleWebClientId) {
      return;
    }

    GoogleSignin.configure({
      webClientId: googleWebClientId,
    });
  }, []);

  if (!enabled || Platform.OS !== 'android') {
    return null;
  }

  const handleGoogleSignIn = async () => {
    if (!firebaseAuth) {
      return;
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response: SignInResponse = await GoogleSignin.signIn();
      if (response.type !== 'success' || !response.data.idToken) {
        return;
      }

      await signInWithCredential(firebaseAuth, GoogleAuthProvider.credential(response.data.idToken));
    } catch (error) {
      console.error('Google sign-in failed', error);
    }
  };

  return (
    <View style={styles.authBanner}>
      <View style={styles.authBannerCopy}>
        <Text style={styles.authBannerTitle}>Přihlášení</Text>
        <Text style={styles.authBannerText}>Google účet propojí partu, Pivo a Kroniku mezi telefony.</Text>
      </View>
      <Pressable style={styles.authButton} onPress={handleGoogleSignIn}>
        <MaterialCommunityIcons name="google" size={18} color="#15251F" />
        <Text style={styles.authButtonText}>Google</Text>
      </Pressable>
    </View>
  );
}

function AuthGateScreen({
  signInCard,
  onContinue,
}: {
  signInCard: ReactNode;
  onContinue: () => void;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.authGate}>
        <View style={styles.authGateHero}>
          <OpkLogo />
          <Text style={styles.authGateTitle}>Oběd Pivo Kolo</Text>
          <Text style={styles.authGateText}>
            Přihlas se přes Google, a party, Pivo a Kronika se propojí mezi telefony.
          </Text>
        </View>
        {signInCard}
        <Pressable style={styles.authGateContinue} onPress={onContinue}>
          <Text style={styles.authGateContinueText}>Pokračovat bez přihlášení</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ObedScreen({
  accent,
  partyCode,
  canSync,
  viewerId,
  viewerName,
}: {
  accent: string;
  partyCode: string;
  canSync: boolean;
  viewerId: string | null;
  viewerName: string;
}) {
  const restaurantsWithMenu = lunchRestaurants.filter((restaurant) => restaurant.items.length > 0);
  const [expandedRestaurants, setExpandedRestaurants] = useState<string[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [remoteVotes, setRemoteVotes] = useState<ActivityVote[]>([]);
  const [storageReady, setStorageReady] = useState(false);

  const toggleRestaurant = (restaurantName: string) => {
    setExpandedRestaurants((current) =>
      current.includes(restaurantName)
        ? current.filter((name) => name !== restaurantName)
        : [...current, restaurantName],
    );
  };

  useEffect(() => {
    let mounted = true;

    loadJson<string>(storageKeys.obedVote).then((savedChoice) => {
      if (!mounted) {
        return;
      }

      setSelectedRestaurant(typeof savedChoice === 'string' ? savedChoice : '');
      setStorageReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (storageReady) {
      saveJson(storageKeys.obedVote, selectedRestaurant);
    }
  }, [selectedRestaurant, storageReady]);

  useEffect(() => {
    if (!canSync) {
      return () => {};
    }

    const unsubscribe = subscribeActivityVotesSync(partyCode, 'obed', setRemoteVotes);
    return unsubscribe;
  }, [canSync, partyCode]);

  useEffect(() => {
    if (!storageReady || !canSync || !viewerId || !selectedRestaurant) {
      return;
    }

    void saveActivityVoteSync(partyCode, 'obed', {
      uid: viewerId,
      displayName: viewerName,
      choice: selectedRestaurant,
      updatedAt: new Date().toISOString(),
    });
  }, [canSync, partyCode, selectedRestaurant, storageReady, viewerId, viewerName]);

  const visibleVotes: ActivityVote[] = canSync
    ? [
        ...remoteVotes.filter((vote) => vote.uid !== viewerId),
        ...(selectedRestaurant
          ? [
              {
                uid: viewerId || 'local',
                displayName: viewerName,
                choice: selectedRestaurant,
                updatedAt: new Date().toISOString(),
              },
            ]
          : []),
      ]
    : selectedRestaurant
      ? [
          {
            uid: 'local',
            displayName: viewerName,
            choice: selectedRestaurant,
            updatedAt: new Date().toISOString(),
          },
        ]
      : [];

  const voteCounts = useMemo(() => {
    const counts = new Map<string, number>();

    visibleVotes.forEach((vote) => {
      counts.set(vote.choice, (counts.get(vote.choice) ?? 0) + 1);
    });

    return counts;
  }, [visibleVotes]);

  return (
    <>
      <View style={styles.statusPanelLight}>
        <Text style={styles.label}>Dnes</Text>
        <Text style={styles.darkStatusTitle}>Dnešní meníčka</Text>
        <Text style={styles.darkStatusText}>
          {restaurantsWithMenu.length} podniků s obědovou nabídkou ·{' '}
          {selectedRestaurant ? `hlasuješ pro ${selectedRestaurant}` : 'vyber si, kam jít'}
        </Text>
      </View>
      <ActivityPanel title="Oběd" action="Dáme oběd?" accent={accent} icon="silverware-fork-knife">
        <View style={styles.cardList}>
          <Text style={styles.subsectionTitle}>Vyškov · podobně jako na webu</Text>
          {restaurantsWithMenu.map((restaurant) => {
            const isExpanded = expandedRestaurants.includes(restaurant.name);

            return (
              <View key={restaurant.name} style={styles.restaurantCard}>
                <Pressable style={styles.restaurantHeader} onPress={() => toggleRestaurant(restaurant.name)}>
                  <View style={styles.restaurantTitleGroup}>
                    <Text style={styles.cardTitle}>{restaurant.name}</Text>
                    <Text style={styles.cardMeta}>{restaurant.items.length} položek v menu</Text>
                  </View>
                  <View style={styles.restaurantHeaderRight}>
                    <View style={styles.chipRow}>
                      {restaurant.delivery && (
                        <View style={styles.deliveryChip}>
                          <MaterialCommunityIcons name="truck-delivery-outline" size={12} color="#0369A1" />
                          <Text style={styles.deliveryChipText}>Rozvoz</Text>
                        </View>
                      )}
                      <Text style={styles.openChip}>Menu</Text>
                    </View>
                    <MaterialCommunityIcons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color="#6B7280"
                    />
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.menuRows}>
                    {restaurant.items.map((item, index) => (
                      <View key={`${restaurant.name}-${index}`} style={styles.menuRow}>
                        <View style={styles.menuTextGroup}>
                          <Text style={item.no ? styles.menuNumber : styles.soupLabel}>
                            {item.no || 'Polévka'}
                          </Text>
                          <Text style={styles.menuItemText}>{item.name}</Text>
                        </View>
                        {!!item.price && <Text style={styles.menuPrice}>{item.price}</Text>}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.collapsedMenuHint}>Klepni pro zobrazení meníčka</Text>
                )}

                <View style={styles.restaurantActions}>
                  <Pressable
                    onPress={() => setSelectedRestaurant(restaurant.name)}
                    style={[
                      styles.voteButton,
                      selectedRestaurant === restaurant.name && styles.voteButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.voteButtonText,
                        selectedRestaurant === restaurant.name && styles.voteButtonTextActive,
                      ]}
                    >
                      {selectedRestaurant === restaurant.name ? 'Tvůj hlas' : 'Hlasovat'}
                    </Text>
                  </Pressable>
                  <Text style={styles.voteCountText}>{voteCounts.get(restaurant.name) ?? 0} hlasů</Text>
                  <Text style={styles.voteText}>Otevřít na Meníčka.cz</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ActivityPanel>
    </>
  );
}

const defaultPivoState: PivoState = {
  place: 'Radegastovna Pirát',
  time: '19:00',
  note: 'jen na jedno',
  reply: 'Jdu',
  arrival: 'za 30 min',
};

function isPivoReply(value: unknown): value is PivoState['reply'] {
  return value === 'Jdu' || value === 'Možná' || value === 'Dnes ne';
}

function normalizePivoState(value: Partial<PivoState> | null): PivoState {
  return {
    place: typeof value?.place === 'string' ? value.place : defaultPivoState.place,
    time: typeof value?.time === 'string' ? value.time : defaultPivoState.time,
    note: typeof value?.note === 'string' ? value.note : defaultPivoState.note,
    reply: isPivoReply(value?.reply) ? value.reply : defaultPivoState.reply,
    arrival: typeof value?.arrival === 'string' ? value.arrival : defaultPivoState.arrival,
  };
}

function PivoScreen({
  accent,
  partyCode,
  canSync,
}: {
  accent: string;
  partyCode: string;
  canSync: boolean;
}) {
  const [place, setPlace] = useState(defaultPivoState.place);
  const [time, setTime] = useState(defaultPivoState.time);
  const [note, setNote] = useState(defaultPivoState.note);
  const [reply, setReply] = useState<PivoState['reply']>(defaultPivoState.reply);
  const [arrival, setArrival] = useState(defaultPivoState.arrival);
  const [editingPlan, setEditingPlan] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const arrivalOptions = ['Teď', 'Za 15 min', 'Za 30 min', 'V 19:30'];

  useEffect(() => {
    let mounted = true;

    loadJson<Partial<PivoState>>(storageKeys.pivoState).then((savedState) => {
      if (!mounted) {
        return;
      }

      const nextState = normalizePivoState(savedState);
      setPlace(nextState.place);
      setTime(nextState.time);
      setNote(nextState.note);
      setReply(nextState.reply);
      setArrival(nextState.arrival);
      setStorageReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (storageReady) {
      saveJson<PivoState>(storageKeys.pivoState, { place, time, note, reply, arrival });
    }
  }, [arrival, note, place, reply, storageReady, time]);

  useEffect(() => {
    if (!canSync) {
      return () => {};
    }

    const unsubscribe = subscribePivoSync(partyCode, (remoteState) => {
      setPlace(remoteState.place);
      setTime(remoteState.time);
      setNote(remoteState.note);
      setReply(remoteState.reply);
      setArrival(remoteState.arrival);
    });

    return unsubscribe;
  }, [canSync, partyCode]);

  useEffect(() => {
    if (storageReady && canSync) {
      void savePivoSync(partyCode, { place, time, note, reply, arrival });
    }
  }, [arrival, canSync, note, partyCode, place, reply, storageReady, time]);

  return (
    <>
      <View style={styles.statusPanelLight}>
        <Text style={styles.label}>Dnes</Text>
        <Text style={styles.darkStatusTitle}>Dáme pivo?</Text>
        <Text style={styles.darkStatusText}>
          Kde: {place || 'není vybráno'} · Kdy: {time || 'domluví se'}
        </Text>
      </View>
      <ActivityPanel title="Pivo" action="Dáme pivo?" accent={accent} icon="glass-mug-variant">
        <View style={styles.cardList}>
          <Text style={styles.subsectionTitle}>Pivo dneska</Text>
          <View style={styles.restaurantCard}>
            <View style={styles.planHeader}>
              <View style={styles.planIcon}>
                <MaterialCommunityIcons name="glass-mug-variant" size={26} color="#B45309" />
              </View>
              <View style={styles.planCopy}>
                <Text style={styles.cardTitle}>{place || 'Místo není vybráno'}</Text>
                <Text style={styles.cardMeta}>{time || 'čas se domluví'} · vyhlásil Marek</Text>
              </View>
            </View>
            {!!note && <Text style={styles.cardText}>{note}</Text>}
            <View style={styles.planActions}>
              <Pressable onPress={() => setEditingPlan((value) => !value)}>
                <Text style={styles.voteText}>{editingPlan ? 'Sbalit plán' : 'Upravit plán'}</Text>
              </Pressable>
              <Text style={styles.voteText}>Sdílet</Text>
            </View>
            <Text style={styles.localSaveText}>
              {canSync ? 'Sdíleno přes Firebase' : 'Uloženo jen v tomhle telefonu'}
            </Text>
          </View>

          {editingPlan && (
            <View style={styles.restaurantCard}>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Kde?</Text>
                <TextInput
                  value={place}
                  onChangeText={setPlace}
                  placeholder="Napiš podnik nebo místo"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Kdy?</Text>
                <TextInput
                  value={time}
                  onChangeText={setTime}
                  placeholder="Teď, 19:00, večer..."
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>
              <View style={styles.formField}>
                <Text style={styles.inputLabel}>Poznámka</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Třeba: jen na jedno"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textInput}
                />
              </View>
              <Pressable
                style={[styles.primaryButton, styles.fullWidthButton]}
                onPress={() => setEditingPlan(false)}
              >
                <MaterialCommunityIcons name="check" size={18} color="#1F2937" />
                <Text style={styles.primaryButtonText}>Uložit plán</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.subsectionTitle}>Moje odpověď</Text>
          <View style={styles.restaurantCard}>
            <View style={styles.replyRow}>
              {(['Jdu', 'Možná', 'Dnes ne'] as const).map((option) => {
                const isActive = reply === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => setReply(option)}
                    style={[styles.replyButton, isActive && styles.replyButtonActive]}
                  >
                    <Text style={[styles.replyButtonText, isActive && styles.replyButtonTextActive]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {reply === 'Jdu' && (
              <>
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
              </>
            )}
          </View>

          <Text style={styles.subsectionTitle}>Stav party</Text>
          {beerReplies.map((person) => (
            <View key={person.name} style={styles.rowCard}>
              <View>
                <Text style={styles.cardText}>{person.name}</Text>
                {!!person.arrival && <Text style={styles.cardMeta}>dorazí {person.arrival}</Text>}
              </View>
              <Text style={person.status === 'Jde' ? styles.goingStatus : styles.maybeStatus}>
                {person.status}
              </Text>
            </View>
          ))}
        </View>
      </ActivityPanel>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F1EA',
    paddingTop: Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 0,
  },
  appShell: {
    flex: 1,
  },
  screen: {
    gap: 16,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 112,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#F4F1EA',
    borderBottomColor: '#E6DED3',
    borderBottomWidth: 1,
    elevation: 3,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    zIndex: 5,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    gap: 10,
  },
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
  partyPill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DED8CF',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 11,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  partyLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  partyName: {
    color: '#111827',
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '900',
  },
  menuButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DED8CF',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 2,
    height: 38,
    justifyContent: 'center',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    width: 38,
  },
  statusPanel: {
    backgroundColor: '#15251F',
    borderRadius: 8,
    elevation: 5,
    gap: 18,
    padding: 18,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
  },
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
  labelOnDark: {
    color: '#C7D2FE',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  statusTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 6,
  },
  statusText: {
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
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
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#F8B84E',
    borderColor: '#F6D186',
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '900',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
  },
  sectionLink: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  detailPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    borderTopWidth: 5,
    elevation: 2,
    gap: 14,
    padding: 16,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  detailTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  detailTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  smallButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
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
  restaurantCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 1,
    padding: 14,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  restaurantHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 50,
  },
  restaurantTitleGroup: {
    flex: 1,
    flexShrink: 1,
  },
  restaurantHeaderRight: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  deliveryChip: {
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  deliveryChipText: {
    color: '#0369A1',
    fontSize: 11,
    fontWeight: '900',
  },
  openChip: {
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    color: '#166534',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  collapsedMenuHint: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },
  closedChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  beerVoteChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    color: '#92400E',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  beerTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  beerTag: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderRadius: 6,
    borderWidth: 1,
    color: '#9A3412',
    fontSize: 11,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
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
  fullWidthButton: {
    marginTop: 2,
  },
  planHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  planIcon: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  planCopy: {
    flex: 1,
  },
  planActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  replyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  replyButton: {
    alignItems: 'center',
    backgroundColor: '#FBFAF8',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  replyButtonActive: {
    backgroundColor: '#15251F',
    borderColor: '#15251F',
  },
  replyButtonText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  replyButtonTextActive: {
    color: '#FFFFFF',
  },
  arrivalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },
  arrivalChip: {
    backgroundColor: '#FBFAF8',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  arrivalChipActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F8B84E',
  },
  arrivalChipText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '900',
  },
  arrivalChipTextActive: {
    color: '#92400E',
  },
  goingStatus: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '900',
  },
  maybeStatus: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '900',
  },
  menuRows: {
    borderTopColor: '#E8E2DA',
    borderTopWidth: 1,
    marginTop: 12,
  },
  menuRow: {
    alignItems: 'flex-start',
    borderBottomColor: '#F0ECE6',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  menuTextGroup: {
    flex: 1,
    gap: 3,
  },
  menuNumber: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '900',
  },
  soupLabel: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
  },
  menuItemText: {
    color: '#1F2937',
    fontSize: 14,
    lineHeight: 19,
  },
  menuPrice: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    minWidth: 56,
    textAlign: 'right',
  },
  emptyMenuText: {
    backgroundColor: '#F9FAFB',
    borderRadius: 7,
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 12,
    padding: 11,
  },
  restaurantActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  cardTitle: {
    color: '#111827',
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
  },
  price: {
    color: '#0F766E',
    fontSize: 15,
    fontWeight: '900',
  },
  cardMeta: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 5,
  },
  cardText: {
    color: '#1F2937',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
  },
  voteText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
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
    backgroundColor: '#0F766E',
    borderColor: '#0F766E',
  },
  voteButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '900',
  },
  voteButtonTextActive: {
    color: '#FFFFFF',
  },
  voteCountText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
  },
  localSaveText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  authGate: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  authGateHero: {
    alignItems: 'center',
    marginBottom: 18,
  },
  authGateTitle: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 14,
    textAlign: 'center',
  },
  authGateText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    marginTop: 8,
    textAlign: 'center',
  },
  authGateContinue: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 10,
  },
  authGateContinueText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
  },
  authBanner: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 18,
    marginTop: 12,
    padding: 14,
  },
  authBannerCopy: {
    flex: 1,
  },
  authBannerTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  authBannerText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  authButton: {
    alignItems: 'center',
    backgroundColor: '#F8B84E',
    borderColor: '#F6D186',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  authButtonDisabled: {
    opacity: 0.5,
  },
  authButtonText: {
    color: '#15251F',
    fontSize: 14,
    fontWeight: '900',
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
  memoryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    padding: 15,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    padding: 15,
  },
  newsTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    borderRadius: 6,
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newsActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  menuOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  menuScrim: {
    backgroundColor: 'rgba(17, 24, 39, 0.32)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  menuPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 14,
    gap: 8,
    padding: 12,
    position: 'absolute',
    right: 20,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    top: 12,
    width: 274,
  },
  menuHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
  },
  menuTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  menuCloseButton: {
    alignItems: 'center',
    borderRadius: 7,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  menuItem: {
    alignItems: 'center',
    backgroundColor: '#FBFAF8',
    borderColor: '#EEE8DF',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    padding: 12,
  },
  menuItemIcon: {
    alignItems: 'center',
    backgroundColor: '#F4F1EA',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  menuItemCopy: {
    flex: 1,
  },
  menuItemTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  drawerItemText: {
    color: '#4B5563',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: 4,
  },
  menuFooter: {
    borderTopColor: '#EEF0F3',
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 10,
  },
  menuFooterText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  profilePanel: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    padding: 20,
  },
  profileAvatar: {
    backgroundColor: '#164E63',
    borderRadius: 32,
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    height: 64,
    lineHeight: 64,
    overflow: 'hidden',
    textAlign: 'center',
    width: 64,
  },
  profileName: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
  },
  profileMeta: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  profileStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 18,
    width: '100%',
  },
  profileStat: {
    backgroundColor: '#FBFAF8',
    borderColor: '#EEE8DF',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 10,
  },
  profileStatValue: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  profileStatLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
    textAlign: 'center',
  },
  activePartyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E1DBD2',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  activePartyTitle: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 6,
  },
  partyModeRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 14,
  },
  partyModeActive: {
    backgroundColor: '#15251F',
    borderRadius: 6,
    color: '#F8B84E',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  partyMembers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 14,
  },
  memberChip: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    color: '#374151',
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
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
    fontSize: 20,
    fontWeight: '900',
    marginTop: 5,
  },
  darkCardAction: {
    color: '#F8B84E',
    fontSize: 13,
    fontWeight: '900',
  },
  bottomNav: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DED8CF',
    borderRadius: 12,
    borderWidth: 1,
    bottom: 10,
    elevation: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    left: 18,
    padding: 8,
    position: 'absolute',
    right: 18,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minHeight: 60,
    paddingHorizontal: 2,
  },
  navButtonActive: {
    backgroundColor: '#15251F',
  },
  navItem: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 13,
    textAlign: 'center',
  },
  navItemActive: {
    color: '#FFFFFF',
  },
});
