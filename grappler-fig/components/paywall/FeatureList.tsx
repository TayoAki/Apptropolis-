// A titled list of plain lines, each with a check: what Pro adds.
import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { Card } from "../card";

export function FeatureList({ title, items }: { title?: string; items: string[] }) {
  const theme = useTheme();
  return (
    <Card>
      {title ? (
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.text,
            fontSize: theme.font.size.body,
            fontWeight: theme.font.weight.bold,
          }}
        >
          {title}
        </Text>
      ) : null}
      {items.map((item) => (
        <View
          key={item}
          style={{ flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.md }}
        >
          <Ionicons
            name="checkmark"
            size={20}
            color={theme.colors.primary}
            style={{ marginTop: 2 }}
          />
          <Text
            style={{
              flex: 1,
              color: theme.colors.text,
              fontSize: theme.font.size.body,
              lineHeight: 24,
            }}
          >
            {item}
          </Text>
        </View>
      ))}
    </Card>
  );
}
