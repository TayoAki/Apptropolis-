// Small shared pieces of the recreated surfaces. Everything is laid out in iPhone points on a
// 440 x 956 screen; the phone is scaled as a whole by the camera.
import type { CSSProperties, ReactNode } from "react";
import glyphs from "../ionicons.json";
import { colors, ICONS, SANS } from "../brand";

export const SCREEN = { w: 440, h: 956, status: 54, home: 34 };

/** An Ionicons glyph, the same icon font the app uses. */
export function Icon({ name, size, color }: { name: keyof typeof glyphs; size: number; color: string }) {
  return (
    <span style={{ fontFamily: ICONS, fontSize: size, lineHeight: 1, color, display: "inline-block" }}>
      {String.fromCodePoint(glyphs[name])}
    </span>
  );
}

/** The app's ornament: two rules with a small scroll each side of a dot (components/Flourish.tsx). */
export function Flourish({ width, color = colors.primary }: { width: number; color?: string }) {
  return (
    <svg width={width} height={(width * 24) / 200} viewBox="0 0 200 24" style={{ display: "block" }}>
      <line x1={4} y1={12} x2={60} y2={12} stroke={color} strokeWidth={1} strokeOpacity={0.5} />
      <line x1={140} y1={12} x2={196} y2={12} stroke={color} strokeWidth={1} strokeOpacity={0.5} />
      <path d="M80 12 C74 4 64 6 68 12 C72 18 80 15 81 12" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <path d="M120 12 C126 4 136 6 132 12 C128 18 120 15 119 12" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={100} cy={12} r={3} fill={color} />
    </svg>
  );
}

/** The app's mark until it has an icon: the Flourish's dot and scrolls on parchment. */
export function AppMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.23,
        background: colors.background,
        border: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <svg width={size * 0.78} height={size * 0.3} viewBox="60 2 80 20">
        <path d="M80 12 C74 4 64 6 68 12 C72 18 80 15 81 12" fill="none" stroke={colors.primary} strokeWidth={2.4} strokeLinecap="round" />
        <path d="M120 12 C126 4 136 6 132 12 C128 18 120 15 119 12" fill="none" stroke={colors.primary} strokeWidth={2.4} strokeLinecap="round" />
        <circle cx={100} cy={12} r={4.2} fill={colors.primary} />
      </svg>
    </div>
  );
}

/** The phone's status bar, drawn in points. */
export function StatusBar({ time = "8:30", color, background }: { time?: string; color: string; background: string }) {
  return (
    <div
      style={{
        height: SCREEN.status,
        background,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 34px 0 44px",
        boxSizing: "border-box",
        color,
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 17,
      }}
    >
      <span>{time}</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <svg width={18} height={12} viewBox="0 0 18 12">
          <g fill="currentColor">
            <rect x="0" y="8" width="3" height="4" rx="1" />
            <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
            <rect x="10" y="3" width="3" height="9" rx="1" />
            <rect x="15" y="0" width="3" height="12" rx="1" />
          </g>
        </svg>
        <svg width={16} height={12} viewBox="0 0 16 12">
          <path fill="currentColor" d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3C13.5 1.5 10.9.4 8 .4S2.5 1.5.5 3.4l1.2 1.3C3.4 3.1 5.6 2.2 8 2.2zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3C11.6 4.7 9.9 4 8 4s-3.6.7-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zm0 3.6c.6 0 1.1.2 1.5.6L8 11.6 6.5 10c.4-.4.9-.6 1.5-.6z" />
        </svg>
        <svg width={27} height={13} viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4" />
          <rect x="2" y="2" width="16" height="9" rx="2" fill="currentColor" />
          <path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2z" fill="currentColor" opacity=".45" />
        </svg>
      </span>
    </div>
  );
}

export function HomeBar({ color, background }: { color: string; background: string }) {
  return (
    <div style={{ height: SCREEN.home, background, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 139, height: 5, borderRadius: 3, background: color }} />
    </div>
  );
}

/** The app's tab bar: Read, Search, Saved. */
export function TabBar({ active }: { active: "read" | "search" | "saved" }) {
  const tab = (key: typeof active, label: string, on: keyof typeof glyphs, off: keyof typeof glyphs) => {
    const selected = key === active;
    const color = selected ? colors.primary : colors.textMuted;
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, paddingTop: 7 }}>
        <Icon name={selected ? on : off} size={24} color={color} />
        <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: selected ? 600 : 500, color }}>{label}</span>
      </div>
    );
  };
  return (
    <div style={{ height: 60, display: "flex", background: colors.surface, borderTop: `1px solid ${colors.border}` }}>
      {tab("read", "Read", "book", "book-outline")}
      {tab("search", "Search", "search-outline", "search-outline")}
      {tab("saved", "Saved", "bookmark", "bookmark-outline")}
    </div>
  );
}

export function Fill({ children, style }: { children?: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: "absolute", inset: 0, ...style }}>{children}</div>;
}
