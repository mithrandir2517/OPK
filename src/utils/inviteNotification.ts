import { ActivityKey } from '../types';

const activityTitles: Record<ActivityKey, string> = {
  obed: 'Oběd',
  pivo: 'Pivo',
  kolo: 'Kolo',
};

type InviteSummaryInput = {
  activity: ActivityKey;
  actorName: string;
  where: string;
  when: string;
  note?: string;
};

export function buildInviteNotificationCopy({ activity, actorName, where, when, note }: InviteSummaryInput) {
  const activityTitle = activityTitles[activity];
  const whereText = where.trim() || (activity === 'kolo' ? 'Trasa není vybraná' : 'Místo není vybráno');
  const whenText = when.trim() || 'Čas se domluví';
  const noteText = note?.trim() ? `Poznámka: ${note.trim()}` : '';

  return {
    title: activityTitle,
    body: [actorName, whereText, whenText, noteText].filter(Boolean).join(' · '),
  };
}
