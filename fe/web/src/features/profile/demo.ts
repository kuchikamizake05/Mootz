import { jakartaDay, type Streak } from "./model";

/** Labelled demo fixtures (NEXT_PUBLIC_DEMO_FIXTURES=1): 3-day streak, posted today. */
export const demoStreak = (): Streak => ({
  currentStreak: 3,
  longestStreak: 3,
  postedToday: true,
  lastPublicationDay: jakartaDay(new Date()),
  timeZone: "Asia/Jakarta",
});

/** Demo viewer handle, and handles the demo "backend" reports as taken. */
export const demoViewerUsername = "faaid";
export const DEMO_TAKEN_USERNAMES = ["demo_a", "demo_b", "demo_c", "demo_d", "admin"];
