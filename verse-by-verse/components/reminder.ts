// The daily reminder's wording and times, shared by onboarding and Settings so the notification
// reads the same wherever it was turned on.

/** What the notification says. It is fixed text: it does not carry the verse itself. */
export const REMINDER_COPY = {
  title: "Pick up where you left off",
  body: "Your verse is waiting, right where you stopped.",
};

/** The times offered during setup. Evening is the default. */
export const SETUP_TIMES: ReadonlyArray<{ hour: number; minute: number; label: string }> = [
  { hour: 7, minute: 30, label: "Morning" },
  { hour: 12, minute: 30, label: "Midday" },
  { hour: 20, minute: 30, label: "Evening" },
];
export const DEFAULT_SETUP_TIME = 2;

/** The times the Settings row steps through when tapped; they include the setup times. */
export const REMINDER_TIMES: ReadonlyArray<readonly [number, number]> = [
  [7, 0],
  [7, 30],
  [8, 0],
  [9, 0],
  [12, 30],
  [18, 0],
  [20, 0],
  [20, 30],
  [21, 0],
];

/** "8:30 PM" */
export function clockTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}
