import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
  View,
  StatusBar as NativeStatusBar,
} from 'react-native';
import * as Notifications from 'expo-notifications';
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
  deletePartyRefSync,
  deletePartySync,
  deletePushTokenSync,
  fetchPartySync,
  recordPartyEventSync,
  removePartyMemberSync,
  saveObedSync,
  savePartySync,
  savePartyRefSync,
  savePushTokenSync,
  savePivoSync,
  subscribeUserPartyRefs,
  subscribeObedSync,
  subscribePartySync,
  subscribePivoSync,
} from './src/backend/opkSync';
import { saveActivityVoteSync, subscribeActivityVotesSync } from './src/backend/pollSync';
import { loadJson, removeJson, saveJson, storageKeys } from './src/storage/localStorage';
import { ActivityKey, ActivityVote, PartyMember, PartyRef, PartyState, PivoState, SectionKey, UserProfile } from './src/types';
import { registerForPushNotificationsAsync } from './src/backend/pushNotifications';
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
  name: '',
  city: '',
  members: [],
  inviteCode: '',
  creatorUid: null,
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
    return [];
  }

  const mapped: PartyMember[] = [];
  const seen = new Set<string>();

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

  return mapped.filter((member) => {
    if (seen.has(member.uid)) {
      return false;
    }

    seen.add(member.uid);
    return true;
  });
}

function normalizeParty(value: Partial<PartyState> | null): PartyState {
  const inviteCode = typeof value?.inviteCode === 'string' ? value.inviteCode.trim() : '';

  if (!inviteCode) {
    return defaultParty;
  }

  return {
    name: typeof value?.name === 'string' ? value.name : '',
    city: typeof value?.city === 'string' ? value.city : '',
    members: normalizePartyMembers(value?.members),
    creatorUid: typeof value?.creatorUid === 'string' && value.creatorUid.trim() ? value.creatorUid : null,
    inviteCode,
  };
}

function isLegacyPlaceholderParty(value: Partial<PartyState> | null) {
  return (
    value?.inviteCode === 'OPK-VYSKOV' ||
    (typeof value?.name === 'string' && value.name.trim() === 'Parta Vyškov') ||
    (typeof value?.city === 'string' && value.city.trim() === 'Vyškov')
  );
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

type NotificationRoute = {
  section: SectionKey;
  partyCode: string | null;
};

function readNotificationRoute(data: Record<string, unknown> | undefined): NotificationRoute | null {
  if (!data) {
    return null;
  }

  const rawActivity = typeof data.activity === 'string'
    ? data.activity.trim()
    : typeof data.eventType === 'string'
      ? data.eventType.trim().split('.')[0]
      : '';
  const partyCode = typeof data.partyCode === 'string' ? normalizePartyCode(data.partyCode) : null;

  if (rawActivity === 'obed' || rawActivity === 'pivo' || rawActivity === 'kolo') {
    return {
      section: rawActivity,
      partyCode,
    };
  }

  return null;
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

function animatePartySwap() {
  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

export default function App() {
  const [selectedSection, setSelectedSection] = useState<SectionKey>('pivo');
  const [menuOpen, setMenuOpen] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [authGateDismissed, setAuthGateDismissed] = useState(false);
  const [partySyncMode, setPartySyncMode] = useState<PartySyncMode>('ready');
  const [joinTargetCode, setJoinTargetCode] = useState<string | null>(null);
  const [partySyncError, setPartySyncError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [party, setParty] = useState<PartyState>(defaultParty);
  const [partyRefs, setPartyRefs] = useState<PartyRef[]>([]);
  const [partyRefsReady, setPartyRefsReady] = useState(false);
  const [expandedPartyCode, setExpandedPartyCode] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<null | { uid: string; displayName: string; email: string | null; photoURL: string | null }>(null);
  const googleClientIdReady = !!googleWebClientId;
  const pivoReplySnapshot = useRef({ place: defaultPivoState.place, time: defaultPivoState.time, note: defaultPivoState.note, reply: defaultPivoState.reply, arrival: defaultPivoState.arrival });
  const pivoSuppressEvent = useRef(false);
  const pushOwnerUid = useRef<string | null>(null);
  const pushTokenRef = useRef<string | null>(null);
  const pendingNotificationRoute = useRef<NotificationRoute | null>(null);
  const isPlaceholderParty =
    party.inviteCode === defaultParty.inviteCode &&
    party.name === defaultParty.name &&
    party.city === defaultParty.city &&
    arePartyMembersEqual(party.members, defaultParty.members);
  const showEmptyPartyState = partyRefsReady && partyRefs.length === 0 && isPlaceholderParty;
  const noRealParty = showEmptyPartyState && !joinTargetCode && !expandedPartyCode;
  const canPersistParty = !firebaseUser || partyRefsReady;

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
        if (isLegacyPlaceholderParty(savedParty) || !savedParty?.inviteCode?.trim()) {
          setParty(defaultParty);
          void removeJson(storageKeys.party);
        } else {
          setParty(normalizeParty(savedParty));
        }
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
      if (noRealParty) {
        void removeJson(storageKeys.party);
      } else if (canPersistParty && partySyncMode !== 'joining' && !joinTargetCode) {
        saveJson(storageKeys.party, party);
      }
    }
  }, [canPersistParty, joinTargetCode, noRealParty, party, partySyncMode, profile, selectedSection, storageReady]);

  useEffect(() => {
    if (storageReady && firebaseEnabled && firebaseUser && canPersistParty && partySyncMode === 'ready' && !noRealParty) {
      void savePartySync(party).catch((error: unknown) => {
        setPartySyncError(error instanceof Error ? error.message : 'Nepovedlo se uložit party do Firebase.');
      });
    }
  }, [canPersistParty, firebaseUser, noRealParty, party, partySyncMode, storageReady]);

  useEffect(() => {
    if (storageReady && firebaseEnabled && firebaseUser && canPersistParty && partySyncMode === 'ready' && !noRealParty) {
      void savePartyRefSync(firebaseUser.uid, party).catch((error: unknown) => {
        setPartySyncError(error instanceof Error ? error.message : 'Nepovedlo se uložit přehled party.');
      });
    }
  }, [canPersistParty, firebaseUser, noRealParty, party, partySyncMode, storageReady]);

  useEffect(() => {
    if (!storageReady || !firebaseUser || !canPersistParty || noRealParty) {
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
  }, [canPersistParty, firebaseUser, noRealParty, profile.name, storageReady]);

  useEffect(() => {
    if (!storageReady || !firebaseEnabled) {
      return;
    }

    let cancelled = false;

    const syncPushToken = async () => {
      if (!firebaseUser || !profile.notificationsEnabled) {
        if (pushTokenRef.current && pushOwnerUid.current) {
          await deletePushTokenSync(pushOwnerUid.current, pushTokenRef.current);
        }

        pushOwnerUid.current = null;
        pushTokenRef.current = null;
        return;
      }

      const token = await registerForPushNotificationsAsync();

      if (!token || cancelled) {
        return;
      }

      pushOwnerUid.current = firebaseUser.uid;
      pushTokenRef.current = token;
      await saveJson(storageKeys.pushToken, token);
      await savePushTokenSync(firebaseUser.uid, token, true);
    };

    void syncPushToken().catch((error: unknown) => {
      console.error('Push registration failed', error);
    });

    return () => {
      cancelled = true;
    };
  }, [firebaseUser, firebaseEnabled, profile.notificationsEnabled, storageReady]);

  useEffect(() => {
    if (!storageReady || !firebaseUser || !party.inviteCode.trim()) {
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
  }, [firebaseUser, party.inviteCode, profile.name, storageReady]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    if (!firebaseEnabled || !firebaseUser || joinTargetCode || noRealParty || !canPersistParty) {
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

        animatePartySwap();
        return mergedRemoteParty;
      });
      setPartySyncMode('ready');
      setPartySyncError(null);
      },
      (error) => {
        setPartySyncError(error.message);
        setPartySyncMode('ready');
      },
    );

    return unsubscribe;
  }, [canPersistParty, firebaseUser, joinTargetCode, noRealParty, party.inviteCode, storageReady]);

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

        animatePartySwap();
        setParty(mergedRemoteParty);
        setPartySyncMode('ready');
        setJoinTargetCode(null);
        setPartySyncError(null);
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

  useEffect(() => {
    if (!storageReady || !firebaseEnabled || !firebaseUser || !party.inviteCode.trim() || noRealParty) {
      return;
    }

    let mounted = true;

    void fetchPartySync(party.inviteCode).then((remoteParty) => {
      if (!mounted) {
        return;
      }

      if (!remoteParty) {
        setParty(defaultParty);
        setExpandedPartyCode(null);
        void removeJson(storageKeys.party);
      }
    });

    return () => {
      mounted = false;
    };
  }, [firebaseUser, firebaseEnabled, noRealParty, party.inviteCode, storageReady]);

  useEffect(() => {
    if (!firebaseUser) {
      setPartyRefs([]);
      setPartyRefsReady(true);
      return;
    }

    setPartyRefsReady(false);

    return subscribeUserPartyRefs(firebaseUser.uid, (refs) => {
      setPartyRefs(refs);
      setPartyRefsReady(true);
    });
  }, [firebaseUser]);

  const openNotificationRoute = useCallback(
    async (route: NotificationRoute) => {
      if (route.partyCode && route.partyCode !== party.inviteCode) {
        const selectedParty = await fetchPartySync(route.partyCode);

        if (selectedParty) {
          animatePartySwap();
          setJoinTargetCode(null);
          setPartySyncError(null);
          setPartySyncMode('ready');
          setExpandedPartyCode(selectedParty.inviteCode);
          setParty(selectedParty);
        }
      }

      setSelectedSection(route.section);
      setMenuOpen(false);
    },
    [party.inviteCode],
  );

  useEffect(() => {
    let mounted = true;

    const handleResponse = async (response: Notifications.NotificationResponse) => {
      const route = readNotificationRoute(
        response.notification.request.content.data as Record<string, unknown> | undefined,
      );

      if (!route || !mounted) {
        return;
      }

      if (!storageReady) {
        pendingNotificationRoute.current = route;
        return;
      }

      await openNotificationRoute(route);
    };

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        void handleResponse(response);
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleResponse(response);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [openNotificationRoute, storageReady]);

  useEffect(() => {
    if (!storageReady || !pendingNotificationRoute.current) {
      return;
    }

    const route = pendingNotificationRoute.current;
    pendingNotificationRoute.current = null;
    void openNotificationRoute(route);
  }, [openNotificationRoute, storageReady]);

  const selectedActivity = useMemo<ActivityKey>(
    () =>
      selectedSection === 'obed' || selectedSection === 'pivo' || selectedSection === 'kolo'
        ? selectedSection
        : 'pivo',
    [selectedSection],
  );

  const activeActivity = activityMeta[selectedActivity];
  const activePartyCode = joinTargetCode || expandedPartyCode || party.inviteCode || partyRefs[0]?.inviteCode || '';
  const hasActivePartyCode = !!activePartyCode;
  const showAuthGate = storageReady && firebaseEnabled && !firebaseUser && !authGateDismissed;

  const handleCreateParty = (draftParty: PartyState) => {
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
      ...draftParty,
      inviteCode: makePartyCode(draftParty.name, draftParty.city),
      members: [creator],
      creatorUid: firebaseUser?.uid ?? null,
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
    setPartySyncMode('joining');
  };

  const handleSelectParty = (inviteCode: string) => {
    if (!inviteCode || inviteCode === party.inviteCode) {
      return;
    }

    setPartySyncError(null);
    setJoinTargetCode(null);
    setPartySyncMode('ready');
    animatePartySwap();
    setExpandedPartyCode(inviteCode);

    void fetchPartySync(inviteCode)
      .then((selectedParty) => {
        if (!selectedParty) {
          setPartySyncError(`Party ${inviteCode} se ve Firebase nenašla.`);
          setExpandedPartyCode(party.inviteCode);
          return;
        }

        animatePartySwap();
        setParty(selectedParty);
        setExpandedPartyCode(selectedParty.inviteCode);
      })
      .catch((error: unknown) => {
        setPartySyncError(error instanceof Error ? error.message : 'Nepovedlo se načíst party z Firebase.');
        setExpandedPartyCode(party.inviteCode);
      });
  };

  const getNextPartyAfterCurrent = async () => {
    const nextRef = partyRefs.find((ref) => ref.inviteCode !== party.inviteCode);

    if (!nextRef) {
      animatePartySwap();
      setExpandedPartyCode(null);
      setParty(defaultParty);
      return;
    }

    const nextParty = await fetchPartySync(nextRef.inviteCode);

    if (!nextParty) {
      animatePartySwap();
      setExpandedPartyCode(null);
      setParty(defaultParty);
      return;
    }

    animatePartySwap();
    setExpandedPartyCode(nextRef.inviteCode);
    setParty(nextParty);
  };

  const handleLeaveParty = async () => {
    if (!firebaseUser) {
      return;
    }

    const currentMember = party.members.find((member) => member.uid === firebaseUser.uid);

    if (!currentMember) {
      return;
    }

    try {
      await removePartyMemberSync(party.inviteCode, currentMember);
      await deletePartyRefSync(firebaseUser.uid, party.inviteCode);
      await getNextPartyAfterCurrent();
    } catch (error: unknown) {
      setPartySyncError(error instanceof Error ? error.message : 'Nepovedlo se opustit party.');
    }
  };

  const handleDeleteParty = async () => {
    if (!firebaseUser || party.creatorUid !== firebaseUser.uid) {
      return;
    }

    try {
      await deletePartySync(party.inviteCode);
      await deletePartyRefSync(firebaseUser.uid, party.inviteCode);
      await getNextPartyAfterCurrent();
    } catch (error: unknown) {
      setPartySyncError(error instanceof Error ? error.message : 'Nepovedlo se smazat party.');
    }
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
              <Text style={styles.partyName}>
                {showEmptyPartyState ? 'Žádná party' : partySyncMode === 'joining' ? 'Načítám…' : party.name}
              </Text>
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
            canSync={firebaseEnabled && !!firebaseUser && !noRealParty && hasActivePartyCode}
            viewerId={firebaseUser?.uid ?? null}
            viewerName={firebaseUser?.displayName ?? profile.name}
            partyMembers={party.members}
          />
        )}
          {selectedSection === 'obed' && (
            <ObedScreen
              accent={activeActivity.accent}
              partyCode={activePartyCode}
              canSync={firebaseEnabled && !!firebaseUser && !noRealParty && hasActivePartyCode}
              viewerId={firebaseUser?.uid ?? null}
              viewerName={firebaseUser?.displayName ?? profile.name}
            />
          )}
          {selectedSection === 'kolo' && (
            <KoloScreen
              accent={activeActivity.accent}
              partyCode={activePartyCode}
              canSync={firebaseEnabled && !!firebaseUser && !noRealParty && hasActivePartyCode}
              viewerId={firebaseUser?.uid ?? null}
              viewerName={firebaseUser?.displayName ?? profile.name}
            />
          )}
          {selectedSection === 'kronika' && (
            <KronikaScreen
              onBack={() => setSelectedSection(selectedActivity)}
              partyCode={activePartyCode}
              canSync={firebaseEnabled && !!firebaseUser && !noRealParty && hasActivePartyCode}
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
              partyRefs={partyRefs}
              showEmptyState={showEmptyPartyState}
              expandedPartyCode={expandedPartyCode}
              viewerUid={firebaseUser?.uid ?? null}
              canSync={firebaseEnabled && !!firebaseUser}
              onChangeParty={setParty}
              onCreateParty={handleCreateParty}
              onJoinParty={handleJoinParty}
              onSelectParty={handleSelectParty}
              onLeaveParty={handleLeaveParty}
              onDeleteParty={handleDeleteParty}
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
  const [place, setPlace] = useState('');
  const [time, setTime] = useState('12:30');
  const [note, setNote] = useState('');
  const [reply, setReply] = useState<PivoState['reply']>('Jdu');
  const [arrival, setArrival] = useState('za 30 min');
  const [remoteReplies, setRemoteReplies] = useState<ActivityVote[]>([]);
  const [editingPlan, setEditingPlan] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [roundNotice, setRoundNotice] = useState('');
  const planSnapshot = useRef({ place: '', time: '12:30', note: '' });
  const replySnapshot = useRef({ reply: 'Jdu' as PivoState['reply'], arrival: 'za 30 min' });
  const roundNoticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleRestaurant = (restaurantName: string) => {
    setExpandedRestaurants((current) =>
      current.includes(restaurantName)
        ? current.filter((name) => name !== restaurantName)
        : [...current, restaurantName],
    );
  };

  useEffect(() => {
    let mounted = true;

    loadJson<Partial<{ place: string; time: string; note: string; reply: PivoState['reply']; arrival: string }> | string>(
      storageKeys.obedState,
    ).then((savedState) => {
      if (!mounted) {
        return;
      }

      if (typeof savedState === 'string') {
        setPlace(savedState);
        planSnapshot.current = { place: savedState, time: '12:30', note: '' };
      } else {
        setPlace(typeof savedState?.place === 'string' ? savedState.place : '');
        setTime(typeof savedState?.time === 'string' ? savedState.time : '12:30');
        setNote(typeof savedState?.note === 'string' ? savedState.note : '');
        planSnapshot.current = {
          place: typeof savedState?.place === 'string' ? savedState.place : '',
          time: typeof savedState?.time === 'string' ? savedState.time : '12:30',
          note: typeof savedState?.note === 'string' ? savedState.note : '',
        };
      }

      loadJson<string>(storageKeys.obedVote).then((savedLegacyChoice) => {
        if (!mounted || savedState) {
          return;
        }

        if (typeof savedLegacyChoice === 'string' && savedLegacyChoice.trim()) {
          setPlace(savedLegacyChoice);
          planSnapshot.current = { place: savedLegacyChoice, time: '12:30', note: '' };
        }
      });
      setStorageReady(true);
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (storageReady) {
      saveJson(storageKeys.obedState, { place, time, note });
    }
  }, [note, place, storageReady, time]);

  useEffect(() => {
    if (!storageReady || !canSync) {
      return;
    }

    void saveObedSync(partyCode, { place, time, note });
  }, [canSync, note, partyCode, place, storageReady, time]);

  useEffect(() => {
    if (!canSync) {
      return () => {};
    }

    const unsubscribe = subscribeActivityVotesSync(partyCode, 'obed', setRemoteReplies);
    return unsubscribe;
  }, [canSync, partyCode]);

  useEffect(() => {
    if (!canSync) {
      return () => {};
    }

    const unsubscribe = subscribeObedSync(partyCode, (remoteState) => {
      setPlace(remoteState.place);
      setTime(remoteState.time);
      setNote(remoteState.note);
      planSnapshot.current = {
        place: remoteState.place,
        time: remoteState.time,
        note: remoteState.note,
      };
    });

    return unsubscribe;
  }, [canSync, partyCode]);

  useEffect(() => {
    if (!viewerId) {
      return;
    }

    const ownVote = remoteReplies.find((person) => person.uid === viewerId);

    if (!ownVote) {
      return;
    }

    const nextReply = ownVote.choice === 'Možná' || ownVote.choice === 'Dnes ne' ? ownVote.choice : 'Jdu';
    const nextArrival = typeof ownVote.arrival === 'string' && ownVote.arrival.trim() ? ownVote.arrival : 'za 30 min';

    setReply(nextReply);
    setArrival(nextArrival);
    replySnapshot.current = { reply: nextReply, arrival: nextArrival };
  }, [remoteReplies, viewerId]);

  const visibleReplies = remoteReplies;
  const goingCount = visibleReplies.filter((person) => person.choice === 'Jdu').length;
  const maybeCount = visibleReplies.filter((person) => person.choice === 'Možná').length;
  const awayCount = visibleReplies.filter((person) => person.choice === 'Dnes ne').length;

  useEffect(() => {
    return () => {
      if (roundNoticeTimer.current) {
        clearTimeout(roundNoticeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!storageReady || !canSync || !viewerId) {
      replySnapshot.current = { reply, arrival };
      return;
    }

    const previous = replySnapshot.current;

    if (previous.reply !== reply) {
      void recordPartyEventSync({
        partyCode,
        type: 'obed.reply',
        activity: 'obed',
        actorUid: viewerId,
        actorName: viewerName,
        title: `${viewerName} odpověděl na oběd`,
        body: `Oběd: ${viewerName} změnil odpověď na ${reply}.`,
      });
    }

    if (reply === 'Jdu' && previous.arrival !== arrival) {
      void recordPartyEventSync({
        partyCode,
        type: 'obed.arrival',
        activity: 'obed',
        actorUid: viewerId,
        actorName: viewerName,
        title: `${viewerName} změnil čas oběda`,
        body: `Oběd: ${viewerName} přijde ${arrival}.`,
      });
    }

    void saveActivityVoteSync(partyCode, 'obed', {
      uid: viewerId,
      displayName: viewerName,
      choice: reply,
      arrival: reply === 'Jdu' ? arrival : undefined,
      updatedAt: new Date().toISOString(),
    });

    replySnapshot.current = { reply, arrival };
  }, [arrival, canSync, partyCode, reply, storageReady, viewerId, viewerName]);

  const handleSavePlan = () => {
    const nextPlan = { place, time, note };
    const previousPlan = planSnapshot.current;

    if (
      canSync &&
      viewerId &&
      (previousPlan.place !== nextPlan.place || previousPlan.time !== nextPlan.time || previousPlan.note !== nextPlan.note)
    ) {
      void recordPartyEventSync({
        partyCode,
        type: 'obed.plan',
        activity: 'obed',
        actorUid: viewerId,
        actorName: viewerName,
        title: `${viewerName} upravil oběd plán`,
        body: `Oběd: ${viewerName} upravil plán na ${nextPlan.place || 'místo'} · ${nextPlan.time || 'čas'} · ${
          nextPlan.note || 'bez poznámky'
        }.`,
      });
    }

    planSnapshot.current = nextPlan;
    setEditingPlan(false);
  };

  const announceRound = () => {
    if (roundNoticeTimer.current) {
      clearTimeout(roundNoticeTimer.current);
    }

    if (canSync && viewerId) {
      void recordPartyEventSync({
        partyCode,
        type: 'obed.round',
        activity: 'obed',
        actorUid: viewerId,
        actorName: viewerName,
        title: `${viewerName} vyhlásil oběd`,
        body: `Oběd: ${viewerName} spustil obědový round.`,
      });
    }

    setRoundNotice('Posláno partě');
    roundNoticeTimer.current = setTimeout(() => {
      setRoundNotice('');
    }, 2200);
  };

  return (
    <>
      <View style={styles.statusPanelLight}>
        <Text style={styles.label}>Dnes</Text>
        <Text style={styles.darkStatusTitle}>Dáme oběd?</Text>
        <Text style={styles.darkStatusText}>
          {place
            ? `${place} · ${time || 'čas se domluví'} · ${restaurantsWithMenu.length} podniků s obědovou nabídkou`
            : `${restaurantsWithMenu.length} podniků s obědovou nabídkou · vyber místo, čas nebo jen procházej menu`}
        </Text>
        <Text style={styles.darkStatusText}>Host nastaví plán. Ostatní jen odpoví níže.</Text>
        {!!roundNotice && <Text style={styles.roundNoticeText}>{roundNotice}</Text>}
      </View>
      <ActivityPanel
        title="Oběd"
        action="Dáme oběd?"
        accent={accent}
        icon="silverware-fork-knife"
        onActionPress={announceRound}
      >
        <View style={styles.cardList}>
          <Text style={styles.subsectionTitle}>Vyhlášení oběda</Text>
          <View style={styles.restaurantCard}>
            <View style={styles.planHeader}>
              <View style={styles.planIcon}>
                <MaterialCommunityIcons name="silverware-fork-knife" size={26} color="#0F766E" />
              </View>
              <View style={styles.planCopy}>
                <Text style={styles.cardTitle}>{place || 'Místo není vybráno'}</Text>
                <Text style={styles.cardMeta}>
                  {time || 'čas se domluví'} · {reply === 'Jdu' ? `dorazíš ${arrival}` : reply}
                </Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>Tady upravuje plán člověk, který oběd vyhlásil.</Text>
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
                  placeholder="Teď, 12:30, odpoledne..."
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
              <View style={styles.planActions}>
                <Pressable style={[styles.primaryButton, styles.inlineActionButton]} onPress={handleSavePlan}>
                  <MaterialCommunityIcons name="check" size={18} color="#1F2937" />
                  <Text style={styles.primaryButtonText}>Uložit plán</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallGhostButton, styles.inlineActionButton]}
                  onPress={() => setEditingPlan(false)}
                >
                  <Text style={styles.voteText}>Zrušit</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Text style={styles.subsectionTitle}>Moje odpověď</Text>
          <View style={styles.restaurantCard}>
            <Text style={styles.cardMeta}>Tohle je pro účastníky. Host sem nic neřeší.</Text>
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
                  {['Teď', 'Za 15 min', 'Za 30 min', 'V 19:30'].map((option) => {
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

          <Text style={styles.subsectionTitle}>
            {`Kdo jde${remoteReplies.length ? ` · ${goingCount} jdou · ${maybeCount} možná · ${awayCount} ne` : ''}`}
          </Text>
          {visibleReplies.map((person) => (
            <View key={`${person.uid}-${person.choice}`} style={styles.rowCard}>
              <View>
                <Text style={styles.cardText}>{person.displayName}</Text>
                {!!person.arrival && <Text style={styles.cardMeta}>dorazí {person.arrival}</Text>}
              </View>
              <Text style={person.choice === 'Jdu' ? styles.goingStatus : styles.maybeStatus}>
                {person.choice}
              </Text>
            </View>
          ))}

          <Text style={styles.subsectionTitle}>Meníčka.cz přehled</Text>
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
  viewerId,
  viewerName,
  partyMembers,
}: {
  accent: string;
  partyCode: string;
  canSync: boolean;
  viewerId: string | null;
  viewerName: string;
  partyMembers: PartyMember[];
}) {
  const [place, setPlace] = useState(defaultPivoState.place);
  const [time, setTime] = useState(defaultPivoState.time);
  const [note, setNote] = useState(defaultPivoState.note);
  const [reply, setReply] = useState<PivoState['reply']>(defaultPivoState.reply);
  const [arrival, setArrival] = useState(defaultPivoState.arrival);
  const [remoteVotes, setRemoteVotes] = useState<ActivityVote[]>([]);
  const [editingPlan, setEditingPlan] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [roundAnnounced, setRoundAnnounced] = useState(false);
  const [roundNotice, setRoundNotice] = useState('');
  const arrivalOptions = ['Teď', 'Za 15 min', 'Za 30 min', 'V 19:30'];
  const planSnapshot = useRef({
    place: defaultPivoState.place,
    time: defaultPivoState.time,
    note: defaultPivoState.note,
  });
  const pivoSnapshot = useRef({ reply: defaultPivoState.reply, arrival: defaultPivoState.arrival });
  const suppressPivoEvent = useRef(false);

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
      planSnapshot.current = {
        place: nextState.place,
        time: nextState.time,
        note: nextState.note,
      };
      pivoSnapshot.current = {
        reply: nextState.reply,
        arrival: nextState.arrival,
      };
      setRoundAnnounced(false);
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
      suppressPivoEvent.current = true;
    });

    return unsubscribe;
  }, [canSync, partyCode]);

  useEffect(() => {
    if (!canSync) {
      return () => {};
    }

    const unsubscribe = subscribeActivityVotesSync(partyCode, 'pivo', setRemoteVotes);
    return unsubscribe;
  }, [canSync, partyCode]);

  useEffect(() => {
    if (!viewerId) {
      return;
    }

    const ownVote = remoteVotes.find((person) => person.uid === viewerId);

    if (!ownVote) {
      return;
    }

    const nextReply = ownVote.choice === 'Možná' || ownVote.choice === 'Dnes ne' ? ownVote.choice : 'Jdu';
    const nextArrival = typeof ownVote.arrival === 'string' && ownVote.arrival.trim() ? ownVote.arrival : 'za 30 min';

    setReply(nextReply);
    setArrival(nextArrival);
    pivoSnapshot.current = { reply: nextReply, arrival: nextArrival };
  }, [remoteVotes, viewerId]);

  useEffect(() => {
    if (storageReady && canSync) {
      void savePivoSync(partyCode, { place, time, note, reply: 'Jdu', arrival: 'za 30 min' });
    }
  }, [canSync, note, partyCode, place, storageReady, time]);

  const announceRound = () => {
    if (canSync && viewerId) {
      void recordPartyEventSync({
        partyCode,
        type: 'pivo.round',
        activity: 'pivo',
        actorUid: viewerId,
        actorName: viewerName,
        title: `${viewerName} vyhlásil pivo`,
        body: `Pivo: ${viewerName} spustil pivo partu.`,
      });
    }

    setRoundAnnounced(true);
    setRoundNotice('Posláno partě');
    setTimeout(() => {
      setRoundNotice('');
    }, 2200);
  };

  const handleSavePlan = () => {
    const nextPlan = { place, time, note };
    const previousPlan = planSnapshot.current;

    if (
      canSync &&
      viewerId &&
      (previousPlan.place !== nextPlan.place || previousPlan.time !== nextPlan.time || previousPlan.note !== nextPlan.note)
    ) {
      void recordPartyEventSync({
        partyCode,
        type: 'pivo.plan',
        activity: 'pivo',
        actorUid: viewerId,
        actorName: viewerName,
        title: `${viewerName} upravil pivo plán`,
        body: `Pivo: ${viewerName} upravil plán na ${nextPlan.place || 'místo'} · ${nextPlan.time || 'čas'} · ${
          nextPlan.note || 'bez poznámky'
        }.`,
      });
    }

    planSnapshot.current = nextPlan;
    setEditingPlan(false);
  };

  useEffect(() => {
    if (!storageReady || !canSync || !viewerId) {
      pivoSnapshot.current = { reply, arrival };
      return;
    }

    if (suppressPivoEvent.current) {
      suppressPivoEvent.current = false;
      pivoSnapshot.current = { reply, arrival };
      return;
    }

    const previous = pivoSnapshot.current;

    if (previous.reply !== reply) {
      void recordPartyEventSync({
        partyCode,
        type: 'pivo.reply',
        activity: 'pivo',
        actorUid: viewerId,
        actorName: viewerName,
        title: `${viewerName} odpověděl na pivo`,
        body: `Pivo: ${viewerName} změnil odpověď na ${reply}.`,
      });
    }

    if (reply === 'Jdu' && previous.arrival !== arrival) {
      void recordPartyEventSync({
        partyCode,
        type: 'pivo.arrival',
        activity: 'pivo',
        actorUid: viewerId,
        actorName: viewerName,
        title: `${viewerName} změnil čas příchodu`,
        body: `Pivo: ${viewerName} přijde ${arrival}.`,
      });
    }

    void saveActivityVoteSync(partyCode, 'pivo', {
      uid: viewerId,
      displayName: viewerName,
      choice: reply,
      arrival: reply === 'Jdu' ? arrival : undefined,
      updatedAt: new Date().toISOString(),
    });

    pivoSnapshot.current = { reply, arrival };
  }, [arrival, canSync, partyCode, reply, storageReady, viewerId, viewerName]);

  const visibleVotes: ActivityVote[] = canSync
    ? partyMembers.map((member) => {
        const remoteVote = remoteVotes.find((vote) => vote.uid === member.uid);

        if (remoteVote) {
          return remoteVote;
        }

        if (member.uid === viewerId) {
          return {
            uid: viewerId || 'local',
            displayName: viewerName,
            choice: reply,
            arrival: reply === 'Jdu' ? arrival : undefined,
            updatedAt: new Date().toISOString(),
          };
        }

        return {
          uid: member.uid,
          displayName: member.displayName,
          choice: 'Čeká',
          updatedAt: new Date().toISOString(),
        };
      }).concat(
        remoteVotes.filter((vote) => !partyMembers.some((member) => member.uid === vote.uid)),
      )
    : [
        {
          uid: 'local',
          displayName: viewerName,
          choice: reply,
          arrival: reply === 'Jdu' ? arrival : undefined,
          updatedAt: new Date().toISOString(),
        },
      ];

  const voteCounts = useMemo(() => {
    const counts = new Map<string, number>();

    visibleVotes.forEach((vote) => {
      if (vote.choice === 'Jdu' || vote.choice === 'Možná' || vote.choice === 'Dnes ne') {
        counts.set(vote.choice, (counts.get(vote.choice) ?? 0) + 1);
      }
    });

    return counts;
  }, [visibleVotes]);

  const topSummary = `${voteCounts.get('Jdu') ?? 0} jdou · ${voteCounts.get('Možná') ?? 0} možná`;

  return (
    <>
      <View style={styles.statusPanelLight}>
        <Text style={styles.label}>Dnes</Text>
        <Text style={styles.darkStatusTitle}>{roundAnnounced ? 'Pivo vyhlášeno' : 'Dáme pivo?'}</Text>
        <Text style={styles.darkStatusText}>
          {roundAnnounced
            ? `Kde: ${place || 'není vybráno'} · Kdy: ${time || 'domluví se'} · ${topSummary}`
            : 'Pošli to partě a pak uprav místo, čas nebo odpovědi.'}
        </Text>
        {!!roundNotice && <Text style={styles.roundNoticeText}>{roundNotice}</Text>}
      </View>
      <ActivityPanel
        title="Pivo"
        action="Dáme pivo?"
        accent={accent}
        icon="glass-mug-variant"
        onActionPress={announceRound}
      >
        <View style={styles.cardList}>
          <Text style={styles.subsectionTitle}>Uprav plán a odpovědi</Text>
          <View style={styles.restaurantCard}>
            <View style={styles.planHeader}>
              <View style={styles.planIcon}>
                <MaterialCommunityIcons name="glass-mug-variant" size={26} color="#B45309" />
              </View>
              <View style={styles.planCopy}>
                <Text style={styles.cardTitle}>{place || 'Místo není vybráno'}</Text>
                <Text style={styles.cardMeta}>
                  {time || 'čas se domluví'} · vyhlášeno
                </Text>
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
                onPress={handleSavePlan}
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
          {visibleVotes.map((person) => (
            <View key={person.uid} style={styles.rowCard}>
              <View>
                <Text style={styles.cardText}>{person.displayName}</Text>
                {!!person.arrival && <Text style={styles.cardMeta}>dorazí {person.arrival}</Text>}
              </View>
              <Text
                style={
                  person.choice === 'Jdu'
                    ? styles.goingStatus
                    : person.choice === 'Čeká'
                      ? styles.waitingStatus
                      : styles.maybeStatus
                }
              >
                {person.choice}
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
    backgroundColor: '#FAFAF9',
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
    backgroundColor: '#FAFAF9',
    borderBottomColor: '#E7E5E4',
    borderBottomWidth: 1,
    elevation: 0,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    paddingBottom: 10,
    paddingHorizontal: 18,
    paddingTop: 10,
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
    borderColor: '#15251F',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 0,
    gap: 3,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 7,
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
    borderColor: '#E7E5E4',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 0,
    flexDirection: 'row',
    flexShrink: 1,
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 12,
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
    borderColor: '#E7E5E4',
    borderRadius: 999,
    borderWidth: 1,
    elevation: 0,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  statusPanel: {
    backgroundColor: '#15251F',
    borderRadius: 14,
    elevation: 0,
    gap: 18,
    padding: 18,
  },
  statusPanelLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 0,
    padding: 18,
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
    fontSize: 22,
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
    fontSize: 22,
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
  roundNoticeText: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#F8B84E',
    borderColor: '#F6D186',
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#1F2937',
    fontSize: 14,
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
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 0,
    gap: 14,
    padding: 18,
  },
  detailTitle: {
    color: '#111827',
    fontSize: 20,
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
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  restaurantCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 0,
    padding: 16,
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
  fullWidthButton: {
    marginTop: 2,
  },
  inlineActionButton: {
    flexGrow: 1,
  },
  smallGhostButton: {
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  planHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  planIcon: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
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
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    minHeight: 44,
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
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 999,
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
  waitingStatus: {
    color: '#6B7280',
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
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
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
  pickRestaurantButton: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  pickRestaurantButtonActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC',
  },
  pickRestaurantButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '800',
  },
  pickRestaurantButtonTextActive: {
    color: '#166534',
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
    borderColor: '#E7E5E4',
    borderRadius: 14,
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
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
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
    borderColor: '#E7E5E4',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  memoryCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E7E5E4',
    borderRadius: 12,
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
    borderColor: '#E7E5E4',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 0,
    gap: 8,
    padding: 12,
    position: 'absolute',
    right: 20,
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
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 11,
    padding: 12,
  },
  menuItemIcon: {
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
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
    borderTopColor: '#E5E7EB',
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
    borderColor: '#E7E5E4',
    borderRadius: 14,
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
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 12,
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
    borderColor: '#E7E5E4',
    borderRadius: 14,
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
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    borderRadius: 999,
    borderWidth: 1,
    color: '#374151',
    fontSize: 12,
    fontWeight: '900',
    flexDirection: 'row',
    gap: 6,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  inviteCard: {
    alignItems: 'center',
    backgroundColor: '#15251F',
    borderRadius: 14,
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
    borderColor: '#E7E5E4',
    borderRadius: 16,
    borderWidth: 1,
    bottom: 10,
    elevation: 0,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    left: 18,
    padding: 8,
    position: 'absolute',
    right: 18,
  },
  navButton: {
    alignItems: 'center',
    borderRadius: 12,
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
