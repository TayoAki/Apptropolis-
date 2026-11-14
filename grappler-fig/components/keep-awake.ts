// Keeps the phone's screen on while a round is running, so the clock and the callouts don't
// stop when the phone would otherwise lock. It uses expo-keep-awake, which ships inside the
// `expo` package; if it is ever absent the app still runs, the screen just follows the phone's
// own auto-lock.
import { useEffect } from "react";

interface KeepAwake {
  activateKeepAwakeAsync(tag?: string): Promise<void>;
  deactivateKeepAwake(tag?: string): Promise<void>;
}

const TAG = "round";

let keepAwake: KeepAwake | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  keepAwake = require("expo-keep-awake") as KeepAwake;
} catch {
  keepAwake = null;
}

/** Hold the screen awake while `on` is true. */
export function useScreenAwake(on: boolean): void {
  useEffect(() => {
    if (!on || !keepAwake) return;
    const lib = keepAwake;
    void Promise.resolve()
      .then(() => lib.activateKeepAwakeAsync(TAG))
      .catch(() => undefined);
    return () => {
      void Promise.resolve()
        .then(() => lib.deactivateKeepAwake(TAG))
        .catch(() => undefined);
    };
  }, [on]);
}
