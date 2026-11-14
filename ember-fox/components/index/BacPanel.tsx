import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import {
  BAC_WINDOW_HOURS,
  HIGH_BAC_PERCENT,
  comingDayName,
  dayKey,
  formatBac,
  formatTime,
  profileBasis,
  type BacEstimate,
  type ProfileChoice,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";
import { Panel } from "../Panel";

/**
 * Shown, always in full and without a tap, when the estimate reaches HIGH_BAC_PERCENT
 * (data/schema). It says when to get help and nothing else: no diagnosis, no promise about what
 * the number means for this person, no advice on sobering up. The wording is the owner's to
 * change.
 */
export const HIGH_ESTIMATE_LINE =
  "This is a high estimate. If someone cannot be woken, is breathing slowly or irregularly, has a seizure or keeps vomiting, call emergency services and stay with them.";

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
  const zero = new Date(now.getTime() + bac.hoursToZero * 3600000);
  // A time past midnight is said with its day, so "9:45 AM" isn't read as this morning.
  const zeroDay = dayKey(zero) === dayKey(now) ? null : comingDayName(dayKey(zero), now);
  const zeroAt = `${formatTime(zero.toISOString())}${
    zeroDay === null ? "" : zeroDay === "tomorrow" ? " tomorrow" : ` on ${zeroDay}`
  }`;
  const basis = `Worked out from the drinks you logged in the last ${BAC_WINDOW_HOURS} hours, ${profileBasis(profile)}${
    profile.weightSet && profile.bodyTypeSet ? "" : " (set yours in Settings)"
  }. It leaves out food, drink strength and your own metabolism, so your real level can be higher.`;

  return (
    <Panel style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
      <View
        accessible
        accessibilityLabel={
          active
            ? `Estimated blood alcohol ${formatBac(bac.percent)}. The estimate reaches zero around ${zeroAt}.`
            : `Estimated blood alcohol: no drinks logged in the last ${BAC_WINDOW_HOURS} hours.`
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
          : `No drinks logged in the last ${BAC_WINDOW_HOURS} hours.`}
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
        An estimate only, even at zero. Never drive after drinking.
      </Text>
      {bac.percent >= HIGH_BAC_PERCENT ? (
        <View
          accessible
          accessibilityRole="alert"
          accessibilityLabel={`Important. ${HIGH_ESTIMATE_LINE}`}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: theme.spacing.sm,
            marginTop: theme.spacing.xs,
            paddingTop: theme.spacing.md,
            borderTopWidth: 1,
            borderTopColor: theme.colors.textMuted,
          }}
        >
          <Ionicons
            name="warning"
            size={22}
            color={theme.colors.warning}
            style={{ marginTop: 1 }}
          />
          <Text
            style={{
              flex: 1,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              lineHeight: 22,
              fontWeight: theme.font.weight.medium,
            }}
          >
            {HIGH_ESTIMATE_LINE}
          </Text>
        </View>
      ) : null}
    </Panel>
  );
}
