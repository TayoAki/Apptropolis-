import {
  type CollectionName,
  type Collections,
  type Equipment,
  type Exercise,
  type ExerciseLevel,
  type MuscleGroup,
} from "./schema";

// What a first launch starts with: the exercise catalog (reference content) and nothing else.
// The person's workouts are laid out from their own answers when they finish setup, their sets
// are the ones they log, and the partner feed starts empty: a fresh install never shows a
// history, a score or a partner that isn't theirs.

// The exercise catalog: id, name, muscle group, equipment, level, one form cue.
const exerciseRows: Array<[string, string, MuscleGroup, Equipment, ExerciseLevel, string]> = [
  ["bench-press", "Barbell Bench Press", "chest", "barbell", "intermediate", "Shoulder blades pinned, bar path to lower chest."],
  ["push-up", "Push-Up", "chest", "bodyweight", "beginner", "Body in one straight line, elbows about 45 degrees out."],
  ["dumbbell-bench-press", "Dumbbell Bench Press", "chest", "dumbbell", "beginner", "Let the dumbbells travel slightly out and down."],
  ["incline-dumbbell-press", "Incline Dumbbell Press", "chest", "dumbbell", "intermediate", "Bench at about 30 degrees; press up and slightly in."],
  ["dumbbell-fly", "Dumbbell Chest Fly", "chest", "dumbbell", "beginner", "Soft bend in the elbows; stop where you feel a stretch."],
  ["chest-dip", "Chest Dip", "chest", "bodyweight", "intermediate", "Lean forward; lower until upper arms are about parallel to the floor."],
  ["pull-up", "Pull-Up", "back", "bodyweight", "intermediate", "Start from a dead hang; pull your chest toward the bar."],
  ["lat-pulldown", "Lat Pulldown", "back", "machine", "beginner", "Pull the bar to your upper chest, elbows down and back."],
  ["seated-cable-row", "Seated Cable Row", "back", "machine", "beginner", "Stay tall; pull the handle to your belly button."],
  ["one-arm-row", "One-Arm Dumbbell Row", "back", "dumbbell", "beginner", "Flat back; drive the elbow past your ribs."],
  ["barbell-row", "Bent-Over Barbell Row", "back", "barbell", "intermediate", "Hinge to about 45 degrees; pull to your lower ribs."],
  ["inverted-row", "Inverted Row", "back", "bodyweight", "beginner", "Keep the body straight; pull your chest to the bar."],
  ["back-extension", "Back Extension", "back", "bodyweight", "beginner", "Squeeze the glutes at the top; don't hyperextend the low back."],
  ["band-face-pull", "Band Face Pull", "back", "band", "beginner", "Pull to forehead height, elbows high and wide."],
  ["back-squat", "Barbell Back Squat", "legs", "barbell", "intermediate", "Brace hard, sit between your hips, knees track over toes."],
  ["goblet-squat", "Goblet Squat", "legs", "dumbbell", "beginner", "Hold the weight at your chest; keep your torso upright."],
  ["romanian-deadlift", "Romanian Deadlift", "legs", "barbell", "intermediate", "Push your hips back; the bar stays close to your legs."],
  ["deadlift", "Conventional Deadlift", "legs", "barbell", "intermediate", "Bar over mid-foot; push the floor away."],
  ["split-squat", "Bulgarian Split Squat", "legs", "dumbbell", "intermediate", "Rear foot on a bench; keep most of the weight on the front leg."],
  ["walking-lunge", "Walking Lunge", "legs", "dumbbell", "beginner", "Take a long step; the back knee lightly touches the floor."],
  ["leg-press", "Leg Press", "legs", "machine", "beginner", "Feet shoulder-width; never let the lower back round."],
  ["hip-thrust", "Barbell Hip Thrust", "legs", "barbell", "beginner", "Upper back on a bench; drive through the heels, pause at the top."],
  ["glute-bridge", "Glute Bridge", "legs", "bodyweight", "beginner", "Drive the hips up; ribs down, squeeze at the top."],
  ["leg-curl", "Lying Leg Curl", "legs", "machine", "beginner", "Keep hips down; curl your heels toward your glutes."],
  ["calf-raise", "Standing Calf Raise", "legs", "machine", "beginner", "Full stretch at the bottom, pause on the way up."],
  ["bodyweight-squat", "Bodyweight Squat", "legs", "bodyweight", "beginner", "Heels flat, chest up, sit back and down."],
  ["step-up", "Dumbbell Step-Up", "legs", "dumbbell", "beginner", "Drive through the working leg; don't push off the back foot."],
  ["overhead-press", "Standing Overhead Press", "shoulders", "barbell", "intermediate", "Squeeze the glutes; bar travels straight up past your forehead."],
  ["seated-dumbbell-press", "Seated Dumbbell Press", "shoulders", "dumbbell", "beginner", "Back against the pad; press without arching."],
  ["lateral-raise", "Dumbbell Lateral Raise", "shoulders", "dumbbell", "beginner", "Lead with the elbows; lift to shoulder height, no higher."],
  ["pike-push-up", "Pike Push-Up", "shoulders", "bodyweight", "intermediate", "Hips high in an inverted V; lower your head toward the floor."],
  ["reverse-fly", "Reverse Dumbbell Fly", "shoulders", "dumbbell", "beginner", "Hinge forward; raise the arms out to the sides with a slight bend."],
  ["dumbbell-curl", "Dumbbell Curl", "arms", "dumbbell", "beginner", "Elbows fixed at your sides; control the lowering."],
  ["hammer-curl", "Hammer Curl", "arms", "dumbbell", "beginner", "Thumbs up the whole way; no swinging."],
  ["tricep-pushdown", "Cable Triceps Pushdown", "arms", "machine", "beginner", "Elbows pinned; straighten fully at the bottom."],
  ["skull-crusher", "Skull Crusher", "arms", "barbell", "intermediate", "Lower toward the forehead, elbows pointing at the ceiling."],
  ["diamond-push-up", "Diamond Push-Up", "arms", "bodyweight", "intermediate", "Hands under the chest; elbows track close to your body."],
  ["plank", "Plank", "core", "bodyweight", "beginner", "Ribs down, glutes tight; breathe steadily."],
  ["side-plank", "Side Plank", "core", "bodyweight", "beginner", "Stack the feet; lift the hips into one straight line."],
  ["dead-bug", "Dead Bug", "core", "bodyweight", "beginner", "Low back stays flat on the floor; move slowly."],
  ["pallof-press", "Pallof Press", "core", "band", "beginner", "Resist the rotation; press out and hold for two seconds."],
  ["hanging-knee-raise", "Hanging Knee Raise", "core", "bodyweight", "intermediate", "Curl the pelvis up; no swinging."],
  ["kettlebell-swing", "Kettlebell Swing", "full body", "kettlebell", "intermediate", "A hip hinge, not a squat; the hips drive the bell."],
  ["farmers-carry", "Farmer's Carry", "full body", "dumbbell", "beginner", "Stand tall, short quick steps, shoulders packed down."],
  ["burpee", "Burpee", "full body", "bodyweight", "intermediate", "Chest to the floor, then jump up with arms overhead."],
];

const exerciseCatalog: Exercise[] = exerciseRows.map(
  ([id, name, group, equipment, level, cue]) => ({ id, name, group, equipment, level, cue }),
);

export const seed: { [K in CollectionName]: Collections[K][] } = {
  workouts: [],
  set_logs: [],
  partner_updates: [],
  exercises: exerciseCatalog,
};
