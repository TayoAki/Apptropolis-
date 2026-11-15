import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Reader } from "../../components/index/Reader";
import { ReadHeader } from "../../components/index/ReadHeader";
import { haptic } from "../../components/motion";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * Read: a single verse as a card, with its chapter below. Tap any verse, or Next, to read
 * on through the whole Bible; the place you reached is remembered for next time. Search, Saved
 * and the chapter view open a verse here by passing its reference in the link.
 */
export default function ReadScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    book?: string;
    chapter?: string;
    verse?: string;
    at?: string;
  }>();

  return (
    <Reader
      paddingTop={insets.top + theme.spacing.md}
      jump={params}
      // The verse in the link is the reading place by now, so take it out of the address: on the
      // web, reloading would otherwise open that verse again instead of where reading got to.
      onJumped={() =>
        router.setParams({ book: undefined, chapter: undefined, verse: undefined, at: undefined })
      }
      renderTop={({ current, choose }) => (
        <ReadHeader
          current={current}
          onPick={choose}
          onReadChapter={() => {
            // Open the whole chapter as one page, at this verse.
            haptic("light");
            router.push({
              pathname: "/chapter",
              params: {
                book: current.book,
                chapter: String(current.chapter),
                verse: String(current.verse),
              },
            });
          }}
          onSettings={() => router.push("/settings")}
        />
      )}
    />
  );
}
