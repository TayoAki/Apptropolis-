import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";

/** A titled card: a heading row with a divider, then the content. */
export function Section({
  title,
  trailing,
  children,
}: {
  title: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm + 2,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.title,
            fontWeight: theme.font.weight.bold,
            fontFamily: theme.font.family,
          }}
        >
          {title}
        </Text>
        {trailing}
      </View>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>{children}</View>
    </View>
  );
}
