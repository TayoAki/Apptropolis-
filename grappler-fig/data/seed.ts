// Starting records. A new install starts with nothing of its own: no sessions, streak, coach
// chat or meals, because those would be someone else's history. The one thing it ships with is
// a sample scouting report, labelled as a sample and removed by the first real read, so the
// report and its game plan can be seen (and drilled) before a first opponent is scouted.
import type { Collections } from "./schema";

/** The id of the sample scouting report. */
export const SAMPLE_SCOUT_ID = "sample-scout";

// Checked against Collections without being annotated as it: the storage layer reads the seed by
// collection name, which an interface type doesn't allow.
export const seed = {
  workout_sessions: [],

  coach_messages: [],

  opponent_scouts: [
    {
      id: SAMPLE_SCOUT_ID,
      name: "Sample: southpaw partner",
      photoUri: null,
      stance: "southpaw",
      tendencies:
        "Rests the rear hand at the chin and keeps the lead low. Steps straight back when pressed, then throws a looping left hook on the way out. Drops the right elbow on the jab.",
      gamePlan:
        "Stay on the lead side so the looping left has less angle. Double jab to the body to lift the guard, then a right cross over the top. Callouts: jab, jab, cross, slip left, hook to the body.",
      createdAt: new Date().toISOString(),
      example: true,
    },
  ],

  meals: [],
} satisfies Collections;
