import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Reader } from "../../components/index/Reader";
import { ReadHeader } from "../../components/index/ReadHeader";
import { haptic } from "../../components/motion";
import { useTheme } from "../../theme/ThemeProvider";

/**
 * Read: one verse at a time as a card, with its chapter below. Tap any verse to read from it;
 * the place you reached is remembered for next time. Search, Saved and the chapter view open a
 * verse here by passing its reference in the link.
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
      renderTop={({ current, verses, choose }) => (
        <ReadHeader
          current={current}
          verses={verses}
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
