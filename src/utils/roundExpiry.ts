import { ActivityKey, ActivityRoundState, PartyState } from '../types';

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

export function getRoundExpiresAt(openedAt: string) {
  if (!isValidDate(openedAt)) {
    return '';
  }

  const expiresAt = new Date(openedAt);
  expiresAt.setHours(24, 0, 0, 0);
  return expiresAt.toISOString();
}

function getRoundExpirySource(round: Pick<ActivityRoundState, 'openedAt' | 'expiresAt'> | null | undefined) {
  if (!round) {
    return '';
  }

  return typeof round.expiresAt === 'string' && round.expiresAt.trim()
    ? round.expiresAt.trim()
    : getRoundExpiresAt(round.openedAt);
}

export function isRoundExpired(
  round: Pick<ActivityRoundState, 'open' | 'openedAt' | 'expiresAt'> | null | undefined,
  now = Date.now(),
) {
  if (!round?.open) {
    return true;
  }

  const expiresAt = getRoundExpirySource(round);
  if (!expiresAt) {
    return false;
  }

  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isNaN(expiresAtMs) ? false : now >= expiresAtMs;
}

export function pruneExpiredPartyRounds(party: PartyState) {
  const nextRounds = { ...(party.rounds ?? {}) };
  let changed = false;

  (['obed', 'pivo', 'kolo'] as ActivityKey[]).forEach((activity) => {
    const round = nextRounds[activity];
    if (round && isRoundExpired(round)) {
      delete nextRounds[activity];
      changed = true;
    }
  });

  return changed ? { ...party, rounds: nextRounds } : party;
}

export function getNextRoundExpiryMs(rounds?: Partial<Record<ActivityKey, ActivityRoundState>>) {
  const now = Date.now();
  const expiryTimes = (['obed', 'pivo', 'kolo'] as ActivityKey[])
    .map((activity) => getRoundExpirySource(rounds?.[activity] ?? null))
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value) && value > now);

  if (!expiryTimes.length) {
    return null;
  }

  return Math.min(...expiryTimes);
}
