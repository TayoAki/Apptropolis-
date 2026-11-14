import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line } from "react-native-svg";
import { EmptyState } from "../../components/EmptyState";
import { Lottie } from "../../components/lottie";
import {
  Appear,
  CountUp,
  PressScale,
  Skeleton,
  SkeletonList,
  haptic,
  useReducedMotion,
} from "../../components/motion";
import { PrimaryButton } from "../../components/PrimaryButton";
import { useShareImage } from "../../components/share";
import { SavedRow } from "../../components/saved/SavedRow";
import { usePurchases } from "../../data/purchases";
import { useCollection } from "../../data/repo";
import {
  DAY_MS,
  READING_POSITION,
  formatDay,
  formatReference,
  readingPosition,
  savedBookmarks,
  type Bookmark,
} from "../../data/schema";
import { useTheme } from "../../theme/ThemeProvider";

const ALL = "__all__";

/** The field's border shows focus, so the browser's own ring is turned off on the web. */
const WEB_NO_FOCUS_RING = Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : null;

// Folders the reader can file verses into. Shown even before anything is filed in them.
const SUGGESTED_FOLDERS = ["Comfort", "Morning light", "Promises", "Wisdom"];

type SheetState = { title: string; ids: string[]; name: string; token: number };

/** "Saved today", "Saved 2 days ago", "Saved Mar 4". */
function savedAgo(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / DAY_MS);
  if (days <= 0) return "Saved today";
  if (days === 1) return "Saved yesterday";
  if (days < 7) return `Saved ${days} days ago`;
  return `Saved ${formatDay(iso)}`;
}

function FilterPill({
  label,
  count,
  showCount,
  active,
  locked,
  onPress,
  onLayout,
}: {
  label: string;
  count: number;
  showCount: boolean;
  active: boolean;
  locked: boolean;
  onPress: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const theme = useTheme();
  const ink = active ? theme.colors.onPrimary : theme.colors.text;
  return (
    <Pressable
      onLayout={onLayout}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4 }}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${count} ${count === 1 ? "verse" : "verses"}`}
      accessibilityHint={locked ? "Folders are a premium feature" : undefined}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        minHeight: 40,
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.xs + 2,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.radius.pill,
        borderWidth: 1,
        borderColor: active ? theme.colors.primary : theme.colors.border,
        backgroundColor: active ? undefined : theme.colors.surface,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {locked ? <Ionicons name="lock-closed" size={13} color={theme.colors.textMuted} /> : null}
      <Text
        style={{
          color: ink,
          fontSize: theme.font.size.body,
          fontWeight: active ? theme.font.weight.bold : theme.font.weight.medium,
          fontVariant: ["tabular-nums"],
        }}
      >
        {showCount ? `${label} (${count})` : label}
      </Text>
    </Pressable>
  );
}

/** Bottom sheet to name a folder and choose the verses to move into it. Rises in when it opens. */
function FolderSheet({
  title,
  saved,
  folders,
  initialIds,
  initialName,
  onSave,
  onClose,
}: {
  title: string;
  saved: Bookmark[];
  folders: string[];
  initialIds: string[];
  initialName: string;
  onSave: (name: string, ids: string[]) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const rise = useRef(new Animated.Value(reduced ? 0 : 1)).current;
  const [name, setName] = useState(initialName);
  const [picked, setPicked] = useState<string[]>(initialIds);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (reduced) {
      rise.setValue(0);
      return;
    }
    Animated.spring(rise, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 4 }).start();
  }, [reduced, rise]);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && picked.length > 0;

  function toggle(id: string) {
    haptic("selection");
    setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: "flex-end",
      }}
    >
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close folder sheet"
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
      >
        <View style={{ flex: 1, backgroundColor: theme.colors.background, opacity: 0.6 }} />
      </Pressable>
      <Animated.View
        style={{
          transform: [
            { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, 600] }) },
          ],
          gap: theme.spacing.md,
          paddingTop: theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.lg,
          borderTopLeftRadius: theme.radius.lg,
          borderTopRightRadius: theme.radius.lg,
          // The sheet ends at the tab bar, which already covers the home indicator's inset.
          borderTopWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          maxHeight: "86%",
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text
            accessibilityRole="header"
            style={{
              color: theme.colors.text,
              fontFamily: theme.font.family,
              fontSize: theme.font.size.title,
              fontWeight: theme.font.weight.bold,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              fontSize: theme.font.size.caption,
              fontVariant: ["tabular-nums"],
            }}
          >
            {picked.length} selected
          </Text>
        </View>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Folder name, e.g. Hard days"
          placeholderTextColor={theme.colors.textMuted}
          accessibilityLabel="Folder name"
          maxLength={40}
          returnKeyType="done"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            minHeight: 48,
            // The border thickens with focus (the padding gives the pixel back), and the web's
            // default focus ring is turned off in its favor.
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? theme.colors.primary : theme.colors.textMuted,
            ...WEB_NO_FOCUS_RING,
            borderRadius: theme.radius.sm,
            paddingHorizontal: theme.spacing.lg - (focused ? 1 : 0),
            paddingVertical: theme.spacing.md - (focused ? 1 : 0),
            fontSize: theme.font.size.body,
            color: theme.colors.text,
            backgroundColor: theme.colors.background,
          }}
        />

        {folders.length > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
            {folders.map((folder) => (
              <Pressable
                key={folder}
                onPress={() => {
                  haptic("selection");
                  setName(folder);
                }}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Use folder ${folder}`}
                style={({ pressed }) => ({
                  minHeight: 36,
                  justifyContent: "center",
                  paddingHorizontal: theme.spacing.lg,
                  borderRadius: theme.radius.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceAlt,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: theme.colors.text, fontSize: theme.font.size.caption }}>
                  {folder}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <ScrollView style={{ maxHeight: 280 }} contentContainerStyle={{ gap: theme.spacing.xs }}>
          {saved.map((b) => {
            const checked = picked.includes(b.id);
            return (
              <Pressable
                key={b.id}
                onPress={() => toggle(b.id)}
                hitSlop={6}
                accessibilityRole="checkbox"
                accessibilityLabel={formatReference(b)}
                accessibilityState={{ checked }}
                style={({ pressed }) => ({
                  minHeight: 48,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.md,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Ionicons
                  name={checked ? "checkmark-circle" : "ellipse-outline"}
                  size={24}
                  color={checked ? theme.colors.primary : theme.colors.textMuted}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: theme.colors.text,
                      fontSize: theme.font.size.body,
                      fontWeight: theme.font.weight.medium,
                    }}
                  >
                    {formatReference(b)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}
                  >
                    {b.text}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <PrimaryButton
          label={canSave ? `Save to ${trimmed}` : "Name the folder and pick verses"}
          onPress={() => onSave(trimmed, picked)}
          disabled={!canSave}
        />
        <PrimaryButton label="Cancel" variant="quiet" onPress={onClose} />
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

export default function SavedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { items, loading, add, update, remove } = useCollection<Bookmark>("bookmarks");
  const { isPremium, openPaywall } = usePurchases();
  const { ref, share, sharing } = useShareImage();

  const [filter, setFilter] = useState(ALL);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<Bookmark | null>(null);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [layoutTick, setLayoutTick] = useState(0);

  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const layouts = useRef<Record<string, { x: number; width: number }>>({});
  const glideReady = useRef(false);
  const glideX = useRef(new Animated.Value(0)).current;
  const glideW = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  const saved = useMemo(
    () => savedBookmarks(items).filter((b) => !removedIds.includes(b.id)),
    [items, removedIds],
  );
  // Suggested folders first, then any folder already holding verses.
  const folders = useMemo(() => {
    const inUse = saved.map((b) => b.folder).filter(Boolean);
    return Array.from(new Set([...SUGGESTED_FOLDERS, ...inUse]));
  }, [saved]);
  const chips = [ALL, ...folders];
  const activeFilter = chips.includes(filter) ? filter : ALL;
  const visible = activeFilter === ALL ? saved : saved.filter((b) => b.folder === activeFilter);
  const countFor = (key: string) =>
    key === ALL ? saved.length : saved.filter((b) => b.folder === key).length;
  // The card preview covers the list completely, so nothing shows through behind its buttons.
  const backdrop = cardFade;

  // The highlight behind the active pill glides to it with a spring.
  useEffect(() => {
    const target = layouts.current[activeFilter];
    if (!target) return;
    if (!glideReady.current || reduced) {
      glideReady.current = true;
      glideX.setValue(target.x);
      glideW.setValue(target.width);
    } else {
      Animated.parallel([
        Animated.spring(glideX, {
          toValue: target.x,
          useNativeDriver: false,
          speed: 14,
          bounciness: 6,
        }),
        Animated.spring(glideW, {
          toValue: target.width,
          useNativeDriver: false,
          speed: 14,
          bounciness: 6,
        }),
      ]).start();
    }
    scrollRef.current?.scrollTo({
      x: Math.max(0, target.x - theme.spacing.lg),
      animated: !reduced,
    });
  }, [activeFilter, layoutTick, glideX, glideW, reduced, theme.spacing.lg]);

  // The card preview scales up from a little smaller when it opens.
  useEffect(() => {
    if (!preview) return;
    if (reduced) {
      cardScale.setValue(1);
      cardFade.setValue(1);
      return;
    }
    cardScale.setValue(0.9);
    cardFade.setValue(0);
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 6 }),
      Animated.timing(cardFade, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [preview, reduced, cardScale, cardFade]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2800);
    return () => clearTimeout(id);
  }, [notice]);

  function recordLayout(key: string, event: LayoutChangeEvent) {
    const { x, width } = event.nativeEvent.layout;
    const previous = layouts.current[key];
    if (previous && previous.x === x && previous.width === width) return;
    layouts.current[key] = { x, width };
    setLayoutTick((n) => n + 1);
  }

  function choose(key: string) {
    if (key !== ALL && !isPremium) {
      openPaywall();
      return;
    }
    haptic("selection");
    setFilter(key);
  }

  function openFolder(title: string, ids: string[], name: string) {
    setSheet({ title, ids, name, token: Date.now() });
  }

  /** Open a saved verse on the Read tab, and make it the place the reader resumes from. */
  async function openInReader(b: Bookmark) {
    const place = { book: b.book, chapter: b.chapter, verse: b.verse, text: b.text };
    try {
      const position = readingPosition(items);
      if (position) await update(position.id, place);
      else await add({ ...place, folder: READING_POSITION, createdAt: new Date().toISOString() });
    } catch {
      // The verse still opens; only the resume point is left where it was.
    }
    router.navigate({
      pathname: "/",
      params: {
        book: b.book,
        chapter: String(b.chapter),
        verse: String(b.verse),
        at: String(Date.now()),
      },
    });
  }

  function removeBookmark(id: string) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRemovedIds((ids) => [...ids, id]);
    void remove(id);
  }

  async function saveToFolder(name: string, ids: string[]) {
    const label = name.trim();
    if (!label) return;
    const picked = new Set(ids);
    // Only the ticked verses move. Verses already in the folder stay there: the sheet doesn't
    // show which ones those are, so leaving them unticked must not take them out.
    const changes = saved.filter((b) => picked.has(b.id) && b.folder !== label);
    // One at a time: each save rewrites the stored list, so they must not overlap.
    for (const b of changes) {
      await update(b.id, { folder: label });
    }
    haptic("success");
    setFilter(label);
    setNotice(
      changes.length === 0
        ? `${label} already has these verses`
        : `Moved ${changes.length} ${changes.length === 1 ? "verse" : "verses"} to ${label}`,
    );
  }

  async function shareCard() {
    if (!preview) return;
    const reference = formatReference(preview);
    const done = await share({
      message: `${reference}\n\n\u201C${preview.text}\u201D\n\nWorld English Bible`,
      title: reference,
    });
    if (done) setPreview(null);
  }

  const header = (
    <View style={{ paddingTop: insets.top + theme.spacing.md, gap: theme.spacing.md }}>
      <Appear>
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.md,
              minHeight: 44,
            }}
          >
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{
                flex: 1,
                color: theme.colors.text,
                fontFamily: theme.font.family,
                fontSize: theme.font.size.headline,
                fontWeight: theme.font.weight.bold,
              }}
            >
              Saved verses
            </Text>
            <PressScale
              onPress={() => (isPremium ? openFolder("New folder", [], "") : openPaywall())}
              accessibilityRole="button"
              accessibilityLabel="New folder"
              accessibilityHint={isPremium ? undefined : "Folders are a premium feature"}
              scaleTo={0.96}
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs,
              }}
            >
              <Ionicons name="add" size={22} color={theme.colors.primary} />
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.body,
                  fontWeight: theme.font.weight.medium,
                }}
              >
                New folder
              </Text>
            </PressScale>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.md,
              minHeight: 32,
            }}
          >
            {loading ? (
              <Skeleton width={120} height={14} />
            ) : (
              <CountUp
                value={saved.length}
                format={(n) => {
                  const whole = Math.round(n);
                  return whole === 1 ? "1 verse saved" : `${whole} verses saved`;
                }}
                style={{
                  color: theme.colors.textMuted,
                  fontSize: theme.font.size.body,
                  fontVariant: ["tabular-nums"],
                }}
              />
            )}
            <Pressable
              onPress={() => openPaywall()}
              // 44pt tall with the slop; it reaches down into the gap below, not up into
              // the New folder button.
              hitSlop={{ bottom: 12, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel={
                isPremium ? "Patron key, see your plan" : "Patron key, unlock premium"
              }
              style={({ pressed }) => ({
                minHeight: 32,
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs + 2,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons name="key-outline" size={16} color={theme.colors.primary} />
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.medium,
                }}
              >
                Patron key
              </Text>
            </Pressable>
          </View>
        </View>
      </Appear>

      {loading ? null : (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.xs,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: glideX,
                width: glideW,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.primary,
              }}
            />
            {chips.map((key) => (
              <FilterPill
                key={key}
                label={key === ALL ? "All" : key}
                count={countFor(key)}
                showCount={key === ALL}
                active={activeFilter === key}
                locked={key !== ALL && !isPremium}
                onPress={() => choose(key)}
                onLayout={(event) => recordLayout(key, event)}
              />
            ))}
          </View>
        </ScrollView>
      )}

      {notice ? (
        <Appear key={notice}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.md,
              marginHorizontal: theme.spacing.lg,
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.surfaceAlt,
            }}
          >
            {/* A fixed box, so the message keeps its width while the animation loads. */}
            <View style={{ width: 40, height: 40, overflow: "hidden" }}>
              <Lottie name="success" size={40} />
            </View>
            <Text
              accessibilityLiveRegion="polite"
              style={{ flex: 1, color: theme.colors.text, fontSize: theme.font.size.caption }}
            >
              {notice}
            </Text>
          </View>
        </Appear>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {header}
        <View style={{ paddingHorizontal: theme.spacing.lg }}>
          <SkeletonList rows={4} />
        </View>
      </View>
    );
  }

  const emptyState =
    saved.length === 0 ? (
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <EmptyState
          icon="bookmark-outline"
          title="No saved verses yet"
          body="Tap the bookmark on any verse in the reader. It lands here, newest first, so you can open it again in one tap."
          actionLabel="Open the reader"
          onAction={() => router.navigate("/")}
        />
      </View>
    ) : (
      <View style={{ paddingHorizontal: theme.spacing.lg }}>
        <EmptyState
          icon="folder-open-outline"
          title={`Nothing in ${activeFilter} yet`}
          body="Use the bookmark button on a saved verse to file it in this folder, or show every saved verse."
          actionLabel="Show all verses"
          onAction={() => choose(ALL)}
        />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        extraData={isPremium}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyState}
        renderItem={({ item, index }) => (
          <Appear delay={Math.min(index, 8) * 50} style={{ paddingHorizontal: theme.spacing.lg }}>
            <SavedRow
              bookmark={item}
              savedLabel={`${savedAgo(item.createdAt)}${item.folder ? ` · ${item.folder}` : ""}`}
              onOpen={() => void openInReader(item)}
              onShare={() => setPreview(item)}
              onFolder={() =>
                isPremium ? openFolder("Move to folder", [item.id], item.folder) : openPaywall()
              }
              onRemove={() => removeBookmark(item.id)}
            />
          </Appear>
        )}
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingBottom: theme.spacing.xl * 2,
        }}
        showsVerticalScrollIndicator={false}
      />

      {preview ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            justifyContent: "center",
            padding: theme.spacing.lg,
          }}
        >
          <Pressable
            onPress={() => setPreview(null)}
            accessibilityRole="button"
            accessibilityLabel="Close card preview"
            style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
          >
            <Animated.View
              style={{ flex: 1, backgroundColor: theme.colors.background, opacity: backdrop }}
            />
          </Pressable>

          <Animated.View
            style={{
              gap: theme.spacing.lg,
              opacity: cardFade,
              transform: [{ scale: cardScale }],
            }}
          >
            <View
              ref={ref}
              collapsable={false}
              style={{
                gap: theme.spacing.lg,
                padding: theme.spacing.xl,
                borderRadius: theme.radius.lg,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              }}
            >
              <Text
                style={{
                  color: theme.colors.primary,
                  fontSize: theme.font.size.caption,
                  fontWeight: theme.font.weight.bold,
                  letterSpacing: 0.8,
                }}
              >
                {formatReference(preview).toUpperCase()}
              </Text>
              <Svg width={72} height={8}>
                <Line x1={0} y1={4} x2={56} y2={4} stroke={theme.colors.accent} strokeWidth={1.5} />
                <Circle cx={64} cy={4} r={3.5} fill={theme.colors.primary} />
              </Svg>
              <Text
                style={{
                  color: theme.colors.text,
                  fontFamily: theme.font.family,
                  fontSize: theme.font.size.title,
                  lineHeight: theme.font.size.title * 1.5,
                }}
              >
                {`\u201C${preview.text}\u201D`}
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                  Verse by Verse
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: theme.font.size.caption }}>
                  World English Bible
                </Text>
              </View>
            </View>

            <PrimaryButton
              label={sharing ? "Preparing card" : "Share card"}
              icon="share-outline"
              onPress={shareCard}
              disabled={sharing}
              accessibilityHint="Shares this verse as an image"
            />
            <PrimaryButton label="Done" variant="quiet" onPress={() => setPreview(null)} />
          </Animated.View>
        </View>
      ) : null}

      {sheet ? (
        <FolderSheet
          key={sheet.token}
          title={sheet.title}
          saved={saved}
          folders={folders}
          initialIds={sheet.ids}
          initialName={sheet.name}
          onClose={() => setSheet(null)}
          onSave={(name, ids) => {
            setSheet(null);
            void saveToFolder(name, ids);
          }}
        />
      ) : null}
    </View>
  );
}
