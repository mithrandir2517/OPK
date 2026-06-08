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
