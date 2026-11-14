import { Text, View } from "react-native";
import {
  formatBac,
  formatTime,
  profileBasis,
  type BacEstimate,
  type ProfileChoice,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Panel } from "../Panel";

/**
 * The rough BAC estimate, said as an estimate: the figure, when the estimate reaches zero, what
 * it is worked out from, what it leaves out, and that it is never a reason to drive.
 */
export function BacPanel({
  bac,
  profile,
  now,
}: {
  bac: BacEstimate;
  profile: ProfileChoice;
  now: Date;
}) {
  const theme = useTheme();
  const active = bac.percent > 0;
  const zeroAt = formatTime(new Date(now.getTime() + bac.hoursToZero * 3600000).toISOString());
  const basis = `Worked out from the drinks you logged in the last 12 hours, ${profileBasis(profile)}${
    profile.weightSet && profile.bodyTypeSet ? "" : " (set yours in Settings)"
  }. It leaves out food, drink strength and your own metabolism, so your real level can be higher.`;

  return (
    <Panel style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
      <View
        accessible
        accessibilityLabel={
          active
            ? `Estimated blood alcohol ${formatBac(bac.percent)}. The estimate reaches zero around ${zeroAt}.`
            : "Estimated blood alcohol: no drinks logged in the last 12 hours."
        }
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: theme.spacing.sm,
        }}
      >
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          Estimated BAC
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
            fontVariant: ["tabular-nums"],
          }}
        >
          {active ? formatBac(bac.percent) : "0.00%"}
        </Text>
      </View>
      <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>
        {active
          ? `The estimate reaches zero around ${zeroAt}, at an average clearing rate.`
          : "No drinks logged in the last 12 hours."}
      </Text>
      <Text
        style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, lineHeight: 18 }}
      >
        {basis}
      </Text>
      <Text
        style={{
          color: theme.colors.text,
          fontSize: theme.font.size.caption,
          fontWeight: theme.font.weight.bold,
        }}
      >
        An estimate only. Never drive after drinking.
      </Text>
    </Panel>
  );
}
