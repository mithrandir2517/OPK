import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { firestore, firebaseEnabled } from './firebase';
import { PartyState, PivoState, SavedMemory } from '../types';

function filterStrings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function mapPartyData(inviteCode: string, data: Record<string, unknown>): PartyState {
  return {
    name: typeof data.name === 'string' && data.name.trim() ? data.name : 'Parta Vyškov',
    city: typeof data.city === 'string' && data.city.trim() ? data.city : 'Vyškov',
    members: filterStrings(data.members).length > 0 ? filterStrings(data.members) : ['Marek', 'Tomáš', 'Pavel'],
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

export function subscribePartySync(inviteCode: string, onChange: (party: PartyState) => void) {
  if (!firebaseEnabled || !firestore) {
    return () => {};
  }

  return onSnapshot(doc(firestore, 'parties', inviteCode), (snapshot) => {
    if (!snapshot.exists()) {
      return;
    }

    onChange(mapPartyData(inviteCode, snapshot.data() as Record<string, unknown>));
  });
}

export async function savePartySync(party: PartyState) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  await setDoc(
    doc(firestore, 'parties', party.inviteCode),
    {
      name: party.name,
      city: party.city,
      members: party.members,
      inviteCode: party.inviteCode,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
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
