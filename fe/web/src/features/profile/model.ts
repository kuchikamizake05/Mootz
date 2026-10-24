export type Streak = {
  currentStreak: number;
  longestStreak: number;
  postedToday: boolean;
  /** YYYY-MM-DD in `timeZone`. */
  lastPublicationDay: string | null;
  timeZone: string;
};

const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });

/** Calendar day (YYYY-MM-DD) in WIB, the zone the daily post window resets in. */
export const jakartaDay = (date: Date) => fmt.format(date);

export function shiftDay(day: string, delta: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export type StripDay = { day: string; label: number; posted: boolean; today: boolean };

/**
 * Last 7 days ending today. The API returns no per-day history, so only days inside the
 * current streak run (ending at lastPublicationDay) are marked posted; nothing else is inferred.
 */
export function streakStrip(streak: Streak, today: string): StripDay[] {
  const last = streak.lastPublicationDay;
  const run = new Set<string>();
  if (last && streak.currentStreak > 0) for (let i = 0; i < streak.currentStreak; i++) run.add(shiftDay(last, -i));
  return Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(today, i - 6);
    return { day, label: Number(day.slice(8)), posted: run.has(day), today: day === today };
  });
}

export const streakLabel = (n: number) => `${n}-day streak`;
