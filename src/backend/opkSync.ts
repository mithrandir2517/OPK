import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  arrayRemove,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  orderBy,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { firestore, firebaseEnabled } from './firebase';
import {
  ActivityKey,
  ActivityRoundState,
  ObedState,
  PartyEvent,
  PartyEventType,
  PartyMember,
  PartyRef,
  PartyState,
  PivoState,
  SavedMemory,
} from '../types';
import { getRoundExpiresAt, isRoundExpired } from '../utils/roundExpiry';

const legacyDemoPartyCode = 'OPK-VYSKOV';

function isLegacyDemoPartyCode(inviteCode: string) {
  return inviteCode.trim() === legacyDemoPartyCode;
}

function isPartyEventType(value: unknown): value is PartyEventType {
  return (
    value === 'obed.round' ||
    value === 'obed.plan' ||
    value === 'obed.reply' ||
    value === 'obed.arrival' ||
    value === 'pivo.round' ||
    value === 'pivo.plan' ||
    value === 'pivo.reply' ||
    value === 'pivo.arrival' ||
    value === 'kolo.round' ||
    value === 'kolo.vote' ||
    value === 'kolo.arrival' ||
    value === 'party.created' ||
    value === 'party.joined'
  );
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

function mapPartyData(inviteCode: string, data: Record<string, unknown>): PartyState {
  const rawRounds = data.rounds && typeof data.rounds === 'object' ? (data.rounds as Record<string, unknown>) : {};
  const rounds: Partial<Record<ActivityKey, ActivityRoundState>> = {};

  (['obed', 'pivo', 'kolo'] as ActivityKey[]).forEach((activity) => {
    const rawRound = rawRounds[activity];
    if (!rawRound || typeof rawRound !== 'object') {
      return;
    }

    const record = rawRound as Record<string, unknown>;
    if (typeof record.open !== 'boolean') {
      return;
    }

    rounds[activity] = {
      open: record.open,
      openedAt: typeof record.openedAt === 'string' ? record.openedAt : '',
      expiresAt:
        typeof record.expiresAt === 'string' && record.expiresAt.trim()
          ? record.expiresAt.trim()
          : getRoundExpiresAt(typeof record.openedAt === 'string' ? record.openedAt : ''),
      openedByUid: typeof record.openedByUid === 'string' && record.openedByUid.trim() ? record.openedByUid : null,
      openedByName: typeof record.openedByName === 'string' ? record.openedByName : '',
      place: typeof record.place === 'string' ? record.place : '',
      time: typeof record.time === 'string' ? record.time : '',
      note: typeof record.note === 'string' ? record.note : '',
    };

    if (isRoundExpired(rounds[activity])) {
      delete rounds[activity];
    }
  });

  return {
    name: typeof data.name === 'string' ? data.name : 'Parta Vyškov',
    city: typeof data.city === 'string' ? data.city : 'Vyškov',
    members: normalizePartyMembers(data.members),
    inviteCode: typeof data.inviteCode === 'string' && data.inviteCode.trim() ? data.inviteCode : inviteCode,
    creatorUid: typeof data.creatorUid === 'string' && data.creatorUid.trim() ? data.creatorUid : null,
    rounds,
  };
}

function mapPartyRefData(data: Record<string, unknown>): PartyRef | null {
  if (
    typeof data.inviteCode !== 'string' ||
    typeof data.name !== 'string' ||
    typeof data.city !== 'string' ||
    typeof data.memberCount !== 'number' ||
    typeof data.updatedAt !== 'string'
  ) {
    return null;
  }

  if (isLegacyDemoPartyCode(data.inviteCode)) {
    return null;
  }

  if (data.name === 'Parta Vyškov' && data.city === 'Vyškov') {
    return null;
  }

  return {
    inviteCode: data.inviteCode,
    name: data.name,
    city: data.city,
    memberCount: data.memberCount,
    updatedAt: data.updatedAt,
    creatorUid: typeof data.creatorUid === 'string' && data.creatorUid.trim() ? data.creatorUid : null,
  };
}

function mapMemoryData(id: string, data: Record<string, unknown>): SavedMemory | null {
  if (typeof data.text !== 'string' || typeof data.activity !== 'string' || typeof data.createdAt !== 'string') {
    return null;
  }

  if (data.activity !== 'obed' && data.activity !== 'pivo' && data.activity !== 'kolo') {
    return null;
  }

  return {
    id,
    activity: data.activity,
    text: data.text,
    createdAt: data.createdAt,
  };
}

function normalizeObedState(value: Record<string, unknown> | undefined): ObedState | null {
  if (!value) {
    return null;
  }

  return {
    place: typeof value.place === 'string' ? value.place : '',
    time: typeof value.time === 'string' ? value.time : '',
    note: typeof value.note === 'string' ? value.note : '',
  };
}

export function subscribePartySync(
  inviteCode: string,
  onChange: (party: PartyState) => void,
  onError?: (error: Error) => void,
) {
  if (!firebaseEnabled || !firestore) {
    return () => {};
  }

  if (!inviteCode.trim()) {
    return () => {};
  }

  if (isLegacyDemoPartyCode(inviteCode)) {
    return () => {};
  }

  return onSnapshot(
    doc(firestore, 'parties', inviteCode),
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }

      if (snapshot.metadata.fromCache) {
        return;
      }

      onChange(mapPartyData(inviteCode, snapshot.data() as Record<string, unknown>));
    },
    (error) => {
      console.error('Party sync failed', error);
      onError?.(error as Error);
    },
  );
}

export async function fetchPartySync(inviteCode: string) {
  if (!firebaseEnabled || !firestore) {
    return null;
  }

  if (!inviteCode.trim()) {
    return null;
  }

  if (isLegacyDemoPartyCode(inviteCode)) {
    return null;
  }

  const snapshot = await getDocFromServer(doc(firestore, 'parties', inviteCode));

  if (!snapshot.exists()) {
    return null;
  }

  return mapPartyData(inviteCode, snapshot.data() as Record<string, unknown>);
}

export async function savePartySync(party: PartyState) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  if (!party.inviteCode.trim()) {
    return;
  }

  if (isLegacyDemoPartyCode(party.inviteCode)) {
    return;
  }

  const partyRef = doc(firestore, 'parties', party.inviteCode);

  await setDoc(
    partyRef,
    {
      name: party.name,
      city: party.city,
      inviteCode: party.inviteCode,
      creatorUid: party.creatorUid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  if (party.members.length > 0) {
    await updateDoc(partyRef, {
      members: arrayUnion(...party.members),
      updatedAt: serverTimestamp(),
    });
  }
}

export function subscribeUserPartyRefs(uid: string, onChange: (partyRefs: PartyRef[]) => void) {
  if (!firebaseEnabled || !firestore) {
    return () => {};
  }

  if (!uid.trim()) {
    return () => {};
  }

  const refsQuery = query(collection(firestore, 'users', uid, 'partyRefs'), orderBy('updatedAt', 'desc'));

  return onSnapshot(refsQuery, (snapshot) => {
    const nextPartyRefs = snapshot.docs
      .map((document) => mapPartyRefData(document.data() as Record<string, unknown>))
      .filter((item): item is PartyRef => item !== null);

    onChange(nextPartyRefs);
  });
}

export async function savePartyRefSync(uid: string, party: PartyState) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  if (!uid.trim() || !party.inviteCode.trim()) {
    return;
  }

  if (isLegacyDemoPartyCode(party.inviteCode)) {
    return;
  }

  await setDoc(
    doc(firestore, 'users', uid, 'partyRefs', party.inviteCode),
    {
      inviteCode: party.inviteCode,
      name: party.name,
      city: party.city,
      memberCount: party.members.length,
      updatedAt: new Date().toISOString(),
      creatorUid: party.creatorUid,
    },
    { merge: true },
  );
}

export async function savePushTokenSync(uid: string, token: string, enabled: boolean) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  await setDoc(
    doc(firestore, 'users', uid, 'pushTokens', token),
    {
      token,
      enabled,
      platform: 'android',
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function deletePushTokenSync(uid: string, token: string) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  await deleteDoc(doc(firestore, 'users', uid, 'pushTokens', token));
}

export async function recordPartyEventSync(event: Omit<PartyEvent, 'id' | 'createdAt'>) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  if (!event.partyCode.trim()) {
    return;
  }

  if (isLegacyDemoPartyCode(event.partyCode)) {
    return;
  }

  await addDoc(collection(firestore, 'parties', event.partyCode, 'events'), {
    ...event,
    createdAt: new Date().toISOString(),
  });
}

export function subscribePartyEventsSync(partyCode: string, onChange: (events: PartyEvent[]) => void) {
  if (!firebaseEnabled || !firestore) {
    return () => {};
  }

  if (!partyCode.trim()) {
    return () => {};
  }

  if (isLegacyDemoPartyCode(partyCode)) {
    return () => {};
  }

  const eventsQuery = query(
    collection(firestore, 'parties', partyCode, 'events'),
    orderBy('createdAt', 'desc'),
    limit(40),
  );

  return onSnapshot(eventsQuery, (snapshot) => {
    const nextEvents = snapshot.docs
      .map((document) => {
        const data = document.data() as Record<string, unknown>;

        if (
          typeof data.partyCode !== 'string' ||
          !isPartyEventType(data.type) ||
          typeof data.title !== 'string' ||
          typeof data.body !== 'string' ||
          typeof data.actorName !== 'string' ||
          typeof data.createdAt !== 'string'
        ) {
          return null;
        }

        const nextEvent: PartyEvent = {
          id: document.id,
          partyCode: data.partyCode,
          type: data.type,
          title: data.title,
          body: data.body,
          actorUid: typeof data.actorUid === 'string' ? data.actorUid : null,
          actorName: data.actorName,
          createdAt: data.createdAt,
        };

        if (data.activity === 'obed' || data.activity === 'pivo' || data.activity === 'kolo') {
          nextEvent.activity = data.activity;
        }

        return nextEvent;
      })
      .filter((item): item is PartyEvent => item !== null);

    onChange(nextEvents);
  });
}

export async function removePartyMemberSync(inviteCode: string, member: PartyMember) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  if (!inviteCode.trim()) {
    return;
  }

  if (isLegacyDemoPartyCode(inviteCode)) {
    return;
  }

  await updateDoc(doc(firestore, 'parties', inviteCode), {
    members: arrayRemove(member),
    updatedAt: serverTimestamp(),
  });
}

export async function deletePartySync(inviteCode: string) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  if (!inviteCode.trim()) {
    return;
  }

  if (isLegacyDemoPartyCode(inviteCode)) {
    return;
  }

  await deleteDoc(doc(firestore, 'parties', inviteCode));
}

export async function deletePartyRefSync(uid: string, inviteCode: string) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  if (!uid.trim() || !inviteCode.trim()) {
    return;
  }

  if (isLegacyDemoPartyCode(inviteCode)) {
    return;
  }

  await deleteDoc(doc(firestore, 'users', uid, 'partyRefs', inviteCode));
}

export function subscribePivoSync(inviteCode: string, onChange: (pivoState: PivoState) => void) {
  if (!firebaseEnabled || !firestore) {
    return () => {};
  }

  if (!inviteCode.trim()) {
    return () => {};
  }

  if (isLegacyDemoPartyCode(inviteCode)) {
    return () => {};
  }

  return onSnapshot(doc(firestore, 'parties', inviteCode), (snapshot) => {
    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data() as Record<string, unknown>;
    const pivoState = data.pivoState as Record<string, unknown> | undefined;

    if (!pivoState) {
      return;
    }

    onChange({
      place: typeof pivoState.place === 'string' ? pivoState.place : 'Radegastovna Pirát',
      time: typeof pivoState.time === 'string' ? pivoState.time : '19:00',
      note: typeof pivoState.note === 'string' ? pivoState.note : 'jen na jedno',
      reply: 'Jdu',
      arrival: 'za 30 min',
    });
  });
}

export function subscribeObedSync(inviteCode: string, onChange: (obedState: ObedState) => void) {
  if (!firebaseEnabled || !firestore) {
    return () => {};
  }

  if (!inviteCode.trim()) {
    return () => {};
  }

  if (isLegacyDemoPartyCode(inviteCode)) {
    return () => {};
  }

  return onSnapshot(doc(firestore, 'parties', inviteCode), (snapshot) => {
    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data() as Record<string, unknown>;
    const obedState = normalizeObedState(data.obedState as Record<string, unknown> | undefined);

    if (!obedState) {
      return;
    }

    onChange(obedState);
  });
}

export async function savePivoSync(inviteCode: string, pivoState: PivoState) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  if (!inviteCode.trim()) {
    return;
  }

  if (isLegacyDemoPartyCode(inviteCode)) {
    return;
  }

  await setDoc(
    doc(firestore, 'parties', inviteCode),
    {
      pivoState: {
        place: pivoState.place,
        time: pivoState.time,
        note: pivoState.note,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveActivityRoundSync(
  inviteCode: string,
  activity: ActivityKey,
  round: ActivityRoundState,
) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  if (!inviteCode.trim()) {
    return;
  }

  if (isLegacyDemoPartyCode(inviteCode)) {
    return;
  }

  await setDoc(
    doc(firestore, 'parties', inviteCode),
    {
      rounds: {
        [activity]: round,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function cancelActivityRoundSync(inviteCode: string, activity: ActivityKey) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  if (!inviteCode.trim()) {
    return;
  }

  if (isLegacyDemoPartyCode(inviteCode)) {
    return;
  }

  await updateDoc(doc(firestore, 'parties', inviteCode), {
    [`rounds.${activity}`]: deleteField(),
    updatedAt: serverTimestamp(),
  });
}

export async function saveObedSync(inviteCode: string, obedState: ObedState) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  if (!inviteCode.trim()) {
    return;
  }

  if (isLegacyDemoPartyCode(inviteCode)) {
    return;
  }

  await setDoc(
    doc(firestore, 'parties', inviteCode),
    {
      obedState: {
        place: obedState.place,
        time: obedState.time,
        note: obedState.note,
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeMemorySync(inviteCode: string, onChange: (memories: SavedMemory[]) => void) {
  if (!firebaseEnabled || !firestore) {
    return () => {};
  }

  if (!inviteCode.trim()) {
    return () => {};
  }

  const memoriesQuery = query(
    collection(firestore, 'parties', inviteCode, 'memories'),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(memoriesQuery, (snapshot) => {
    const nextMemories = snapshot.docs
      .map((document) => mapMemoryData(document.id, document.data() as Record<string, unknown>))
      .filter((item): item is SavedMemory => item !== null);

    if (nextMemories.length > 0) {
      onChange(nextMemories);
    }
  });
}

export async function addMemorySync(inviteCode: string, memory: SavedMemory) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  if (!inviteCode.trim()) {
    return;
  }

  await addDoc(collection(firestore, 'parties', inviteCode, 'memories'), {
    activity: memory.activity,
    text: memory.text,
    createdAt: memory.createdAt,
  });
}
