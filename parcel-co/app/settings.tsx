import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { AiImage } from "../components/AiImage";
import { Lottie } from "../components/lottie";
import { Appear, haptic, Mascot, Skeleton, Stagger } from "../components/motion";
import {
  Card,
  DISPLAY_FONT,
  Radio,
  Row,
  SectionHeading,
  Segmented,
  Wheel,
} from "../components/settings/Controls";
import { useSupport } from "../components/support";
import { PrimaryButton } from "../components/ui";
import { appInfo } from "../data/app-info";
import { useAppState } from "../data/app-state";
import { usePurchases } from "../data/purchases";
import { useCollection } from "../data/repo";
import { useReminder } from "../data/reminders";
import {
  SHOP_MODES,
  type AssistantMessage,
  type Order,
  type Product,
  type ShopMode,
} from "../data/schema";
import { useTheme } from "../theme/ThemeProvider";

type Tone = "playful" | "brief";

const MODE_NAMES: Record<ShopMode, string> = {
  style: "Style (clothing)",
  glow: "Glow (skincare)",
  home: "Home",
  pantry: "Pantry (food & drink)",
};

const WALLET = Platform.OS === "android" ? "Google Pay" : "Apple Pay";
const BILLING_URL =
  Platform.OS === "ios"
    ? "https://apps.apple.com/account/billing"
    : Platform.OS === "android"
      ? "https://play.google.com/store/paymentmethods"
      : "";

const MONO = Platform.OS === "ios" ? "Menlo" : "monospace";

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const PERIODS = ["AM", "PM"];

function clock(hour: number, minute: number): string {
  const period = hour < 12 ? "AM" : "PM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * The shop mode saved in onboarding, whether it was stored as a key ("glow"), its label
 * ("Glow") or its full name ("Glow (skincare)").
 */
function modeKey(raw: string | undefined): ShopMode | null {
  const value = raw?.trim().toLowerCase();
  if (!value) return null;
  return (
    SHOP_MODES.find((m) => {
      const label = m.label.toLowerCase();
      return (
        value === m.key ||
        value === label ||
        value.startsWith(label) ||
        value === MODE_NAMES[m.key].toLowerCase()
      );
    })?.key ?? null
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const reminder = useReminder();
  const { answers, setAnswer, resetOnboarding } = useAppState();
  const purchases = usePurchases();
  const support = useSupport();
  const orders = useCollection<Order>("orders");
  const products = useCollection<Product>("products");
  const messages = useCollection<AssistantMessage>("assistant_messages");

  const [timeOpen, setTimeOpen] = useState(true);
  const [modeOpen, setModeOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [draftAddress, setDraftAddress] = useState("");
  const [addressSaved, setAddressSaved] = useState(false);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    if (!addressSaved) return;
    const id = setTimeout(() => setAddressSaved(false), 1800);
    return () => clearTimeout(id);
  }, [addressSaved]);

  const shopMode = modeKey(answers.shopmode ?? answers.shop_mode ?? answers.mode);
  const tone: Tone = answers.tone === "brief" ? "brief" : "playful";
  const latestOrder = [...orders.items].sort((a, b) => b.placedAt.localeCompare(a.placedAt))[0];
  const address = answers.address?.trim() || latestOrder?.shippingAddress || "";
  const addressLoading = !answers.address && orders.loading;

  const hourIndex = (reminder.hour % 12 || 12) - 1;
  const periodIndex = reminder.hour >= 12 ? 1 : 0;
  const minuteIndex = Math.min(11, Math.round(reminder.minute / 5));

  const supportUnread = support.unread;
  const restoreMessage =
    restoreNote ??
    (purchases.error && purchases.status === "idle"
      ? purchases.error
      : "Bought on another phone? Bring it back here.");

  function toggleTime() {
    haptic("selection");
    setTimeOpen((open) => !open);
  }

  async function toggleReminder(on: boolean) {
    haptic("selection");
    if (on) {
      await reminder.enable({
        title: "Pip's parcel update",
        body: "Where your open orders are today, in one calm summary.",
        hour: reminder.hour,
        minute: reminder.minute,
      });
    } else {
      await reminder.disable();
    }
  }

  function changeHour(i: number) {
    void reminder.setTime(((i + 1) % 12) + periodIndex * 12, reminder.minute);
  }

  function changeMinute(i: number) {
    void reminder.setTime(reminder.hour, i * 5);
  }

  function changePeriod(i: number) {
    void reminder.setTime((reminder.hour % 12) + i * 12, reminder.minute);
  }

  async function pickMode(key: ShopMode) {
    haptic("selection");
    await setAnswer("shopmode", key);
    setModeOpen(false);
  }

  function startEditingAddress() {
    setDraftAddress(address);
    setEditingAddress(true);
  }

  async function saveAddress() {
    const next = draftAddress.trim();
    if (!next) return;
    await setAnswer("address", next);
    haptic("success");
    setEditingAddress(false);
    setAddressSaved(true);
  }

  async function restore() {
    setRestoreNote(null);
    const ok = await purchases.restorePurchases();
    setRestoreNote(ok ? "Premium restored on this phone." : null);
  }

  async function resetData() {
    if (!armed) {
      haptic("warning");
      setCleared(false);
      setArmed(true);
      return;
    }
    setArmed(false);
    setCleared(false);
    setClearing(true);
    try {
      for (const product of products.items) {
        if (product.cartQuantity > 0 || product.isWishlisted) {
          await products.update(product.id, { cartQuantity: 0, isWishlisted: false });
        }
      }
      for (const message of messages.items) await messages.remove(message.id);
      haptic("success");
      setCleared(true);
    } finally {
      setClearing(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Settings",
          headerLargeTitle: true,
          headerLargeTitleStyle: {
            fontFamily: DISPLAY_FONT,
            fontWeight: "400",
            fontSize: theme.font.size.display,
            color: theme.colors.text,
          },
          headerTitleStyle: {
            fontFamily: DISPLAY_FONT,
            fontWeight: "400",
            color: theme.colors.text,
          },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.xl * 2,
        }}
      >
        <Stagger step={70} style={{ gap: theme.spacing.xl }}>
          {/* Order notifications */}
          <View style={{ gap: theme.spacing.sm }}>
            <SectionHeading>Order Notifications & Nudges</SectionHeading>
            <Card>
              {reminder.ready ? (
                <Row
                  label="Daily Order Reminder"
                  chevron={false}
                  last
                  right={
                    <Switch
                      value={reminder.enabled}
                      onValueChange={toggleReminder}
                      accessibilityLabel="Daily order reminder"
                      trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.success }}
                      thumbColor={theme.colors.surface}
                      ios_backgroundColor={theme.colors.surfaceAlt}
                    />
                  }
                />
              ) : (
                <View style={{ paddingVertical: theme.spacing.sm }}>
                  <Skeleton height={44} />
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remind me at ${clock(reminder.hour, reminder.minute)}. ${
                  timeOpen ? "Hide the time wheels" : "Show the time wheels"
                }`}
                accessibilityState={{ expanded: timeOpen }}
                onPress={toggleTime}
                style={({ pressed }) => ({
                  minHeight: 48,
                  marginTop: theme.spacing.sm,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1.5,
                  borderColor: theme.colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: theme.spacing.lg,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontSize: theme.font.size.body,
                    fontWeight: theme.font.weight.medium,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {`Remind me at ${clock(reminder.hour, reminder.minute)}`}
                </Text>
              </Pressable>

              {timeOpen ? (
                <Appear distance={8} duration={280}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: theme.spacing.sm,
                      paddingTop: theme.spacing.sm,
                    }}
                  >
                    <Wheel
                      label="Hour"
                      items={HOURS}
                      index={hourIndex}
                      onChange={changeHour}
                      width={76}
                    />
                    <Wheel
                      label="Minute"
                      items={MINUTES}
                      index={minuteIndex}
                      onChange={changeMinute}
                      width={76}
                    />
                    <Wheel
                      label="AM or PM"
                      items={PERIODS}
                      index={periodIndex}
                      onChange={changePeriod}
                      width={70}
                    />
                  </View>
                </Appear>
              ) : null}

              {reminder.permission === "denied" ? (
                <View style={{ gap: theme.spacing.xs, paddingTop: theme.spacing.sm }}>
                  <Text
                    style={{
                      color: theme.colors.danger,
                      fontSize: theme.font.size.caption,
                      lineHeight: 18,
                    }}
                  >
                    Notifications for Parcel & Co are off. Allow them in your phone's Settings to
                    get the daily reminder.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => Linking.openSettings()}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      minHeight: 44,
                      justifyContent: "center",
                      opacity: pressed ? 0.6 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.medium,
                      }}
                    >
                      Open phone Settings
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <Text
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.caption,
                  lineHeight: 18,
                  paddingTop: theme.spacing.sm,
                  paddingBottom: theme.spacing.xs,
                }}
              >
                Pip sends one calm summary of open parcel movements each morning.
              </Text>
            </Card>
          </View>

          {/* Shop experience */}
          <View style={{ gap: theme.spacing.sm }}>
            <SectionHeading>Shop Experience</SectionHeading>
            <Card>
              <Row
                label="Default Shop Mode"
                accessibilityLabel={`Default shop mode, ${
                  shopMode ? MODE_NAMES[shopMode] : "not set"
                }. Change`}
                onPress={() => {
                  haptic("selection");
                  setModeOpen((open) => !open);
                }}
                right={
                  <Text
                    numberOfLines={1}
                    style={{
                      color: theme.colors.primary,
                      fontSize: theme.font.size.body,
                      flexShrink: 1,
                      maxWidth: 180,
                    }}
                  >
                    {shopMode ? MODE_NAMES[shopMode] : "Choose"}
                  </Text>
                }
              />
              {modeOpen
                ? SHOP_MODES.map((mode) => (
                    <Row
                      key={mode.key}
                      label={MODE_NAMES[mode.key]}
                      selected={shopMode === mode.key}
                      chevron={false}
                      right={<Radio selected={shopMode === mode.key} />}
                      onPress={() => pickMode(mode.key)}
                    />
                  ))
                : null}

              {/* Pip peeks out over the divider between the two rows. */}
              <View style={{ height: 0 }}>
                <Mascot
                  pose="pip-neutral"
                  size={54}
                  style={{ position: "absolute", left: "43%", top: -30 }}
                />
              </View>

              <Row label="Pip Assistant Tone" chevron={false} last>
                <Segmented<Tone>
                  label="Pip assistant tone"
                  options={[
                    { key: "playful", label: "Playful & Warm" },
                    { key: "brief", label: "Brief & Direct" },
                  ]}
                  value={tone}
                  onChange={(key) => setAnswer("tone", key)}
                />
              </Row>
            </Card>
          </View>

          {/* Shipping & billing */}
          <View style={{ gap: theme.spacing.sm }}>
            <SectionHeading>Shipping & Billing</SectionHeading>
            <Card>
              <View
                style={{
                  paddingVertical: theme.spacing.sm,
                  gap: theme.spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
                  borderStyle: "dashed",
                }}
              >
                {addressLoading ? (
                  <View style={{ gap: theme.spacing.sm }}>
                    <Skeleton width="80%" height={16} />
                    <Skeleton width="55%" height={16} />
                  </View>
                ) : editingAddress ? (
                  <View style={{ gap: theme.spacing.md }}>
                    <TextInput
                      value={draftAddress}
                      onChangeText={setDraftAddress}
                      multiline
                      autoCapitalize="words"
                      placeholder="Street, apartment, city, state and ZIP"
                      placeholderTextColor={theme.colors.textMuted}
                      accessibilityLabel="Shipping address"
                      style={{
                        minHeight: 88,
                        borderRadius: theme.radius.sm,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.background,
                        padding: theme.spacing.md,
                        color: theme.colors.text,
                        fontFamily: MONO,
                        fontSize: theme.font.size.body,
                        lineHeight: 22,
                        textAlignVertical: "top",
                      }}
                    />
                    <View
                      style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}
                    >
                      <PrimaryButton
                        label="Save address"
                        onPress={saveAddress}
                        disabled={!draftAddress.trim()}
                        style={{ flex: 1 }}
                      />
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setEditingAddress(false)}
                        hitSlop={8}
                        style={({ pressed }) => ({
                          minHeight: 44,
                          paddingHorizontal: theme.spacing.md,
                          justifyContent: "center",
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <Text
                          style={{
                            color: theme.colors.textMuted,
                            fontSize: theme.font.size.body,
                            fontWeight: theme.font.weight.medium,
                          }}
                        >
                          Cancel
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}>
                    <Text
                      style={{
                        flex: 1,
                        color: address ? theme.colors.text : theme.colors.textMuted,
                        fontFamily: MONO,
                        fontSize: theme.font.size.body,
                        lineHeight: 23,
                      }}
                    >
                      {address || "No shipping address yet. Add one so checkout is quicker."}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        address ? "Edit shipping address" : "Add shipping address"
                      }
                      hitSlop={8}
                      onPress={startEditingAddress}
                      style={({ pressed }) => ({
                        minHeight: 44,
                        minWidth: 64,
                        paddingHorizontal: theme.spacing.md,
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: theme.radius.pill,
                        borderWidth: 1.5,
                        borderColor: theme.colors.primary,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: theme.colors.primary,
                          fontSize: theme.font.size.body,
                          fontWeight: theme.font.weight.medium,
                        }}
                      >
                        {address ? "Edit" : "Add"}
                      </Text>
                    </Pressable>
                  </View>
                )}
                {addressSaved ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                    <Lottie name="success" size={36} />
                    <Text
                      style={{
                        color: theme.colors.success,
                        fontSize: theme.font.size.caption,
                        fontWeight: theme.font.weight.medium,
                      }}
                    >
                      Address saved. Your next order ships here.
                    </Text>
                  </View>
                ) : null}
              </View>

              <Row
                label={`${WALLET} (Default)`}
                accessibilityLabel={`${WALLET}, default. Manage payment methods`}
                leading={
                  <AiImage
                    prompt="Apple Pay card icon thumbnail"
                    style={{ width: 40, height: 26, borderRadius: 5 }}
                  />
                }
                right={
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 1.5,
                      borderColor: theme.colors.textMuted,
                    }}
                  />
                }
                onPress={BILLING_URL ? () => Linking.openURL(BILLING_URL) : undefined}
                chevron={Boolean(BILLING_URL)}
                last
              />
            </Card>
          </View>

          {/* Account & support */}
          <View style={{ gap: theme.spacing.sm }}>
            <SectionHeading>Account & Support</SectionHeading>
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
              <Card style={{ flex: 1 }}>
                {support.available ? (
                  <Row
                    label="Help & Concierge Desk"
                    onPress={support.open}
                    right={
                      supportUnread > 0 ? (
                        <View
                          style={{
                            minWidth: 22,
                            height: 22,
                            borderRadius: 11,
                            paddingHorizontal: 6,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: theme.colors.primary,
                          }}
                        >
                          <Text
                            style={{
                              color: theme.colors.onPrimary,
                              fontSize: theme.font.size.caption,
                              fontWeight: theme.font.weight.bold,
                              fontVariant: ["tabular-nums"],
                            }}
                          >
                            {supportUnread > 99 ? "99+" : supportUnread}
                          </Text>
                        </View>
                      ) : null
                    }
                  />
                ) : null}
                {appInfo.termsUrl ? (
                  <Row label="Terms of Service" onPress={() => Linking.openURL(appInfo.termsUrl)} />
                ) : null}
                {appInfo.privacyUrl ? (
                  <Row label="Privacy Policy" onPress={() => Linking.openURL(appInfo.privacyUrl)} />
                ) : null}
                <Row
                  label="Restore purchases"
                  detail={restoreMessage}
                  disabled={purchases.status !== "idle"}
                  chevron={false}
                  onPress={restore}
                  right={
                    purchases.status === "restoring" ? (
                      <Text
                        style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
                      >
                        Checking…
                      </Text>
                    ) : null
                  }
                />
                <Row label="Replay onboarding" onPress={() => resetOnboarding()} />
                <Row
                  label="Reset App Data"
                  danger
                  chevron={false}
                  last
                  disabled={products.loading || messages.loading || clearing}
                  detail={
                    cleared
                      ? "Cleared. Your orders are kept."
                      : armed
                        ? "Tap again to confirm. This can't be undone."
                        : "Clears your cart, wishlist and Pip chat. Orders stay."
                  }
                  right={cleared ? <Lottie name="success" size={32} /> : null}
                  onPress={resetData}
                  accessibilityLabel={armed ? "Confirm reset app data" : "Reset app data"}
                />
              </Card>
              <Mascot
                pose="pip-delivering"
                size={128}
                style={{ marginLeft: -theme.spacing.md, marginBottom: -theme.spacing.sm }}
              />
            </View>
          </View>

          <Text
            style={{
              color: theme.colors.textMuted,
              fontFamily: MONO,
              fontSize: theme.font.size.caption,
              textAlign: "center",
            }}
          >
            {`${appInfo.name} v${appInfo.version} · Crafted on ${theme.name}`}
          </Text>
        </Stagger>
      </ScrollView>
    </>
  );
}
