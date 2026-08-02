import { MaterialCommunityIcons } from '@expo/vector-icons';

export type ActivityKey = 'obed' | 'pivo' | 'kolo';
export type SectionKey = 'prehled' | ActivityKey | 'kronika' | 'zpravy' | 'profil' | 'party';
export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type LunchRestaurant = {
  name: string;
  delivery: boolean;
  message?: string;
  items: Array<{
    no?: string;
    name: string;
    price?: string;
  }>;
};

export type MemoryItem = {
  title: string;
  meta: string;
  text: string;
};

export type SavedMemory = {
  id: string;
  activity: ActivityKey;
  text: string;
  createdAt: string;
};

export type ObedState = {
  place: string;
  time: string;
  note: string;
};

export type ActivityRoundState = {
  open: boolean;
  openedAt: string;
  openedByUid: string | null;
  openedByName: string;
  place: string;
  time: string;
  note: string;
};

export type UserProfile = {
  name: string;
  avatarInitial: string;
  avatarColor: string;
  notificationsEnabled: boolean;
};

export type PartyEventType =
  | 'obed.round'
  | 'obed.plan'
  | 'obed.reply'
  | 'obed.arrival'
  | 'pivo.round'
  | 'pivo.plan'
  | 'pivo.reply'
  | 'pivo.arrival'
  | 'kolo.round'
  | 'kolo.vote'
  | 'kolo.arrival'
  | 'party.created'
  | 'party.joined';

export type PartyEvent = {
  id: string;
  partyCode: string;
  type: PartyEventType;
  title: string;
  body: string;
  actorUid: string | null;
  actorName: string;
  activity?: ActivityKey;
  createdAt: string;
};

export type PartyState = {
  name: string;
  city: string;
  members: PartyMember[];
  inviteCode: string;
  creatorUid: string | null;
  rounds?: Partial<Record<ActivityKey, ActivityRoundState>>;
};

export type PartyRef = {
  inviteCode: string;
  name: string;
  city: string;
  memberCount: number;
  updatedAt: string;
  creatorUid?: string | null;
};

export type PartyMember = {
  uid: string;
  displayName: string;
  email?: string | null;
  source?: 'google' | 'manual' | 'legacy';
};

export type PivoState = {
  place: string;
  time: string;
  note: string;
  reply: 'Jdu' | 'Možná' | 'Dnes ne';
  arrival: string;
};

export type ActivityVote = {
  uid: string;
  displayName: string;
  choice: string;
  arrival?: string;
  updatedAt: string;
};

export type NewsItem = {
  title: string;
  summary: string;
  tag: string;
};

export type BeerReply = {
  name: string;
  status: 'Jde' | 'Možná';
  arrival: string;
};
