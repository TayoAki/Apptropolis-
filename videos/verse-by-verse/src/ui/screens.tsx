// The recreated surfaces, in iPhone points (440 x 956). Labels, layout and colours follow
// verse-by-verse/components/index/* and the App Store captures (read-note.png, share-card.png).
// The lock screen, notification and message thread are the phone's system UI, kept generic.
import { colors, SANS, SERIF } from "../brand";
import { AppMark, Flourish, HomeBar, Icon, SCREEN, StatusBar, TabBar } from "./parts";

export const VERSE = {
  ref: "Psalms 46:10",
  text: "“Be still, and know that I am God. I will be exalted among the nations. I will be exalted on the earth.”",
  nextRef: "PSALMS 46:11",
  nextText: "The LORD of Armies is with us. The God of Jacob is our refuge. Selah.",
};

export const REMINDER = {
  title: "Pick up where you left off",
  body: "Your verse is waiting, right where you stopped.",
};

/** Where things are on screen, in points from the top-left of the screen (for the touch actor). */
export const TARGETS = {
  notification: { x: 382, y: 470 },
  share: { x: 391, y: 196 },
  shareCardButton: { x: 330, y: 611 },
};

export function LockScreen() {
  return (
    <div style={{ width: SCREEN.w, height: SCREEN.h, position: "relative", overflow: "hidden", background: "linear-gradient(170deg, #3B2A1C 0%, #1E1510 55%, #120C08 100%)" }}>
      <StatusBar color="#F6EFE4" background="transparent" />
      <div style={{ position: "absolute", top: 92, left: 0, right: 0, textAlign: "center", color: "#F6EFE4" }}>
        <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 21, opacity: 0.9 }}>Sunday, November 15</div>
        <div style={{ fontFamily: SANS, fontWeight: 300, fontSize: 96, lineHeight: 1.05, letterSpacing: -2 }}>8:30</div>
      </div>
      <Notification />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0 }}>
        <HomeBar color="#F6EFE4" background="transparent" />
      </div>
    </div>
  );
}

export function Notification() {
  return (
    <div
      style={{
        position: "absolute",
        top: 402,
        left: 14,
        right: 14,
        height: 88,
        borderRadius: 22,
        background: "rgba(246, 239, 228, 0.86)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        boxSizing: "border-box",
      }}
    >
      <AppMark size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SANS, fontSize: 15 }}>
          <span style={{ fontWeight: 600, color: "#1F1812" }}>{REMINDER.title}</span>
          <span style={{ color: "#6E5D4B", fontSize: 13 }}>now</span>
        </div>
        <div style={{ fontFamily: SANS, fontSize: 15, color: "#2A211A", marginTop: 3, lineHeight: 1.3 }}>{REMINDER.body}</div>
      </div>
    </div>
  );
}

function Pill({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <div
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 16px",
        borderRadius: 999,
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        color: strong ? colors.text : colors.primary,
      }}
    >
      {children}
    </div>
  );
}

function RailItem({ icon, label }: { icon: "bookmark-outline" | "share-outline" | "reader-outline" | "document-text"; label: string }) {
  return (
    <div style={{ height: 66, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
      <Icon name={icon} size={23} color={colors.textMuted} />
      <span style={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 500, color: colors.textMuted, textAlign: "center", lineHeight: 1.15, whiteSpace: "pre-line" }}>{label}</span>
    </div>
  );
}

export function ReadScreen({ sharePressed = 0 }: { sharePressed?: number }) {
  return (
    <div style={{ width: SCREEN.w, height: SCREEN.h, position: "relative", overflow: "hidden", background: colors.background }}>
      <StatusBar color={colors.text} background={colors.background} />
      <div style={{ padding: "6px 16px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <Pill strong>
          <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 21 }}>{VERSE.ref}</span>
          <Icon name="chevron-down" size={16} color={colors.textMuted} />
        </Pill>
        <div style={{ flex: 1 }} />
        <Pill>
          <Icon name="book-outline" size={18} color={colors.primary} />
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15 }}>Chapter</span>
        </Pill>
        <Icon name="settings-outline" size={25} color={colors.text} />
      </div>

      {/* The verse card with its action rail. */}
      <div
        style={{
          margin: "16px 16px 0",
          display: "flex",
          borderRadius: 16,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          overflow: "hidden",
        }}
      >
        <div style={{ flex: 1, padding: "26px 18px 22px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ fontFamily: SERIF, fontSize: 26, lineHeight: 1.42, color: colors.text, textAlign: "center" }}>{VERSE.text}</div>
          <Flourish width={150} />
          <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 16, color: colors.textMuted }}>World English Bible</div>
        </div>
        <div style={{ width: 70, borderLeft: `1px solid ${colors.border}`, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
          <RailItem icon="bookmark-outline" label="Save" />
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", inset: "4px 6px", borderRadius: 12, background: colors.surfaceAlt, opacity: sharePressed }} />
            <div style={{ position: "relative" }}>
              <RailItem icon="share-outline" label="Share" />
            </div>
          </div>
          <RailItem icon="reader-outline" label={"Full\ncontext"} />
          <RailItem icon="document-text" label={"Study\nnote"} />
        </div>
      </div>

      <div style={{ margin: "16px 16px 0", display: "flex", justifyContent: "space-between" }}>
        <Pill>
          <Icon name="chevron-back" size={17} color={colors.primary} />
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15 }}>Verse 9</span>
        </Pill>
        <Pill>
          <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 15 }}>Next · Verse 11</span>
          <Icon name="chevron-forward" size={17} color={colors.primary} />
        </Pill>
      </div>

      <div style={{ margin: "26px 16px 10px", fontFamily: SERIF, fontWeight: 700, fontSize: 22, color: colors.text }}>Continue in Psalms 46</div>
      <div style={{ margin: "0 16px", padding: 18, borderRadius: 16, background: colors.surface, border: `1px solid ${colors.border}` }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 13, letterSpacing: 1.2, color: colors.primary }}>{VERSE.nextRef}</div>
        <div style={{ fontFamily: SERIF, fontSize: 20, lineHeight: 1.45, color: colors.text, marginTop: 6 }}>{VERSE.nextText}</div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <TabBar active="read" />
        <HomeBar color={colors.text} background={colors.surface} />
      </div>
    </div>
  );
}

/** The share card itself (the image the app shares), at its on-screen size: 408 x ~300 pt. */
export function ShareCard() {
  return (
    <div style={{ width: 408, padding: 24, boxSizing: "border-box", borderRadius: 22, background: colors.surface, border: `1px solid ${colors.border}` }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 14, letterSpacing: 1.6, color: colors.primary }}>PSALMS 46:10</div>
      <div style={{ display: "flex", alignItems: "center", margin: "12px 0 14px" }}>
        <div style={{ width: 54, height: 1.5, background: colors.primary }} />
        <div style={{ width: 7, height: 7, borderRadius: 4, background: colors.primary, marginLeft: 6 }} />
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 22, lineHeight: 1.55, color: colors.text }}>{VERSE.text}</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontFamily: SANS, fontSize: 14, color: colors.textMuted }}>
        <span>Verse by Verse</span>
        <span>World English Bible</span>
      </div>
    </div>
  );
}

/** The share sheet: the card, "Share card" and "Done". `buttonPressed` 0..1 darkens the button. */
export function ShareSheet({ buttonPressed = 0, hideCard = false }: { buttonPressed?: number; hideCard?: boolean }) {
  return (
    <div style={{ width: SCREEN.w, height: SCREEN.h, position: "relative", background: colors.background }}>
      <StatusBar color={colors.text} background={colors.background} />
      <div style={{ position: "absolute", top: 248, left: 16, opacity: hideCard ? 0 : 1 }}>
        <ShareCard />
      </div>
      <div
        style={{
          position: "absolute",
          top: 584,
          left: 16,
          right: 16,
          height: 54,
          borderRadius: 999,
          background: buttonPressed > 0 ? "#6E4520" : colors.primary,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          color: colors.onPrimary,
        }}
      >
        <Icon name="share-outline" size={20} color={colors.onPrimary} />
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: 18 }}>Share card</span>
      </div>
      <div style={{ position: "absolute", top: 662, left: 0, right: 0, textAlign: "center", fontFamily: SANS, fontWeight: 700, fontSize: 17, color: colors.primary }}>Done</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <TabBar active="read" />
        <HomeBar color={colors.text} background={colors.surface} />
      </div>
    </div>
  );
}

/** A message thread (generic system UI) with the card as a sent image. */
export function Thread({ delivered }: { delivered: number }) {
  return (
    <div style={{ width: SCREEN.w, height: SCREEN.h, position: "relative", background: "#FFFFFF" }}>
      <StatusBar color="#111" background="#F7F7F7" />
      <div style={{ height: 92, background: "#F7F7F7", borderBottom: "1px solid #E2E2E2", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
        <div style={{ position: "absolute", left: 14, top: 20 }}>
          <Icon name="chevron-back" size={30} color="#3A7BD5" />
        </div>
        <div style={{ width: 46, height: 46, borderRadius: 23, background: "linear-gradient(180deg,#A9ADB4,#878B92)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SANS, fontWeight: 600, fontSize: 21 }}>M</div>
        <div style={{ fontFamily: SANS, fontSize: 13, color: "#111", marginTop: 4 }}>Mom</div>
      </div>
      <div style={{ position: "absolute", top: 166, left: 0, right: 0, textAlign: "center", fontFamily: SANS, fontSize: 12, color: "#8A8A8E" }}>Today 8:29 PM</div>
      <div
        style={{
          position: "absolute",
          top: 192,
          left: 14,
          maxWidth: 270,
          padding: "10px 14px",
          borderRadius: 20,
          background: "#E9E9EB",
          fontFamily: SANS,
          fontSize: 17,
          lineHeight: 1.3,
          color: "#111",
        }}
      >
        Long day. My mind won't stop racing.
      </div>
      {/* The sent card occupies a 264 x 194 pt slot at the right (the film flies the card into it). */}
      <div style={{ position: "absolute", top: 482, right: 18, fontFamily: SANS, fontSize: 12, color: "#8A8A8E", opacity: delivered }}>Delivered</div>
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 46, height: 40, borderRadius: 20, border: "1px solid #D6D6D8", display: "flex", alignItems: "center", padding: "0 16px", fontFamily: SANS, fontSize: 16, color: "#B0B0B4" }}>Message</div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <HomeBar color="#111" background="#FFFFFF" />
      </div>
    </div>
  );
}

/** Where the card sits once sent: top-left and scale, in screen points. */
export const SENT_SLOT = { x: 440 - 18 - 408 * 0.62, y: 282, scale: 0.62 };
export const SHEET_CARD = { x: 16, y: 248, scale: 1 };
