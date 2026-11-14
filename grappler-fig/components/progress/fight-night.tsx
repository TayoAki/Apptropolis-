// The last session as a shareable card: the session's stats, the coach's top fix and a share
// button. The card itself is captured as the image; the button sits outside the capture.
import { Text, View } from "react-native";
import { appInfo } from "../../data/app-info";
import { formatDay, formatTime, type WorkoutSession } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { AiImage } from "../AiImage";
import { PrimaryButton } from "../button";
import { Appear, CountUp } from "../motion";
import { useShareImage } from "../share";
import { displayFont, Panel } from "./panel";

/** A rough punch count per minute of work, for the card's "est. punches" figure. */
const PUNCHES_PER_MINUTE = 20;

function Stat({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View>
      <CountUp
        value={value}
        format={(n) => Math.round(n).toLocaleString()}
        style={{
          color: theme.colors.text,
          fontFamily: displayFont,
          fontSize: theme.font.size.headline,
        }}
      />
      <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
        {label}
      </Text>
    </View>
  );
}

export function FightNightCard({ session, fix }: { session: WorkoutSession; fix: string }) {
  const theme = useTheme();
  const { ref, share, sharing } = useShareImage();
  const minutes = Math.round((session.rounds * session.roundSeconds) / 60);
  const punches = minutes * PUNCHES_PER_MINUTE;
  const titleSize = Math.round(theme.font.size.display * 0.6);
  const message = `${session.rounds} rounds, ${minutes} minutes on ${appInfo.name}.${
    fix ? ` Coach fix: ${fix}` : ""
  }`;

  return (
    <Appear>
      <View style={{ gap: theme.spacing.md }}>
        <View ref={ref} collapsable={false}>
          <Panel>
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                fontWeight: theme.font.weight.medium,
              }}
            >
              {`${formatDay(session.date)} · ${formatTime(session.date)}`}
            </Text>
            <Text
              accessibilityRole="header"
              style={{
                fontFamily: displayFont,
                fontSize: titleSize,
                lineHeight: titleSize,
                color: theme.colors.primary,
              }}
            >
              FIGHT
            </Text>
            <Text
              style={{
                fontFamily: displayFont,
                fontSize: titleSize,
                lineHeight: titleSize,
                color: theme.colors.text,
              }}
            >
              NIGHT
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Stat value={minutes} label="mins" />
              <Stat value={session.rounds} label="rounds" />
              <Stat value={punches} label="est. punches" />
            </View>

            {fix ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.sm,
                  backgroundColor: theme.colors.background,
                  padding: theme.spacing.md,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: theme.colors.text,
                    fontSize: theme.font.size.body,
                  }}
                >
                  <Text
                    style={{
                      color: theme.colors.primary,
                      fontWeight: theme.font.weight.bold,
                    }}
                  >
                    COACH TOP FIX:{" "}
                  </Text>
                  {fix}
                </Text>
                <AiImage
                  prompt="a red crosshair target icon, thin line style, no text, transparent background"
                  fit="contain"
                  style={{ width: 28, height: 28 }}
                />
              </View>
            ) : null}
          </Panel>
        </View>
        <PrimaryButton
          label="SHARE SESSION CARD"
          icon="play"
          disabled={sharing}
          onPress={() => void share({ message, title: `${appInfo.name} session` })}
        />
      </View>
    </Appear>
  );
}
