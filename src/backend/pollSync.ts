import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { firestore, firebaseEnabled } from './firebase';
import { ActivityKey, ActivityVote } from '../types';

function voteCollection(partyCode: string, activity: ActivityKey) {
  return collection(firestore as NonNullable<typeof firestore>, 'parties', partyCode, 'polls', activity, 'votes');
}

function mapVoteData(id: string, data: Record<string, unknown>): ActivityVote | null {
  if (
    typeof data.uid !== 'string' ||
    typeof data.displayName !== 'string' ||
    typeof data.choice !== 'string' ||
    typeof data.updatedAt !== 'string'
  ) {
    return null;
  }

  return {
    uid: id || data.uid,
    displayName: data.displayName,
    choice: data.choice,
    arrival: typeof data.arrival === 'string' && data.arrival.trim() ? data.arrival : undefined,
    updatedAt: data.updatedAt,
  };
}

export function subscribeActivityVotesSync(
  partyCode: string,
  activity: ActivityKey,
  onChange: (votes: ActivityVote[]) => void,
) {
  if (!firebaseEnabled || !firestore) {
    return () => {};
  }

  return onSnapshot(voteCollection(partyCode, activity), (snapshot) => {
    const votes = snapshot.docs
      .map((document) => mapVoteData(document.id, document.data() as Record<string, unknown>))
      .filter((item): item is ActivityVote => item !== null)
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt));

    onChange(votes);
  });
}

export async function saveActivityVoteSync(
  partyCode: string,
  activity: ActivityKey,
  vote: ActivityVote,
) {
  if (!firebaseEnabled || !firestore) {
    return;
  }

  const payload: Record<string, unknown> = {
    uid: vote.uid,
    displayName: vote.displayName,
    choice: vote.choice,
    updatedAt: vote.updatedAt,
  };

  if (typeof vote.arrival === 'string' && vote.arrival.trim()) {
    payload.arrival = vote.arrival.trim();
  }

  await setDoc(doc(voteCollection(partyCode, activity), vote.uid), payload, { merge: true });
}
