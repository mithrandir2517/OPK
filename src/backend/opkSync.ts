import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { firestore, firebaseEnabled } from './firebase';
import { PartyMember, PartyState, PivoState, SavedMemory } from '../types';

function normalizePartyMembers(value: unknown): PartyMember[] {
  if (!Array.isArray(value)) {
    return [];
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

  return mapped;
}

function mapPartyData(inviteCode: string, data: Record<string, unknown>): PartyState {
  return {
    name: typeof data.name === 'string' ? data.name : 'Parta Vyškov',
    city: typeof data.city === 'string' ? data.city : 'Vyškov',
    members:
      normalizePartyMembers(data.members).length > 0
        ? normalizePartyMembers(data.members)
        : [
            { uid: 'legacy-marek', displayName: 'Marek', email: null, source: 'legacy' },
            { uid: 'legacy-tomas', displayName: 'Tomáš', email: null, source: 'legacy' },
            { uid: 'legacy-pavel', displayName: 'Pavel', email: null, source: 'legacy' },
          ],
    inviteCode: typeof data.inviteCode === 'string' && data.inviteCode.trim() ? data.inviteCode : inviteCode,
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

export function subscribePartySync(
  inviteCode: string,
  onChange: (party: PartyState) => void,
  onError?: (error: Error) => void,
) {
  if (!firebaseEnabled || !firestore) {
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

  const partyRef = doc(firestore, 'parties', party.inviteCode);

  await setDoc(
    partyRef,
    {
      name: party.name,
      city: party.city,
      inviteCode: party.inviteCode,
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

export function subscribePivoSync(inviteCode: string, onChange: (pivoState: PivoState) => void) {
  if (!firebaseEnabled || !firestore) {
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

    const reply = pivoState.reply;

    if (reply !== 'Jdu' && reply !== 'Možná' && reply !== 'Dnes ne') {
      return;
    }

    onChange({
      place: typeof pivoState.place === 'string' ? pivoState.place : 'Radegastovna Pirát',
      time: typeof pivoState.time === 'string' ? pivoState.time : '19:00',
      note: typeof pivoState.note === 'string' ? pivoState.note : 'jen na jedno',
      reply,
      arrival: typeof pivoState.arrival === 'string' ? pivoState.arrival : 'za 30 min',
    });
  });
}

export async function savePivoSync(inviteCode: string, pivoState: PivoState) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  await setDoc(
    doc(firestore, 'parties', inviteCode),
    {
      pivoState: {
        place: pivoState.place,
        time: pivoState.time,
        note: pivoState.note,
        reply: pivoState.reply,
        arrival: pivoState.arrival,
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

  await addDoc(collection(firestore, 'parties', inviteCode, 'memories'), {
    activity: memory.activity,
    text: memory.text,
    createdAt: memory.createdAt,
  });
}
