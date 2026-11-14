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
import { LottieBox } from "../components/LottieBox";
import { Appear, haptic, Skeleton, Stagger } from "../components/motion";
import { Pip } from "../components/Pip";
import { ProductArt } from "../components/ProductArt";
import { Card, Radio, Row, Segmented, Wheel } from "../components/settings/Controls";
import { useSupport } from "../components/support";
import { InlineNotice, navTitleStyle, PrimaryButton, SectionTitle } from "../components/ui";
import { appInfo } from "../data/app-info";
import { useAppState } from "../data/app-state";
import { usePurchases } from "../data/purchases";
import { useCollection } from "../data/repo";
import { useReminder } from "../data/reminders";
import {
  DEFAULT_SHOP_MODE,
  SHOP_MODES,
  WALLET,
  modeLabel,
  shopModeFrom,
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

const BILLING_URL =
  Platform.OS === "ios"
    ? "https://apps.apple.com/account/billing"
    : Platform.OS === "android"
      ? "https://play.google.com/store/paymentmethods"
      : "";

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const PERIODS = ["am", "pm"];

/** "8:00 pm", written the way the rest of the app writes times. */
function clock(hour: number, minute: number): string {
  const period = hour < 12 ? "am" : "pm";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`;
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

  const [timeOpen, setTimeOpen] = useState(false);
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

  // Until a mode is chosen the app shows the first one, so Settings shows that too.
  const shopMode =
    shopModeFrom(answers.shopmode ?? answers.shop_mode ?? answers.mode) ?? DEFAULT_SHOP_MODE;
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
      <Stack.Screen options={{ title: "Settings", headerTitleStyle: navTitleStyle(theme) }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.lg,
          paddingTop: theme.spacing.lg,
          paddingBottom: theme.spacing.xl * 2,
        }}
      >
        <Stagger step={70} style={{ gap: theme.spacing.xl }}>
          {/* Order notifications */}
          <View>
            <SectionTitle title="Order notifications & nudges" flush />
            <Card>
              {reminder.ready ? (
                <Row
                  label="Daily order reminder"
                  chevron={false}
                  right={
                    <Switch
                      value={reminder.enabled}
                      onValueChange={toggleReminder}
                      accessibilityLabel="Daily order reminder"
                      trackColor={{ false: theme.colors.textMuted, true: theme.colors.primary }}
                      thumbColor={theme.dark ? theme.colors.text : theme.colors.surface}
                      ios_backgroundColor={theme.colors.textMuted}
                    />
                  }
                />
              ) : (
                <View style={{ paddingVertical: theme.spacing.sm }}>
                  <Skeleton height={44} />
                </View>
              )}

              <Row
                label="Reminder time"
                accessibilityLabel={`Reminder time, ${clock(reminder.hour, reminder.minute)}. ${
                  timeOpen ? "Hide the time picker" : "Change"
                }`}
                onPress={toggleTime}
                chevron={false}
                right={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
                    <Text
                      style={{
                        color: theme.colors.primary,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.medium,
                        fontVariant: ["tabular-nums"],
                      }}
                    >
                      {clock(reminder.hour, reminder.minute)}
                    </Text>
                    <Ionicons
                      name={timeOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  </View>
                }
              />

              {timeOpen ? (
                <Appear distance={8} duration={280}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: theme.spacing.sm,
                      paddingVertical: theme.spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: theme.colors.border,
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
                      label="am or pm"
                      items={PERIODS}
                      index={periodIndex}
                      onChange={changePeriod}
                      width={70}
                    />
                  </View>
                </Appear>
              ) : null}

              {reminder.permission === "denied" ? (
                <View style={{ paddingTop: theme.spacing.md }}>
                  <InlineNotice icon="notifications-off-outline">
                    Notifications for Parcel & Co are off. Allow them in your phone's Settings to
                    get the daily reminder.
                  </InlineNotice>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Open phone Settings"
                    onPress={() => Linking.openSettings()}
                    hitSlop={8}
                    style={({ pressed }) => ({
                      alignSelf: "flex-start",
                      minHeight: 44,
                      marginLeft: 20 + theme.spacing.sm,
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
                  lineHeight: 17,
                  paddingVertical: theme.spacing.md,
                }}
              >
                Pip sends one calm summary of open parcel movements a day, at the time you set.
              </Text>
            </Card>
          </View>

          {/* Shop experience */}
          <View>
            <SectionTitle title="Shop experience" flush />
            <Card>
              <Row
                label="Default shop mode"
                accessibilityLabel={`Default shop mode, ${MODE_NAMES[shopMode]}. ${
                  modeOpen ? "Hide the choices" : "Change"
                }`}
                onPress={() => {
                  haptic("selection");
                  setModeOpen((open) => !open);
                }}
                chevron={false}
                right={
                  <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.xs }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        color: theme.colors.primary,
                        fontSize: theme.font.size.body,
                        fontWeight: theme.font.weight.medium,
                      }}
                    >
                      {modeLabel(shopMode)}
                    </Text>
                    <Ionicons
                      name={modeOpen ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={theme.colors.textMuted}
                    />
                  </View>
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

              <Row label="Pip assistant tone" chevron={false} last>
                <View style={{ paddingBottom: theme.spacing.xs }}>
                  <Segmented<Tone>
                    label="Pip assistant tone"
                    options={[
                      { key: "playful", label: "Playful & warm" },
                      { key: "brief", label: "Brief & direct" },
                    ]}
                    value={tone}
                    onChange={(key) => setAnswer("tone", key)}
                  />
                </View>
              </Row>
            </Card>
          </View>

          {/* Shipping & billing */}
          <View>
            <SectionTitle title="Shipping & billing" flush />
            <Card>
              <View
                style={{
                  paddingVertical: theme.spacing.md,
                  gap: theme.spacing.sm,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.border,
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
                      autoFocus
                      autoCapitalize="words"
                      placeholder="Street, apartment, city, state and ZIP"
                      placeholderTextColor={theme.colors.textMuted}
                      accessibilityLabel="Shipping address"
                      style={{
                        minHeight: 88,
                        borderRadius: theme.radius.sm,
                        borderWidth: 1,
                        borderColor: theme.colors.textMuted,
                        backgroundColor: theme.colors.background,
                        padding: theme.spacing.md,
                        color: theme.colors.text,
                        fontSize: theme.font.size.body,
                        lineHeight: 22,
                        textAlignVertical: "top",
                        outlineColor: theme.colors.primary,
                      }}
                    />
                    <View
                      style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.md }}
                    >
                      <View style={{ flex: 1 }}>
                        <PrimaryButton
                          label="Save address"
                          onPress={saveAddress}
                          disabled={!draftAddress.trim()}
                        />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Cancel"
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
                            color: theme.colors.primary,
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
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          fontSize: theme.font.size.caption,
                        }}
                      >
                        Shipping address
                      </Text>
                      <Text
                        style={{
                          color: address ? theme.colors.text : theme.colors.textMuted,
                          fontSize: theme.font.size.body,
                          lineHeight: 22,
                        }}
                      >
                        {address || "None yet. Add one so checkout is quicker."}
                      </Text>
                    </View>
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
                        paddingHorizontal: theme.spacing.lg,
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
                  <InlineNotice tone="success" live>
                    Address saved. Your next order ships here.
                  </InlineNotice>
                ) : null}
              </View>

              <Row
                label={WALLET}
                detail="Default payment method"
                accessibilityLabel={`${WALLET}, default payment method${
                  BILLING_URL ? ". Manage payment methods" : ""
                }`}
                leading={
                  Platform.OS === "android" ? (
                    <View
                      style={{
                        width: 40,
                        height: 28,
                        borderRadius: 6,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme.colors.surfaceAlt,
                      }}
                    >
                      <Ionicons name="card-outline" size={18} color={theme.colors.primary} />
                    </View>
                  ) : (
                    <ProductArt
                      prompt="Apple Pay card icon thumbnail"
                      icon="card-outline"
                      label="Apple Pay"
                      style={{ width: 40, height: 28, borderRadius: 6 }}
                    />
                  )
                }
                onPress={BILLING_URL ? () => Linking.openURL(BILLING_URL) : undefined}
                chevron={Boolean(BILLING_URL)}
                last
              />
            </Card>
          </View>

          {/* Account & support */}
          <View>
            <SectionTitle title="Account & support" flush />
            <Card>
              {support.available ? (
                <Row
                  label="Help & concierge desk"
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
                <Row label="Terms of service" onPress={() => Linking.openURL(appInfo.termsUrl)} />
              ) : null}
              {appInfo.privacyUrl ? (
                <Row label="Privacy policy" onPress={() => Linking.openURL(appInfo.privacyUrl)} />
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
                label="Reset app data"
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
                right={cleared ? <LottieBox name="success" size={32} /> : null}
                onPress={resetData}
                accessibilityLabel={armed ? "Confirm reset app data" : "Reset app data"}
              />
            </Card>
          </View>

          <View style={{ alignItems: "center", gap: theme.spacing.sm }}>
            <Pip pose="pip-delivering" size={88} />
            <Text
              style={{
                color: theme.colors.textMuted,
                fontSize: theme.font.size.caption,
                textAlign: "center",
              }}
            >
              {`${appInfo.name} v${appInfo.version} · Crafted on ${theme.name}`}
            </Text>
          </View>
        </Stagger>
      </ScrollView>
    </>
  );
}
