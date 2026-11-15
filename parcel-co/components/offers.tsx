// The pieces every screen shows a coupon, deal or store with, and the two actions behind them:
// copy a code (then shop) and save it for later.
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { track } from "../data/analytics";
import { useCollection } from "../data/repo";
import {
  dealSaving,
  discountLabel,
  endsLabel,
  formatMoney,
  minSpendLabel,
  seenLabel,
  shortDate,
  type Coupon,
  type Deal,
  type SavedItem,
} from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";
import { haptic, PressScale } from "./motion";

type IconName = ComponentProps<typeof Ionicons>["name"];

/** Open a store or product page; says so when the phone can't. */
export async function openLink(url: string | null, what: string): Promise<string | null> {
  if (!url) return `There's no link for ${what} yet.`;
  try {
    await Linking.openURL(url);
    track("shop_opened", { what });
    return null;
  } catch {
    return `Couldn't open ${what}. Try again.`;
  }
}

/** Copies a coupon's code. Returns false when the phone wouldn't copy. */
export async function copyCode(coupon: Coupon): Promise<boolean> {
  if (!coupon.code) return false;
  try {
    await Clipboard.setStringAsync(coupon.code);
    haptic("success");
    track("code_copied", { store: coupon.storeSlug });
    return true;
  } catch {
    return false;
  }
}

/** What the person saved, and saving or unsaving a coupon or deal. */
export function useSaved() {
  const saved = useCollection<SavedItem>("saved");
  const byKey = useMemo(() => new Map(saved.items.map((s) => [s.key, s])), [saved.items]);
  return {
    ...saved,
    isSaved: (key: string) => byKey.has(key),
    async toggleCoupon(coupon: Coupon) {
      const existing = byKey.get(coupon.key);
      haptic("selection");
      if (existing) return saved.remove(existing.id);
      await saved.add({ kind: "coupon", key: coupon.key, coupon, savedAt: new Date().toISOString() });
      track("saved", { kind: "coupon" });
    },
    async toggleDeal(deal: Deal) {
      const existing = byKey.get(deal.key);
      haptic("selection");
      if (existing) return saved.remove(existing.id);
      await saved.add({ kind: "deal", key: deal.key, deal, savedAt: new Date().toISOString() });
      track("saved", { kind: "deal" });
    },
  };
}

/** A store's logo, or its first letter on a tinted disc when there is no logo. */
export function StoreAvatar({ name, logoUrl, size = 40 }: { name: string; logoUrl?: string | null; size?: number }) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  if (logoUrl && !failed) {
    return (
      <Image
        source={{ uri: logoUrl }}
        contentFit="contain"
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: theme.colors.border,
        }}
      />
    );
  }
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.colors.surfaceAlt,
      }}
    >
      <Text
        style={{
          color: theme.colors.primary,
          fontSize: size * 0.42,
          fontWeight: theme.font.weight.bold,
        }}
      >
        {name.trim().charAt(0).toUpperCase() || "?"}
      </Text>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  color,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={22} color={color ?? theme.colors.textMuted} />
    </Pressable>
  );
}

/** Small grey facts under a coupon or deal, joined with dots. */
function Meta({ parts }: { parts: Array<string | null | undefined | false> }) {
  const theme = useTheme();
  const text = parts.filter(Boolean).join(" · ");
  if (!text) return null;
  return (
    <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, lineHeight: 17 }}>
      {text}
    </Text>
  );
}

/**
 * One coupon: the store, the saving in large type, the code in a dashed box with Copy, and where
 * and when it was found. "Tested" appears only when the owner's scraper tried the code at a
 * checkout and it worked; nothing else claims a code works.
 */
export function CouponCard({
  coupon,
  saved,
  onToggleSave,
  showStore = true,
  expired = false,
}: {
  coupon: Coupon;
  saved: boolean;
  onToggleSave: () => void;
  showStore?: boolean;
  /** For a saved coupon whose end date has passed. */
  expired?: boolean;
}) {
  const theme = useTheme();
  const [copied, setCopied] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    setProblem(null);
    const ok = await copyCode(coupon);
    if (ok) setCopied(true);
    else setProblem("Couldn't copy the code. Press and hold it to copy it yourself.");
  }

  async function shop() {
    setProblem(await openLink(coupon.url, coupon.storeName));
  }

  const ends = expired ? "Expired" : endsLabel(coupon.expiresAt);

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
        opacity: expired ? 0.75 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        {showStore ? <StoreAvatar name={coupon.storeName} logoUrl={coupon.storeLogoUrl} size={32} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          {showStore ? (
            <Text
              numberOfLines={1}
              style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, fontWeight: theme.font.weight.medium }}
            >
              {coupon.storeName}
            </Text>
          ) : null}
          <Text
            numberOfLines={1}
            style={{ color: theme.colors.text, fontSize: theme.font.size.title, fontWeight: theme.font.weight.bold }}
          >
            {discountLabel(coupon)}
          </Text>
        </View>
        <IconButton
          icon={saved ? "bookmark" : "bookmark-outline"}
          label={saved ? `Remove ${coupon.storeName} ${discountLabel(coupon)} from saved` : `Save ${coupon.storeName} ${discountLabel(coupon)}`}
          color={saved ? theme.colors.primary : undefined}
          onPress={onToggleSave}
        />
      </View>

      <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 22 }}>{coupon.title}</Text>
      {coupon.details ? (
        <Text numberOfLines={3} style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption, lineHeight: 17 }}>
          {coupon.details}
        </Text>
      ) : null}
      <Meta parts={[minSpendLabel(coupon), ends]} />

      <View style={{ flexDirection: "row", alignItems: "stretch", gap: theme.spacing.sm }}>
        {coupon.code ? (
          <PressScale
            onPress={copy}
            disabled={expired}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel={copied ? `Copied ${coupon.code}` : `Copy code ${coupon.code}`}
            style={{
              flex: 1,
              minHeight: 48,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.sm,
              borderWidth: 1.5,
              borderStyle: "dashed",
              borderColor: theme.colors.primary,
              backgroundColor: theme.colors.background,
            }}
          >
            <Text
              selectable
              numberOfLines={1}
              style={{
                flexShrink: 1,
                color: theme.colors.text,
                fontSize: theme.font.size.body,
                fontWeight: theme.font.weight.bold,
                letterSpacing: 1,
                fontVariant: ["tabular-nums"],
              }}
            >
              {coupon.code}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons
                name={copied ? "checkmark-circle" : "copy-outline"}
                size={18}
                color={copied ? theme.colors.success : theme.colors.primary}
              />
              <Text
                style={{
                  color: copied ? theme.colors.success : theme.colors.primary,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.bold,
                }}
              >
                {copied ? "Copied" : "Copy"}
              </Text>
            </View>
          </PressScale>
        ) : (
          <View
            style={{
              flex: 1,
              minHeight: 48,
              justifyContent: "center",
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Text style={{ color: theme.colors.text, fontSize: theme.font.size.body }}>No code needed</Text>
          </View>
        )}
        <PressScale
          onPress={shop}
          scaleTo={0.97}
          accessibilityRole="link"
          accessibilityLabel={`Shop at ${coupon.storeName}`}
          style={{
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: theme.spacing.md,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.primary,
          }}
        >
          <Text style={{ color: theme.colors.onPrimary, fontSize: theme.font.size.body, fontWeight: theme.font.weight.bold }}>
            Shop
          </Text>
          <Ionicons name="open-outline" size={16} color={theme.colors.onPrimary} />
        </PressScale>
      </View>

      {problem ? (
        <Text accessibilityRole="alert" style={{ color: theme.colors.danger, fontSize: theme.font.size.caption }}>
          {problem}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {coupon.verifiedAt ? (
          <Ionicons name="shield-checkmark" size={14} color={theme.colors.success} />
        ) : null}
        <Meta
          parts={[
            coupon.verifiedAt ? `Tested ${shortDate(coupon.verifiedAt)}` : null,
            seenLabel(coupon.lastSeenAt),
            `from ${coupon.source}`,
          ]}
        />
      </View>
    </View>
  );
}

/** One deal: the product, its price against the was-price, the store, and a link to it. */
export function DealCard({
  deal,
  saved,
  onToggleSave,
}: {
  deal: Deal;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const theme = useTheme();
  const [problem, setProblem] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const saving = dealSaving(deal);

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.md,
        gap: theme.spacing.sm,
      }}
    >
      <View style={{ flexDirection: "row", gap: theme.spacing.md }}>
        {deal.imageUrl && !imageFailed ? (
          <Image
            source={{ uri: deal.imageUrl }}
            contentFit="contain"
            onError={() => setImageFailed(true)}
            accessibilityLabel={deal.title}
            style={{ width: 72, height: 72, borderRadius: theme.radius.sm, backgroundColor: "#FFFFFF" }}
          />
        ) : (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: 72,
              height: 72,
              borderRadius: theme.radius.sm,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            <Ionicons name="pricetag-outline" size={28} color={theme.colors.primary} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text numberOfLines={2} style={{ color: theme.colors.text, fontSize: theme.font.size.body, lineHeight: 21, fontWeight: theme.font.weight.medium }}>
            {deal.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", columnGap: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.text, fontSize: theme.font.size.title, fontWeight: theme.font.weight.bold, fontVariant: ["tabular-nums"] }}>
              {formatMoney(deal.price, deal.currency)}
            </Text>
            {deal.wasPrice && deal.wasPrice > deal.price ? (
              <Text
                accessibilityLabel={`was ${formatMoney(deal.wasPrice, deal.currency)}`}
                style={{ color: theme.colors.textMuted, fontSize: theme.font.size.body, textDecorationLine: "line-through", fontVariant: ["tabular-nums"] }}
              >
                {formatMoney(deal.wasPrice, deal.currency)}
              </Text>
            ) : null}
            {saving ? (
              <Text style={{ color: theme.colors.success, fontSize: theme.font.size.body, fontWeight: theme.font.weight.bold }}>
                {`${saving}% less`}
              </Text>
            ) : null}
          </View>
          <Meta
            parts={[
              deal.storeName ?? deal.brand,
              deal.rating ? `★ ${deal.rating.toFixed(1)}${deal.reviewCount ? ` (${deal.reviewCount.toLocaleString()})` : ""}` : null,
              seenLabel(deal.lastSeenAt),
            ]}
          />
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
        <PressScale
          onPress={async () => setProblem(await openLink(deal.url, deal.storeName ?? "the deal"))}
          scaleTo={0.97}
          accessibilityRole="link"
          accessibilityLabel={`View ${deal.title} at ${deal.storeName ?? "the store"}`}
          style={{
            flex: 1,
            minHeight: 44,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            borderRadius: theme.radius.sm,
            borderWidth: 1.5,
            borderColor: theme.colors.primary,
          }}
        >
          <Text style={{ color: theme.colors.primary, fontSize: theme.font.size.body, fontWeight: theme.font.weight.bold }}>
            View deal
          </Text>
          <Ionicons name="open-outline" size={16} color={theme.colors.primary} />
        </PressScale>
        <IconButton
          icon={saved ? "bookmark" : "bookmark-outline"}
          label={saved ? `Remove ${deal.title} from saved` : `Save ${deal.title}`}
          color={saved ? theme.colors.primary : undefined}
          onPress={onToggleSave}
        />
      </View>
      {problem ? (
        <Text accessibilityRole="alert" style={{ color: theme.colors.danger, fontSize: theme.font.size.caption }}>
          {problem}
        </Text>
      ) : null}
    </View>
  );
}

/** The gear button at the top right of every tab. */
export function SettingsButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      hitSlop={6}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
    </Pressable>
  );
}
