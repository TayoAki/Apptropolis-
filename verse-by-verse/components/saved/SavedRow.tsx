import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useRef } from "react";
import { Animated, PanResponder, Pressable, Text, useWindowDimensions, View } from "react-native";
import { DAY_MS, formatReference, type Bookmark } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { AiImage } from "../AiImage";
import { haptic, PressScale, useReducedMotion } from "../motion";

const REVEAL = 96;

const BOOKMARK_PROMPT = "Small brown bookmark icon at top right of each verse card";
const BOOKMARK_SAVED_PROMPT = "Small filled amber bookmark icon, plain transparent background, no text";
const SHARE_PROMPT = "Thin outlined share icon beside the bookmark on each verse card";

/**
 * One saved verse as a card: reference, text (wrapping to two lines) and when it was saved, with
 * a bookmark button (move to folder) and a share button on the right. Swipe left to reveal
 * Remove; swipe past the halfway point to remove it outright.
 */
export function SavedRow({
  bookmark,
  savedLabel,
  onOpen,
  onShare,
  onFolder,
  onRemove,
}: {
  bookmark: Bookmark;
  savedLabel: string;
  onOpen: () => void;
  onShare: () => void;
  onFolder: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const { width: screenWidth } = useWindowDimensions();
  const slide = useRef(new Animated.Value(0)).current;
  const revealed = useRef(false);
  const reference = formatReference(bookmark);
  // Saved in the last day: the bookmark shows in the amber highlight.
  const recent = Date.now() - Date.parse(bookmark.createdAt) < DAY_MS;

  const snap = useCallback(
    (to: number) => {
      revealed.current = to !== 0;
      Animated.spring(slide, {
        toValue: to,
        useNativeDriver: true,
        speed: 18,
        bounciness: 4,
      }).start();
    },
    [slide],
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (_event, g) => {
          const start = revealed.current ? -REVEAL : 0;
          slide.setValue(Math.min(0, Math.max(-screenWidth, start + g.dx)));
        },
        onPanResponderRelease: (_event, g) => {
          const total = (revealed.current ? -REVEAL : 0) + g.dx;
          if (total < -screenWidth * 0.4) {
            haptic("warning");
            Animated.timing(slide, {
              toValue: -screenWidth,
              duration: reduced ? 0 : 200,
              useNativeDriver: true,
            }).start(({ finished }) => {
              if (finished) onRemove();
            });
          } else {
            snap(total < -REVEAL / 2 ? -REVEAL : 0);
          }
        },
        onPanResponderTerminate: () => snap(revealed.current ? -REVEAL : 0),
      }),
    [slide, screenWidth, reduced, onRemove, snap],
  );

  const onAccessibilityAction = (event: { nativeEvent: { actionName: string } }) => {
    switch (event.nativeEvent.actionName) {
      case "open":
        onOpen();
        break;
      case "share":
        onShare();
        break;
      case "folder":
        onFolder();
        break;
      case "remove":
        haptic("warning");
        onRemove();
        break;
    }
  };

  const cardShadow = {
    shadowColor: theme.colors.text,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  };

  return (
    <View
      accessibilityActions={[
        { name: "open", label: "Open in the reader" },
        { name: "share", label: "Share card" },
        { name: "folder", label: "Move to folder" },
        { name: "remove", label: "Remove" },
      ]}
      onAccessibilityAction={onAccessibilityAction}
      style={[
        {
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.background,
        },
        cardShadow,
      ]}
    >
      <View style={{ borderRadius: theme.radius.md, overflow: "hidden" }}>
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            right: 0,
            width: REVEAL,
            backgroundColor: theme.colors.danger,
          }}
        >
          <Pressable
            onPress={() => {
              haptic("warning");
              onRemove();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${reference}`}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              gap: theme.spacing.xs,
            }}
          >
            <Ionicons name="trash-outline" size={22} color={theme.colors.onPrimary} />
            <Text
              style={{
                color: theme.colors.onPrimary,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.medium,
              }}
            >
              Remove
            </Text>
          </Pressable>
        </View>

        <Animated.View
          {...pan.panHandlers}
          style={{
            transform: [{ translateX: slide }],
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.md,
            paddingLeft: theme.spacing.lg,
            paddingRight: theme.spacing.sm,
            paddingVertical: theme.spacing.lg,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.background,
          }}
        >
          <PressScale
            onPress={() => (revealed.current ? snap(0) : onOpen())}
            accessibilityRole="button"
            accessibilityLabel={`Open ${reference} in the reader`}
            scaleTo={0.985}
            style={{ flex: 1, gap: theme.spacing.sm }}
          >
            <Text
              style={{
                color: theme.colors.text,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {reference}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: theme.colors.text,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.body,
                lineHeight: theme.font.size.body * 1.45,
              }}
            >
              {bookmark.text}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.caption,
                fontStyle: "italic",
              }}
            >
              {savedLabel}
            </Text>
          </PressScale>

          <View style={{ alignItems: "center", gap: theme.spacing.xs }}>
            <Pressable
              onPress={onFolder}
              accessibilityRole="button"
              accessibilityLabel={`Move ${reference} to a folder`}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <AiImage
                prompt={recent ? BOOKMARK_SAVED_PROMPT : BOOKMARK_PROMPT}
                fit="contain"
                style={{ width: 22, height: 22 }}
              />
            </Pressable>
            <Pressable
              onPress={onShare}
              accessibilityRole="button"
              accessibilityLabel={`Share ${reference} as a card`}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <AiImage prompt={SHARE_PROMPT} fit="contain" style={{ width: 22, height: 22 }} />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}
