// Starting records. The user's own history (sessions, coach chat, scouting reports, meals) is
// written as realistic examples so every screen has something to show on first launch.
import {
  isoDaysAgo,
  xpForSession,
  type ChatRole,
  type Collections,
  type CoachMessage,
  type Meal,
  type OpponentScout,
  type Stance,
  type WorkoutMode,
  type WorkoutSession,
} from "./schema";

function session(
  id: string,
  days: number,
  hour: number,
  minute: number,
  rounds: number,
  roundSeconds: number,
  mode: WorkoutMode,
  topFix: string,
): WorkoutSession {
  return {
    id,
    date: isoDaysAgo(days, hour, minute),
    rounds,
    roundSeconds,
    mode,
    xpEarned: xpForSession({ rounds, roundSeconds }),
    topFix,
  };
}

function chat(
  id: string,
  role: ChatRole,
  days: number,
  hour: number,
  minute: number,
  text: string,
): CoachMessage {
  return { id, role, text, createdAt: isoDaysAgo(days, hour, minute) };
}

function scout(
  id: string,
  days: number,
  name: string,
  stance: Stance,
  tendencies: string,
  gamePlan: string,
): OpponentScout {
  return {
    id,
    name,
    photoUri: null,
    stance,
    tendencies,
    gamePlan,
    createdAt: isoDaysAgo(days),
  };
}

function meal(
  id: string,
  name: string,
  calories: number,
  proteinGrams: number,
  days: number,
  hour: number,
  minute: number,
): Meal {
  return { id, name, calories, proteinGrams, loggedAt: isoDaysAgo(days, hour, minute) };
}

export const seed: Collections = {
  workout_sessions: [
    session(
      "w1",
      0,
      18,
      20,
      6,
      180,
      "callout",
      "Keep your hands up after the cross, chin tucked behind the lead shoulder.",
    ),
    session(
      "w2",
      1,
      7,
      10,
      4,
      120,
      "guided",
      "Pivot the lead foot on the hook instead of swinging from the shoulder.",
    ),
    session(
      "w3",
      2,
      19,
      5,
      3,
      180,
      "pad",
      "Turn the hips through the cross. The power comes from the back foot.",
    ),
    session("w4", 4, 18, 40, 5, 90, "free", "Breathe out on every punch so your shoulders stay loose."),
    session(
      "w5",
      5,
      20,
      15,
      6,
      180,
      "scouted",
      "Throw the jab before you step in, not after you're already in range.",
    ),
    session("w6", 8, 6, 50, 3, 120, "guided", ""),
    session(
      "w7",
      9,
      18,
      30,
      4,
      180,
      "callout",
      "Return your hands to the guard after every combination.",
    ),
  ],

  coach_messages: [
    chat(
      "c1",
      "user",
      3,
      20,
      10,
      "My hook keeps getting countered. What am I doing wrong?",
    ),
    chat(
      "c2",
      "coach",
      3,
      20,
      11,
      "Most likely the elbow. If the hook starts from your arm instead of your feet, your chin is open when you come around. Keep the elbow at shoulder height, pivot the lead foot, and throw it shorter. Shadow three rounds of slow hooks, then add speed.",
    ),
    chat("c3", "user", 2, 7, 40, "Is it okay to train twice a day?"),
    chat(
      "c4",
      "coach",
      2,
      7,
      41,
      "Yes, if one session is technique and the other is light. Keep the second under 30 minutes and eat between them. Two hard sessions every day is how people get hurt.",
    ),
    chat(
      "c5",
      "user",
      0,
      8,
      15,
      "Watched my sparring video. I drop my right hand after the jab.",
    ),
    chat(
      "c6",
      "coach",
      0,
      8,
      16,
      "Good catch, most people never spot it. Shadow jab-cross in front of a mirror and say \"hand\" out loud every time the rear hand drops. Do five rounds of that today, then free shadowboxing to finish.",
    ),
  ],

  opponent_scouts: [
    scout(
      "s1",
      1,
      "Marco, Thursday partner",
      "southpaw",
      "Rests the rear hand at his chin and keeps the lead low. Steps straight back when pressed, then throws a looping left hook on the way out. Drops the right elbow on the jab.",
      "Stay on his lead side so the looping left has less angle. Double jab to the body to lift his guard, then a right cross over the top. Callouts: jab, jab, cross, slip left, hook to the body.",
    ),
    scout(
      "s2",
      3,
      "Ana, Tuesday class",
      "orthodox",
      "Fast, long jab, then freezes inside range with her chin up. Lands the straight right after two jabs. Slow to move to her left after a combination.",
      "Jab to keep her moving, then move outside her lead hand after every right she throws. Body jab to slow her hands. Callouts: jab, step out, cross to the body, slip right, uppercut.",
    ),
    scout(
      "s3",
      6,
      "Sam, heavy bag regular",
      "unclear",
      "Switches stance mid-combination, which hides the first punch. Leans forward on the hook and recovers slowly after a body shot.",
      "Don't chase the switch. Wait for the first punch of each combination, counter it, then step back out. Body hook as the first punch. Callouts: jab, body hook, counter cross, step out.",
    ),
    scout(
      "s4",
      10,
      "Jordan, sparring Saturdays",
      "orthodox",
      "Loads the right hand from low and drops the lead shoulder before it. Backs straight onto the ropes. Rarely throws the uppercut.",
      "Jab to the face to keep his hands high, then a left hook to the body while the right is loaded. Keep your feet moving off the ropes. Callouts: jab, slip, jab, body hook, step left.",
    ),
    scout(
      "s5",
      14,
      "Priya, gym friend",
      "southpaw",
      "Long, flicking jab. Pulls back after every combination instead of hooking off. Good footwork on the outside.",
      "Close the distance with a small lead step, not a lunge. Work the body to make her drop her guard, then press with the cross. Callouts: jab, cross, body hook, step in, cross.",
    ),
  ],

  meals: [
    meal("m1", "Greek yogurt, berries and oats", 380, 24, 0, 8, 15),
    meal("m2", "Chicken rice bowl with black beans", 640, 48, 0, 13, 0),
    meal("m3", "Tuna wrap", 420, 34, 1, 12, 30),
    meal("m4", "Two eggs on toast", 390, 22, 1, 8, 0),
    meal("m5", "Salmon, sweet potato and broccoli", 710, 52, 2, 19, 30),
    meal("m6", "Banana and peanut butter", 280, 7, 2, 16, 0),
  ],
};
