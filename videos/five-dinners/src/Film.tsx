// "Five dinners. One list. Leftovers first." A Product Film for Five Dinners. Every frame is a
// pure function of the frame number: the camera, the touch, the screens and the type all read the
// time from useCurrentFrame() and the timing map in script.ts.
import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import "./fonts";
import { arc, easeIn, easeInOut, easeOut, mix, prog } from "./anim";
import { colors, DISPLAY, SANS } from "./brand";
import { T } from "./script";
import { Photo, SCREEN, TABS } from "./ui/parts";
import { CookScreen, MARK_COOKED, SHOP_TARGETS, ShopScreen, WeekScreen } from "./ui/screens";

export type Layout = "vertical" | "landscape";
type Pt = { x: number; y: number };

const RIM = 14; // phone rim in points
const RADIUS = 62;

/** In the vertical cut the phone plays in a window below the type band, with a soft top edge. */
const WINDOW_TOP = 500;

/**
 * The camera: a screen point `f` (in points) shown at canvas point `a` (px), at `k` px per point.
 * One keyframe per beat; it eases between them and holds in between.
 */
type Cam = { f: Pt; a: Pt; k: number };

function shots(layout: Layout) {
  const v = layout === "vertical";
  const a = v ? { x: 540, y: 1018 } : { x: 1400, y: 540 };
  const at = (fy: number, k: number): Cam => ({ f: { x: 220, y: fy }, a, k });
  return v
    ? {
        week: at(309, 2.0), // header, basket, the first dinners
        weekDrift: at(309, 2.05),
        low: at(657, 2.0), // the tab bar, above the platform's caption area
        shop: at(388, 2.0), // estimate, paid so far, the first produce rows
        cook: at(400, 2.0), // the week's circles and Monday's card
        cookPush: at(480, 2.2), // what's left of each pack
        week2: at(514, 2.0), // carried over, and the dinners that use it
        week2Drift: at(522, 2.05),
      }
    : {
        week: at(420, 1.5),
        weekDrift: at(420, 1.53),
        low: at(640, 1.5),
        shop: at(400, 1.6),
        cook: at(410, 1.6),
        cookPush: at(470, 1.75),
        week2: at(520, 1.6),
        week2Drift: at(526, 1.64),
      };
}

function camera(layout: Layout, t: number): Cam {
  const s = shots(layout);
  const steps: Array<[Cam, number, number]> = [
    [s.weekDrift, T.drift[0], T.drift[1]],
    [s.low, T.camLow1[0], T.camLow1[1]],
    [s.shop, T.camShop[0], T.camShop[1]],
    [s.low, T.camLow2[0], T.camLow2[1]],
    [s.cook, T.camCook[0], T.camCook[1]],
    [s.cookPush, T.camPush[0], T.camPush[1]],
    [s.week2, T.toWeek2[0], T.toWeek2[1] + 0.1],
    [s.week2Drift, T.drift2[0], T.drift2[1]],
  ];
  let c = s.week;
  for (const [next, t0, t1] of steps) {
    const p = prog(t, t0, t1, t0 === T.drift[0] || t0 === T.drift2[0] ? (x: number) => x : easeInOut);
    c = {
      f: { x: mix(c.f.x, next.f.x, p), y: mix(c.f.y, next.f.y, p) },
      a: { x: mix(c.a.x, next.a.x, p), y: mix(c.a.y, next.a.y, p) },
      k: mix(c.k, next.k, p),
    };
  }
  return c;
}

export function Film({ layout }: { layout: Layout }) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const v = layout === "vertical";
  const cam = camera(layout, t);
  const k = cam.k;
  const windowTop = v ? WINDOW_TOP : 0;

  // The phone leaves at the close.
  const out = prog(t, T.out[0], T.out[1], easeIn);
  const outY = out * 220;

  // The phone's outer top-left in canvas pixels, so that the focus point lands on the anchor.
  const phoneLeft = cam.a.x - (cam.f.x + RIM) * k;
  const phoneTop = cam.a.y - (cam.f.y + RIM) * k + outY;

  /** A point on the screen (in points) → canvas pixels, under the camera. */
  const toCanvas = (p: Pt) => ({ x: cam.a.x + (p.x - cam.f.x) * k, y: cam.a.y + (p.y - cam.f.y) * k + outY });

  // Screen states.
  const toShop = prog(t, T.toShop[0], T.toShop[1], easeOut);
  const toCook = prog(t, T.toCook[0], T.toCook[1], easeOut);
  const toWeek2 = prog(t, T.toWeek2[0], T.toWeek2[1], easeInOut);
  const onions = prog(t, T.tickOnions[0], T.tickOnions[1], easeOut);
  const spinach = prog(t, T.tickSpinach[0], T.tickSpinach[1], easeOut);
  const cooked = prog(t, T.cooked[0], T.cooked[1], easeInOut);
  const bars = prog(t, T.bars[0], T.bars[1], easeOut);
  const pressed = (at: number) => (t >= at && t < at + 0.22 ? 1 : 0);

  // Type.
  const line2 = prog(t, T.line2[0], T.line2[1], easeOut);
  const line3 = prog(t, T.line3[0], T.line3[1], easeOut);
  const pill = prog(t, T.pill[0], T.pill[1], easeOut);
  const bandOut = prog(t, T.out[0], T.out[0] + 0.4, easeIn);
  const lockupIn = prog(t, T.lockup[0], T.lockup[1], easeOut);
  const newest = (from: number, until: number) => (t >= from && t < until ? colors.primary : colors.text);

  const band = v
    ? { left: 40, right: 40, top: 128, align: "center" as const, size: 92, pill: 34 }
    : { left: 130, width: 760, top: height / 2 - 200, align: "left" as const, size: 104, pill: 34 };
  const lineStyle = { fontFamily: DISPLAY, fontWeight: 800, fontSize: band.size, lineHeight: 1.04, letterSpacing: -1.5 };

  const screenW = SCREEN.w;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 18%, #FBF5E7 0%, ${colors.background} 48%, #E9DBBE 100%)`, overflow: "hidden" }}>
      {/* Text band: its own space, never over the playing UI. */}
      <div
        style={{
          position: "absolute",
          left: band.left,
          right: v ? (band as { right: number }).right : undefined,
          width: v ? undefined : (band as { width: number }).width,
          top: band.top,
          textAlign: band.align,
          opacity: 1 - bandOut,
          color: colors.text,
        }}
      >
        <div style={{ ...lineStyle, color: newest(0, T.line2[0]) }}>Five dinners.</div>
        <div style={{ ...lineStyle, color: newest(T.line2[0], T.line3[0]), opacity: line2, transform: `translateY(${(1 - line2) * 22}px)` }}>One list.</div>
        <div style={{ ...lineStyle, color: colors.primary, opacity: line3, transform: `translateY(${(1 - line3) * 22}px)` }}>Leftovers first.</div>
        <div
          style={{
            display: "inline-block",
            marginTop: v ? 14 : 22,
            padding: "8px 22px",
            borderRadius: 999,
            border: `2.5px solid ${colors.accent}`,
            color: colors.accent,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: band.pill,
            opacity: pill,
            transform: `translateY(${(1 - pill) * 12}px)`,
          }}
        >
          With Unlimited weekly plans
        </div>
      </div>

      {/* The phone, under one camera, in its window. */}
      {t < T.out[1] + 0.05 ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: windowTop,
            bottom: 0,
            overflow: "hidden",
            opacity: 1 - out,
            WebkitMaskImage: v ? "linear-gradient(to bottom, transparent 0px, #000 64px)" : undefined,
            maskImage: v ? "linear-gradient(to bottom, transparent 0px, #000 64px)" : undefined,
          }}
        >
          <div style={{ position: "absolute", left: phoneLeft, top: phoneTop - windowTop }}>
            <div style={{ transformOrigin: "0 0", transform: `scale(${k})`, width: screenW + RIM * 2 }}>
              <div
                style={{
                  // Explicit, so the rim sits around the screen on every side (Remotion's default
                  // box-sizing is border-box, which would squeeze the screen out of the rim).
                  boxSizing: "content-box",
                  padding: RIM,
                  borderRadius: RADIUS + RIM,
                  background: "#111214",
                  boxShadow: "0 40px 90px rgba(60,35,10,0.30), inset 0 0 0 3px #34353a",
                  width: screenW,
                }}
              >
                <div style={{ width: screenW, height: SCREEN.h, borderRadius: RADIUS, overflow: "hidden", position: "relative", background: colors.background }}>
                  {/* Week 1 → Shop → Cook are tab switches (quick fades, as on the phone). */}
                  {toShop < 1 ? <Layer><WeekScreen week={1} /></Layer> : null}
                  {toShop > 0 && toCook < 1 ? (
                    <Layer opacity={toShop}><ShopScreen onions={onions} spinach={spinach} /></Layer>
                  ) : null}
                  {toCook > 0 && toWeek2 < 1 ? (
                    <Layer opacity={toCook} x={-toWeek2 * screenW}><CookScreen cooked={cooked} bars={bars} /></Layer>
                  ) : null}
                  {/* A week later: the next plan slides in. */}
                  {toWeek2 > 0 ? (
                    <Layer x={(1 - toWeek2) * screenW}><WeekScreen week={2} /></Layer>
                  ) : null}
                  <PressDim t={t} pressed={pressed} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* The touch actor: enters and exits through a frame edge; presses inside the control. */}
      <Touch t={t} toCanvas={toCanvas} width={width} height={height} />

      {/* B5: the close. */}
      {lockupIn > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: v ? 34 : 26,
            opacity: lockupIn,
            transform: `translateY(${(1 - lockupIn) * 30}px)`,
          }}
        >
          <div style={{ display: "flex", gap: v ? 16 : 14, marginBottom: 8 }}>
            {["r1", "r2", "r3", "r4", "r7"].map((id, i) => {
              const d = prog(t, T.lockup[0] + i * 0.07, T.lockup[0] + 0.45 + i * 0.07, easeOut);
              const size = v ? 150 : 118;
              return (
                <div key={id} style={{ opacity: d, transform: `translateY(${(1 - d) * 18}px)`, borderRadius: size / 2, overflow: "hidden", boxShadow: "0 10px 26px rgba(60,35,10,0.22)", border: "4px solid #FBF6E8" }}>
                  <Photo id={id} w={size} h={size} radius={size / 2} />
                </div>
              );
            })}
          </div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: v ? 132 : 124, color: colors.text, letterSpacing: -2, lineHeight: 1 }}>Five Dinners</div>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: v ? 42 : 38, color: colors.textMuted, textAlign: "center", maxWidth: v ? 880 : 1200, lineHeight: 1.3 }}>
            Five dinners a week.<br />One list, in whole packs.
          </div>
          <div style={{ marginTop: 14, padding: "18px 40px", borderRadius: 999, border: `3px solid ${colors.primary}`, color: colors.primary, fontFamily: SANS, fontWeight: 700, fontSize: v ? 40 : 36 }}>
            Coming soon on iPhone
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

function Layer({ children, opacity = 1, x = 0 }: { children: ReactNode; opacity?: number; x?: number }) {
  return <div style={{ position: "absolute", inset: 0, opacity, transform: `translateX(${x}px)` }}>{children}</div>;
}

/** The pressed state of each control the touch presses: a brief dim, as React Native's press does. */
function PressDim({ t, pressed }: { t: number; pressed: (at: number) => number }) {
  const spots: Array<{ at: number; x: number; y: number; w: number; h: number; r: number }> = [
    { at: T.pressShop, x: TABS.shop.x - 60, y: TABS.shop.y - 26, w: 120, h: 60, r: 12 },
    { at: T.pressCook, x: TABS.cook.x - 60, y: TABS.cook.y - 26, w: 120, h: 60, r: 12 },
    { at: T.pressOnions, x: 0, y: SHOP_TARGETS.onions.y - 37, w: 330, h: 74, r: 0 },
    { at: T.pressSpinach, x: 0, y: SHOP_TARGETS.spinach.y - 30, w: 330, h: 60, r: 0 },
    { at: T.pressMark, x: MARK_COOKED.x - 80, y: MARK_COOKED.y - 24, w: 160, h: 48, r: 10 },
  ];
  return (
    <>
      {spots.map((s) =>
        pressed(s.at) ? (
          <div key={s.at} style={{ position: "absolute", left: s.x, top: s.y, width: s.w, height: s.h, borderRadius: s.r, background: "#2A1F16", opacity: 0.08 }} />
        ) : null,
      )}
    </>
  );
}

type Stop = { at: number; press: number; target: Pt };
type Move = { inAt: number; stops: Stop[]; out: number; from: "bottom" | "right" | "bottomLeft"; bow: number };

const MOVES: Move[] = [
  { inAt: T.touchShopIn, stops: [{ at: T.touchShopAt, press: T.pressShop, target: TABS.shop }], out: T.pressShop + 0.85, from: "bottom", bow: 70 },
  {
    inAt: T.touchTickIn,
    stops: [
      { at: T.touchOnionsAt, press: T.pressOnions, target: SHOP_TARGETS.onions },
      { at: T.touchSpinachAt, press: T.pressSpinach, target: SHOP_TARGETS.spinach },
    ],
    out: T.pressSpinach + 0.85,
    from: "bottomLeft",
    bow: -80,
  },
  { inAt: T.touchCookIn, stops: [{ at: T.touchCookAt, press: T.pressCook, target: TABS.cook }], out: T.pressCook + 0.85, from: "bottom", bow: 70 },
  { inAt: T.touchMarkIn, stops: [{ at: T.touchMarkAt, press: T.pressMark, target: MARK_COOKED }], out: T.pressMark + 0.7, from: "right", bow: -70 },
];

function Touch({ t, toCanvas, width, height }: { t: number; toCanvas: (p: Pt) => Pt; width: number; height: number }) {
  const move = MOVES.find((m) => t >= m.inAt && t <= m.out);
  if (!move) return null;
  const first = toCanvas(move.stops[0].target);
  const last = move.stops[move.stops.length - 1];
  const lastC = toCanvas(last.target);
  const start =
    move.from === "bottom"
      ? { x: first.x + 170, y: height + 80 }
      : move.from === "bottomLeft"
        ? { x: Math.max(-80, first.x - 60), y: height + 80 }
        : { x: width + 80, y: first.y + 160 };
  const exit = move.from === "bottomLeft" ? { x: -90, y: lastC.y + 300 } : { x: width + 90, y: lastC.y + 260 };

  let p: Pt;
  let ripple: { at: number; c: Pt } | null = null;
  if (t <= move.stops[0].at) {
    p = arc(start, first, prog(t, move.inAt, move.stops[0].at, easeInOut), move.bow);
  } else {
    p = lastC;
    for (let i = 0; i < move.stops.length; i++) {
      const s = move.stops[i];
      const c = toCanvas(s.target);
      const next = move.stops[i + 1];
      const leave = s.press + 0.25;
      if (t >= s.press - 0.05) ripple = { at: s.press, c };
      if (t <= leave) {
        if (t >= s.at) { p = c; break; }
      } else if (next && t <= next.at) {
        p = arc(c, toCanvas(next.target), prog(t, leave, next.at, easeInOut), 40);
        break;
      } else if (!next) {
        p = arc(c, exit, prog(t, leave, move.out, easeIn), 60);
      }
    }
  }
  const down = move.stops.some((s) => t >= s.press && t < s.press + 0.18);
  const size = 64;
  const r = ripple ? prog(t, ripple.at, ripple.at + 0.42, easeOut) : 0;
  return (
    <>
      {ripple && r > 0 && r < 1 ? (
        <div
          style={{
            position: "absolute",
            left: ripple.c.x - size * (0.5 + r),
            top: ripple.c.y - size * (0.5 + r),
            width: size * (1 + r * 2),
            height: size * (1 + r * 2),
            borderRadius: "50%",
            border: `3px solid rgba(153,64,0,${0.5 * (1 - r)})`,
          }}
        />
      ) : null}
      <div
        style={{
          position: "absolute",
          left: p.x - size / 2,
          top: p.y - size / 2,
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.78)",
          border: "2px solid rgba(42,31,22,0.18)",
          boxShadow: "0 8px 22px rgba(0,0,0,0.22)",
          transform: `scale(${down ? 0.82 : 1})`,
        }}
      />
    </>
  );
}
