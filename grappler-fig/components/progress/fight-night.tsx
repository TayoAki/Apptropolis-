// The last session as a shareable card: the session's stats, the coach's top fix and a share
// button. The card itself is captured as the image; the button sits outside the capture.
import { Text, View } from "react-native";
import { appInfo } from "../../data/app-info";
import { formatDay, formatTime, type WorkoutSession } from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "../card";
import { Appear, CountUp } from "../motion";
import { useShareImage } from "../share";
import { SecondaryButton, displayFace } from "../ui";

/** A rough punch count per minute of work, for the card's "est. punches" figure. */
const PUNCHES_PER_MINUTE = 20;

function Stat({ value, label }: { value: number; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <CountUp
        value={value}
        format={(n) => Math.round(n).toLocaleString()}
        style={[displayFace, { color: theme.colors.text, fontSize: theme.font.size.headline }]}
      />
      <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2 }}>
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
  const message = `${session.rounds} rounds, ${minutes} minutes on ${appInfo.name}.${
    fix ? ` Coach fix: ${fix}` : ""
  }`;

  return (
    <Appear>
      <View style={{ gap: theme.spacing.md }}>
        <View ref={ref} collapsable={false}>
          <Card>
            <View style={{ gap: 2 }}>
              <Text
                accessibilityRole="header"
                style={[
                  displayFace,
                  {
                    color: theme.colors.text,
                    fontSize: theme.font.size.headline,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  },
                ]}
              >
                <Text style={{ color: theme.colors.primary }}>Fight</Text> night
              </Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption + 2 }}>
                {`Last session · ${formatDay(session.date)}, ${formatTime(session.date)}`}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
              <Stat value={minutes} label={minutes === 1 ? "minute" : "minutes"} />
              <Stat value={session.rounds} label={session.rounds === 1 ? "round" : "rounds"} />
              <Stat value={punches} label="est. punches" />
            </View>

            {fix ? (
              <View
                style={{
                  gap: theme.spacing.xs,
                  paddingTop: theme.spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.border,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: theme.font.size.caption + 2,
                    fontWeight: theme.font.weight.bold,
                  }}
                >
                  Coach's top fix
                </Text>
                <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 24 }}>
                  {fix}
                </Text>
              </View>
            ) : null}
          </Card>
        </View>
        <SecondaryButton
          label={sharing ? "Opening share…" : "Share session card"}
          icon="share-outline"
          disabled={sharing}
          onPress={() => void share({ message, title: `${appInfo.name} session` })}
        />
      </View>
    </Appear>
  );
}
