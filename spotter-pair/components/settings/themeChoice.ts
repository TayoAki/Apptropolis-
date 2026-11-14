// The theme the person picked in Settings, kept across launches. The pick is saved on the device
// under this app's own key and re-applied as soon as the app starts, with the template's
// setActiveThemeId() (which shows that pack in its own light or dark mode, whatever the phone
// is set to). "Match my phone" clears the pick and hands the choice back to the phone's
// appearance: the app's default pack in dark mode, its light partner in light mode.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { setActiveThemeId, setAppearance } from "../../theme/active";
import { defaultThemeId, themes } from "../../theme/tokens";

const KEY = "app:theme-pack";
let picked: string | null = null;
const listeners = new Set<() => void>();

function set(next: string | null) {
  picked = next;
  listeners.forEach((listener) => listener());
}

// Runs once, when the app's code loads: a saved pick is on screen before the first frame that
// shows the app (the root waits for the saved answers, which are read at the same moment).
AsyncStorage.getItem(KEY)
  .then((saved) => {
    if (!saved || !themes.some((pack) => pack.id === saved)) return;
    setActiveThemeId(saved);
    set(saved);
  })
  .catch(() => undefined);

/** Show a pack and keep it. A pick wins over the phone's appearance until "match my phone". */
export function pickPack(id: string): void {
  if (!themes.some((pack) => pack.id === id)) return;
  setActiveThemeId(id);
  set(id);
  AsyncStorage.setItem(KEY, id).catch(() => undefined);
}

/** Back to the app's own pack, following the phone's light and dark mode again. */
export function matchPhone(): void {
  setActiveThemeId(defaultThemeId);
  setAppearance("system");
  set(null);
  AsyncStorage.removeItem(KEY).catch(() => undefined);
}

/** The picked pack's id, or null while the app follows the phone. */
export function usePickedPack(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => picked,
    () => picked,
  );
}
