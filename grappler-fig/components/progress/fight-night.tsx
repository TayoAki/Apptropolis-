// The last session as a shareable card: the session's stats, the coach's top fix and a share
// button. The card itself is captured as the image; the button sits outside the capture.
import { Text, View } from "react-native";
import { appInfo } from "../../data/app-info";
import { formatDay, formatTime, type WorkoutSession } from "../../data/schema";
import { CALLOUT_MS } from "../../data/training";
import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "../card";
import { Appear, CountUp } from "../motion";
import { useShareImage } from "../share";
import { SecondaryButton, displayFace } from "../ui";


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
  const seconds = session.rounds * session.roundSeconds;
  // Under two minutes the work is told in seconds, so a 30-second round isn't "1 minute".
  const short = seconds < 120;
  const worked = short ? seconds : Math.round(seconds / 60);
  const workedUnit = short ? "seconds" : "minutes";
  // The timer calls a punch every few seconds: this is how many it called, not a guess.
  const callouts = Math.floor((seconds * 1000) / CALLOUT_MS);
  const roundsText = `${session.rounds} ${session.rounds === 1 ? "round" : "rounds"}`;
  const message = `${roundsText}, ${worked} ${workedUnit} on ${appInfo.name}.${
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
              <Stat value={worked} label={workedUnit} />
              <Stat value={session.rounds} label={session.rounds === 1 ? "round" : "rounds"} />
              <Stat value={callouts} label="callouts" />
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
