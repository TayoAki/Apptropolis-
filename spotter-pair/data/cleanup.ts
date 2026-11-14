// Earlier builds of this app filled a first launch with sample records: a week of workouts with
// finished and missed sessions, logged sets, and a feed from a partner who didn't exist. A phone
// that ran one of those builds still holds them, and they would read as the person's own history
// and as a linked partner. This removes exactly those records (by their fixed ids), once.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { defaultRepository } from "./repo";

const DONE_KEY = "app:sample-cleared";
const SAMPLE: Array<[collection: string, ids: string[]]> = [
  ["workouts", ["w1", "w2", "w3", "w4", "w5", "w6", "w7"]],
  ["set_logs", ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"]],
  ["partner_updates", ["u1", "u2", "u3", "u4", "u5", "u6"]],
];

let clearing: Promise<void> | null = null;

/** Removes the old sample records the first time it is called on a phone; a no-op afterwards. */
export function clearOldSample(): Promise<void> {
  clearing ??= (async () => {
    try {
      if ((await AsyncStorage.getItem(DONE_KEY)) === "1") return;
      for (const [collection, ids] of SAMPLE) {
        const rows = await defaultRepository.list<{ id: string }>(collection);
        for (const row of rows) {
          if (ids.includes(row.id)) await defaultRepository.remove(collection, row.id);
        }
      }
      await AsyncStorage.setItem(DONE_KEY, "1");
    } catch {
      // Storage wasn't reachable: try again on the next launch.
    }
  })();
  return clearing;
}
