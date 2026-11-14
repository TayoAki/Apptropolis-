import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { PlanDinner } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

export interface LeftLine {
  key: string;
  label: string;
  /** 0 to 100: how much of the pack is still left. */
  pct: number;
}

export type DinnerState = "cooked" | "next" | "later";

const STRIP = 48;

export function DinnerCard({
  day,
  dinner,
  name,
  minutes,
  state,
  left,
  onOpen,
  onStart,
  onMarkCooked,
  onToggleLiked,
  onUndo,
}: {
  day: string;
  dinner: PlanDinner;
  name: string;
  minutes: number;
  state: DinnerState;
  left: LeftLine[];
  onOpen: () => void;
  onStart: () => void;
  onMarkCooked: () => void;
  onToggleLiked: () => void;
  onUndo: () => void;
}) {
  const theme = useTheme();
  const cooked = state === "cooked";
  const next = state === "next";

  const text = {
    color: theme.colors.text,
    fontFamily: theme.font.family,
  } as const;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "stretch",
        overflow: "hidden",
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: next ? 2 : 1,
        borderColor: next ? theme.colors.primary : theme.colors.border,
      }}
    >
      <View
        style={{
          width: STRIP,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: cooked ? theme.colors.accent : theme.colors.surfaceAlt,
          minHeight: 64,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            width: 64,
            textAlign: "center",
            transform: [{ rotate: "-90deg" }],
            color: cooked ? theme.colors.onPrimary : theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
            fontFamily: theme.font.family,
            letterSpacing: 1,
          }}
        >
          {day}
        </Text>
      </View>

      <View style={{ flex: 1, padding: theme.spacing.md, gap: theme.spacing.sm }}>
        {cooked ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open recipe: ${name}`}
                onPress={onOpen}
                style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
              >
                <Text
                  style={{
                    ...text,
                    fontSize: theme.font.size.title,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  {name}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontFamily: theme.font.family,
                      fontSize: theme.font.size.body,
                    }}
                  >
                    {`Cooked · for ${dinner.servings}`}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  dinner.liked
                    ? "You liked this dinner. Tap to mark it as not for us"
                    : "Marked not for us. Tap to mark it as liked"
                }
                onPress={onToggleLiked}
                hitSlop={8}
                style={({ pressed }) => ({
                  minHeight: 44,
                  minWidth: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: theme.spacing.xs,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons
                  name={dinner.liked ? "thumbs-up" : "close"}
                  size={dinner.liked ? 30 : 20}
                  color={dinner.liked ? theme.colors.primary : theme.colors.textMuted}
                />
                {!dinner.liked ? (
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      fontFamily: theme.font.family,
                      fontSize: theme.font.size.body,
                    }}
                  >
                    Not for us
                  </Text>
                ) : null}
              </Pressable>
            </View>

            {left.length > 0 ? (
              <View
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  borderRadius: theme.radius.sm,
                  padding: theme.spacing.sm,
                  gap: theme.spacing.xs + 2,
                }}
              >
                <Text
                  style={{
                    ...text,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  What's left
                </Text>
                {left.map((line) => (
                  <View key={line.key} style={{ gap: 3 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text
                        style={{
                          ...text,
                          flex: 1,
                          fontSize: theme.font.size.caption + 1,
                        }}
                      >
                        {line.label}
                      </Text>
                      <Text
                        style={{
                          ...text,
                          fontSize: theme.font.size.caption + 1,
                          fontWeight: theme.font.weight.medium,
                          fontVariant: ["tabular-nums"],
                        }}
                      >
                        {`${Math.round(line.pct)}%`}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: theme.colors.surfaceAlt,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.max(2, Math.min(100, line.pct))}%`,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: theme.colors.primary,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Undo: mark ${name} as not cooked`}
              onPress={onUndo}
              hitSlop={10}
              style={({ pressed }) => ({
                alignSelf: "flex-start",
                minHeight: 32,
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontFamily: theme.font.family,
                  fontSize: theme.font.size.caption,
                  textDecorationLine: "underline",
                }}
              >
                Not cooked after all
              </Text>
            </Pressable>
          </>
        ) : next ? (
          <>
            <Text
              style={{
                ...text,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {`${name} · ${minutes} min · for ${dinner.servings}`}
            </Text>
            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Start cooking ${name}`}
                onPress={onStart}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.primary,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text
                  style={{
                    color: theme.colors.onPrimary,
                    fontFamily: theme.font.family,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                  }}
                >
                  Start cooking
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mark ${name} as cooked`}
                onPress={onMarkCooked}
                style={({ pressed }) => ({
                  flex: 1,
                  minHeight: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: theme.radius.sm,
                  borderWidth: 2,
                  borderColor: theme.colors.primary,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontFamily: theme.font.family,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                  }}
                >
                  Mark cooked
                </Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open recipe: ${name}`}
            onPress={onOpen}
            style={({ pressed }) => ({
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text
              style={{
                ...text,
                flex: 1,
                fontSize: theme.font.size.title,
                fontWeight: theme.font.weight.bold,
              }}
            >
              {name}
            </Text>
            <Text
              style={{
                color: theme.colors.primary,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.body,
              }}
            >
              Open recipe
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
