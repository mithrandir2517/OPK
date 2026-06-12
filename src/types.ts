import { MaterialCommunityIcons } from '@expo/vector-icons';

export type ActivityKey = 'obed' | 'pivo' | 'kolo';
export type SectionKey = ActivityKey | 'kronika' | 'zpravy' | 'profil' | 'party';
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

export type UserProfile = {
  name: string;
  avatarInitial: string;
  avatarColor: string;
  notificationsEnabled: boolean;
};

export type PartyState = {
  name: string;
  city: string;
  members: PartyMember[];
  inviteCode: string;
  creatorUid: string | null;
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
