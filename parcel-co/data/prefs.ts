// The person's shopping preferences, kept with the onboarding answers so every screen reads the
// same ones: interests (keys from INTERESTS), followed stores (slugs, with their names for chips
// and prompts), Pip's tone, and whether they agreed to questions going to the AI service.
import { useAppState } from "./app-state";
import { INTERESTS, listFrom, type Store } from "./schema";
import type { PipTone } from "./pip";

export function usePrefs() {
  const { answers, setAnswer } = useAppState();
  const interests = listFrom(answers.interests).filter((k) => INTERESTS.some((i) => i.key === k));
  const stores = listFrom(answers.stores);
  const names = listFrom(answers.store_names);
  const storeNames = stores.map((slug, i) => names[i] ?? slug);

  async function setFollowed(slugs: string[], labels: string[]) {
    await setAnswer("stores", slugs.join(","));
    await setAnswer("store_names", labels.map((l) => l.replace(/,/g, " ")).join(","));
  }

  return {
    interests,
    stores,
    storeNames,
    tone: (answers.tone === "brief" ? "brief" : "friendly") as PipTone,
    aiConsent: answers.ai_consent === "yes",
    isFollowing: (slug: string) => stores.includes(slug),
    async setInterests(keys: string[]) {
      await setAnswer("interests", keys.join(","));
    },
    async toggleStore(store: Pick<Store, "slug" | "name">) {
      const i = stores.indexOf(store.slug);
      if (i === -1) await setFollowed([...stores, store.slug], [...storeNames, store.name]);
      else
        await setFollowed(
          stores.filter((_, j) => j !== i),
          storeNames.filter((_, j) => j !== i),
        );
    },
    async setTone(tone: PipTone) {
      await setAnswer("tone", tone);
    },
    async giveAiConsent() {
      await setAnswer("ai_consent", "yes");
    },
  };
}
