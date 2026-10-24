import { jakartaDay, type Streak } from "./model";

/** Labelled demo fixtures (NEXT_PUBLIC_DEMO_FIXTURES=1): 3-day streak, posted today. */
export const demoStreak = (): Streak => ({
  currentStreak: 3,
  longestStreak: 3,
  postedToday: true,
  lastPublicationDay: jakartaDay(new Date()),
  timeZone: "Asia/Jakarta",
});
