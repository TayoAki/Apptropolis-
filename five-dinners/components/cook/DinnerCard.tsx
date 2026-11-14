import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import type { PlanDinner } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Button } from "../Button";
import { DayTab } from "../DayTab";
import { Meter } from "../Meter";

export interface LeftLine {
  key: string;
  /** The pack, e.g. "Penne". */
  name: string;
  /** What remains of what there was, e.g. "280 g of 450 g". */
  amount: string;
  /** 0 to 100: how much of the pack is still left. */
  pct: number;
}

export type DinnerState = "cooked" | "next" | "later";

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

  const title = {
    color: theme.colors.text,
    fontFamily: theme.font.family,
    fontSize: theme.font.size.title,
    fontWeight: theme.font.weight.bold,
  } as const;
  const meta = {
    color: theme.colors.textMuted,
    fontFamily: theme.font.family,
    fontSize: theme.font.size.body,
    fontVariant: ["tabular-nums" as const],
  };
  const small = {
    color: theme.colors.text,
    fontFamily: theme.font.family,
    fontSize: theme.font.size.caption + 1,
    fontVariant: ["tabular-nums" as const],
  };

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
      <DayTab day={day} cooked={cooked} top={cooked ? theme.spacing.md + 4 : undefined} />

      <View style={{ flex: 1, padding: theme.spacing.md, gap: theme.spacing.sm + 4 }}>
        {cooked ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open recipe: ${name}, cooked, for ${dinner.servings}`}
                onPress={onOpen}
                style={({ pressed }) => ({ flex: 1, gap: 2, opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={title}>{name}</Text>
                <Text style={meta}>{`Cooked · for ${dinner.servings}`}</Text>
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
                  name={dinner.liked ? "thumbs-up" : "thumbs-down-outline"}
                  size={24}
                  color={dinner.liked ? theme.colors.primary : theme.colors.textMuted}
                />
                {!dinner.liked ? <Text style={meta}>Not for us</Text> : null}
              </Pressable>
            </View>

            {left.length > 0 ? (
              <View
                style={{
                  gap: theme.spacing.sm,
                  paddingTop: theme.spacing.sm + 4,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Text style={{ ...small, fontSize: theme.font.size.body, fontWeight: theme.font.weight.bold }}>
                  What's left
                </Text>
                {left.map((line) => (
                  <View key={line.key} style={{ gap: theme.spacing.xs }}>
                    <View
                      accessible
                      accessibilityLabel={`${line.name}: ${line.amount} left, ${Math.round(line.pct)} percent`}
                      style={{ flexDirection: "row", gap: theme.spacing.sm }}
                    >
                      <Text style={{ ...small, flex: 1 }}>{line.name}</Text>
                      <Text style={{ ...small, color: theme.colors.textMuted }}>{line.amount}</Text>
                      <Text
                        style={{
                          ...small,
                          minWidth: 36,
                          textAlign: "right",
                          fontWeight: theme.font.weight.medium,
                        }}
                      >
                        {`${Math.round(line.pct)}%`}
                      </Text>
                    </View>
                    <Meter value={line.pct / 100} height={4} />
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Undo: mark ${name} as not cooked`}
              onPress={onUndo}
              hitSlop={8}
              style={({ pressed }) => ({
                alignSelf: "flex-start",
                minHeight: 32,
                justifyContent: "center",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ ...small, color: theme.colors.textMuted, textDecorationLine: "underline" }}>
                Not cooked after all
              </Text>
            </Pressable>
          </>
        ) : next ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open recipe: ${name}, ${minutes} minutes, for ${dinner.servings}`}
              onPress={onOpen}
              style={({ pressed }) => ({ gap: 2, opacity: pressed ? 0.7 : 1 })}
            >
              <Text style={title}>{name}</Text>
              <Text style={meta}>{`${minutes} min · for ${dinner.servings}`}</Text>
            </Pressable>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
              <Button
                label="Start cooking"
                accessibilityLabel={`Start cooking ${name}`}
                onPress={onStart}
                style={{ flexGrow: 1 }}
              />
              <Button
                label="Mark cooked"
                variant="outline"
                accessibilityLabel={`Mark ${name} as cooked`}
                onPress={onMarkCooked}
                style={{ flexGrow: 1 }}
              />
            </View>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open recipe: ${name}, ${minutes} minutes, for ${dinner.servings}`}
            onPress={onOpen}
            style={({ pressed }) => ({
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={title}>{name}</Text>
              <Text style={meta}>{`${minutes} min · for ${dinner.servings}`}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
