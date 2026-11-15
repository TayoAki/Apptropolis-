// Shared pieces of the recreated Five Dinners screens, in iPhone points on a 440 x 956 screen.
import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import glyphs from "../ionicons.json";
import { colors, ICONS, SANS } from "../brand";

export const SCREEN = { w: 440, h: 956, status: 54, home: 34, tab: 60 };
/** Top of the tab bar, in screen points. */
export const TAB_TOP = SCREEN.h - SCREEN.home - SCREEN.tab;

export function Icon({ name, size, color, style }: { name: keyof typeof glyphs; size: number; color: string; style?: CSSProperties }) {
  return (
    <span style={{ fontFamily: ICONS, fontSize: size, lineHeight: 1, color, display: "inline-block", ...style }}>
      {String.fromCodePoint(glyphs[name])}
    </span>
  );
}

export function Photo({ id, w, h, radius = 6, style }: { id: string; w: number; h: number; radius?: number; style?: CSSProperties }) {
  return (
    <Img
      src={staticFile(`recipes/${id}.jpg`)}
      style={{ width: w, height: h, objectFit: "cover", borderRadius: radius, display: "block", ...style }}
    />
  );
}

export function StatusBar({ color = colors.text, background = colors.background }: { color?: string; background?: string }) {
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
      <span>5:42</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <svg width={18} height={12} viewBox="0 0 18 12"><g fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5.5" width="3" height="6.5" rx="1" /><rect x="10" y="3" width="3" height="9" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></g></svg>
        <svg width={16} height={12} viewBox="0 0 16 12"><path fill="currentColor" d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3C13.5 1.5 10.9.4 8 .4S2.5 1.5.5 3.4l1.2 1.3C3.4 3.1 5.6 2.2 8 2.2zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3C11.6 4.7 9.9 4 8 4s-3.6.7-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zm0 3.6c.6 0 1.1.2 1.5.6L8 11.6 6.5 10c.4-.4.9-.6 1.5-.6z" /></svg>
        <svg width={27} height={13} viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="16" height="9" rx="2" fill="currentColor" /><path d="M25 4.5v4c.8-.3 1.5-1.1 1.5-2s-.7-1.7-1.5-2z" fill="currentColor" opacity=".45" /></svg>
      </span>
    </div>
  );
}

/** The app's tab bar: Week, Shop, Cook, with the home indicator under it. */
export function TabBar({ active }: { active: "week" | "shop" | "cook" }) {
  const tab = (key: typeof active, label: string, on: keyof typeof glyphs, off: keyof typeof glyphs) => {
    const selected = key === active;
    const color = selected ? colors.primary : colors.textMuted;
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, paddingTop: 7 }}>
        <Icon name={selected ? on : off} size={25} color={color} />
        <span style={{ fontFamily: SANS, fontSize: 12, fontWeight: selected ? 600 : 500, color }}>{label}</span>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: TAB_TOP, background: colors.surface, borderTop: `1px solid ${colors.border}` }}>
      <div style={{ height: SCREEN.tab, display: "flex" }}>
        {tab("week", "Week", "calendar", "calendar-outline")}
        {tab("shop", "Shop", "cart", "cart-outline")}
        {tab("cook", "Cook", "flame", "flame-outline")}
      </div>
      <div style={{ height: SCREEN.home, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 139, height: 5, borderRadius: 3, background: colors.text }} />
      </div>
    </div>
  );
}

/** Where each tab sits, for the touch actor. */
export const TABS = { week: { x: 73, y: TAB_TOP + 26 }, shop: { x: 220, y: TAB_TOP + 26 }, cook: { x: 367, y: TAB_TOP + 26 } };

export function Abs({ x, y, w, h, children, style }: { x: number; y: number; w?: number; h?: number; children?: ReactNode; style?: CSSProperties }) {
  return <div style={{ position: "absolute", left: x, top: y, width: w, height: h, ...style }}>{children}</div>;
}

/** The app's Meter: a track in a 20% tint of the muted text colour, filled in primary. */
export function Bar({ pct, w, h = 8, color = colors.primary }: { pct: number; w: number; h?: number; color?: string }) {
  return (
    <div style={{ width: w, height: h, borderRadius: h / 2, background: "rgba(103,89,70,0.2)" }}>
      <div style={{ width: w * Math.max(0, Math.min(1, pct)), height: h, borderRadius: h / 2, background: color }} />
    </div>
  );
}

export function money(n: number): string {
  return `$${n.toFixed(2)}`;
}
