// "One verse. Then put it down." A Product Film for Verse by Verse. Every frame is a pure
// function of the frame number: the camera, the touch, the screens and the type all read the time
// from useCurrentFrame() and the timing map in script.ts.
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import "./fonts";
import { arc, easeIn, easeInOut, easeOut, mix, prog } from "./anim";
import { colors, SANS, SERIF } from "./brand";
import { T } from "./script";
import { Flourish, SCREEN } from "./ui/parts";
import {
  LockScreen,
  ReadScreen,
  SENT_SLOT,
  SHEET_CARD,
  ShareCard,
  ShareSheet,
  TARGETS,
  Thread,
} from "./ui/screens";

export type Layout = "vertical" | "landscape";

const RIM = 14; // phone rim in points
const RADIUS = 62;

/**
 * The camera: a screen point `f` (in points) shown at canvas point `a` (px), at `k` px per point.
 * One keyframe per beat; it eases between them and holds in between.
 */
type Cam = { f: { x: number; y: number }; a: { x: number; y: number }; k: number };

function shots(layout: Layout): Cam[] {
  if (layout === "vertical") {
    return [
      { f: { x: 220, y: 446 }, a: { x: 540, y: 1290 }, k: 2.2 }, // the reminder (phone top stays below the band)
      { f: { x: 220, y: 272 }, a: { x: 540, y: 1060 }, k: 1.95 }, // the verse card
      { f: { x: 220, y: 398 }, a: { x: 540, y: 1130 }, k: 2.0 }, // the share card
      { f: { x: 240, y: 330 }, a: { x: 540, y: 1090 }, k: 1.9 }, // the thread
    ];
  }
  return [
    { f: { x: 220, y: 446 }, a: { x: 1400, y: 560 }, k: 1.75 },
    { f: { x: 220, y: 272 }, a: { x: 1400, y: 540 }, k: 1.45 },
    { f: { x: 220, y: 398 }, a: { x: 1400, y: 560 }, k: 1.5 },
    { f: { x: 240, y: 330 }, a: { x: 1400, y: 560 }, k: 1.45 },
  ];
}

function camera(layout: Layout, t: number): Cam {
  const [hook, read, card, thread] = shots(layout);
  const steps: Array<[Cam, number, number]> = [
    [read, T.open[0], T.pushRead[1]],
    [card, T.pushCard[0], T.pushCard[1]],
    [thread, T.send[0], T.send[1] + 0.4],
  ];
  let c = hook;
  for (const [next, t0, t1] of steps) {
    const p = prog(t, t0, t1);
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
  const cam = camera(layout, t);
  const k = cam.k;
  // The phone's outer top-left, so that the focus point lands on the anchor.
  const phoneLeft = cam.a.x - (cam.f.x + RIM) * k;
  const phoneTop = cam.a.y - (cam.f.y + RIM) * k;

  // Drop: the phone eases down and away as the screen goes dark.
  const drop = prog(t, T.drop[0], T.drop[1], easeIn);
  const dropY = drop * height * 1.15;
  const dropRot = drop * 7;

  /** A point on the screen (in points) → canvas pixels, under the camera. */
  const toCanvas = (p: { x: number; y: number }) => ({
    x: cam.a.x + (p.x - cam.f.x) * k,
    y: cam.a.y + (p.y - cam.f.y) * k + dropY,
  });

  // Screen states.
  const open = prog(t, T.open[0], T.open[1], easeOut);
  const sheet = prog(t, T.sheet[0], T.sheet[1], easeOut);
  const send = prog(t, T.send[0], T.send[1], easeInOut);
  const off = prog(t, T.screenOff[0], T.screenOff[1], easeInOut);
  const notifSettle = prog(t, -0.4, 0.35, easeOut);
  const delivered = prog(t, T.delivered, T.delivered + 0.3, easeOut);
  const pressed = (at: number) => (t >= at && t < at + 0.28 ? 1 : 0);

  // The flying card, from the sheet to the sent slot in the thread.
  const card = {
    x: mix(SHEET_CARD.x, SENT_SLOT.x, send),
    y: mix(SHEET_CARD.y, SENT_SLOT.y, send),
    scale: mix(SHEET_CARD.scale, SENT_SLOT.scale, send),
  };

  // Type.
  const hookOut = prog(t, T.lockup[0] - 0.4, T.lockup[0], easeIn);
  const putDownIn = prog(t, T.putDown[0], T.putDown[1], easeOut);
  const lockupIn = prog(t, T.lockup[0], T.lockup[1], easeOut);

  const band =
    layout === "vertical"
      ? { left: 40, right: 40, top: 120, align: "center" as const, size: 100 }
      : { left: 140, right: 860, top: height / 2 - 130, align: "left" as const, size: 100 };

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% 20%, #FBF8F1 0%, ${colors.background} 45%, #EDE2CF 100%)`, overflow: "hidden" }}>
      {/* Text band: its own space, never over the playing UI. */}
      <div style={{ position: "absolute", left: band.left, right: band.right, top: band.top, textAlign: band.align, opacity: 1 - hookOut }}>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: band.size, lineHeight: 1.08, color: colors.text, letterSpacing: -1 }}>One verse.</div>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: band.size,
            lineHeight: 1.08,
            color: colors.text,
            letterSpacing: -1,
            opacity: putDownIn,
            transform: `translateY(${(1 - putDownIn) * 24}px)`,
          }}
        >
          Then put it <span style={{ color: colors.primary }}>down.</span>
        </div>
      </div>

      {/* The phone, under one camera. */}
      {t < T.drop[1] + 0.1 ? (
        <div
          style={{
            position: "absolute",
            left: phoneLeft,
            top: phoneTop,
            transformOrigin: "50% 0%",
            transform: `translateY(${dropY}px) rotate(${dropRot}deg)`,
          }}
        >
          <div style={{ transformOrigin: "0 0", transform: `scale(${k})`, width: SCREEN.w + RIM * 2 }}>
            <div
              style={{
                padding: RIM,
                borderRadius: RADIUS + RIM,
                background: "#111214",
                boxShadow: "0 40px 90px rgba(40,25,10,0.35), inset 0 0 0 3px #34353a",
                width: SCREEN.w,
              }}
            >
              <div style={{ width: SCREEN.w, height: SCREEN.h, borderRadius: RADIUS, overflow: "hidden", position: "relative", background: "#000" }}>
                {/* B1: lock screen with the reminder. */}
                {open < 1 ? (
                  <div style={{ position: "absolute", inset: 0, filter: `brightness(${1 - open * 0.5})` }}>
                    <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - notifSettle) * 0}px)` }}>
                      <LockScreenSettled settle={notifSettle} pressed={pressed(T.press1)} />
                    </div>
                  </div>
                ) : null}
                {/* B2–B3: the app opens on the reading place. */}
                {open > 0 && sheet < 1 ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: open,
                      transformOrigin: "220px 446px",
                      transform: `scale(${mix(0.3, 1, open)})`,
                      borderRadius: mix(40, 0, open),
                      overflow: "hidden",
                    }}
                  >
                    <ReadScreen sharePressed={pressed(T.press2)} />
                  </div>
                ) : null}
                {/* B4–B5: the share sheet rises. */}
                {sheet > 0 && send < 1 ? (
                  <div style={{ position: "absolute", inset: 0, transform: `translateY(${(1 - sheet) * SCREEN.h}px)` }}>
                    <ShareSheet buttonPressed={pressed(T.press3)} hideCard />
                  </div>
                ) : null}
                {/* B6: the thread, with the card flying into it. */}
                {send > 0 ? (
                  <div style={{ position: "absolute", inset: 0, opacity: send }}>
                    <Thread delivered={delivered} />
                  </div>
                ) : null}
                {sheet > 0 ? (
                  <div
                    style={{
                      position: "absolute",
                      left: card.x,
                      top: card.y + (1 - sheet) * SCREEN.h,
                      transformOrigin: "0 0",
                      transform: `scale(${card.scale})`,
                      borderRadius: 22,
                      boxShadow: send > 0 ? `0 ${8 * send}px ${24 * send}px rgba(0,0,0,${0.18 * send})` : "none",
                    }}
                  >
                    <ShareCard />
                  </div>
                ) : null}
                {/* B7: the screen goes dark. */}
                <div style={{ position: "absolute", inset: 0, background: "#000", opacity: off }} />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* The touch actor: enters and exits through a frame edge; presses inside the control. */}
      <Touch t={t} toCanvas={toCanvas} width={width} height={height} />

      {/* B8: the close. */}
      {lockupIn > 0 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: layout === "vertical" ? 34 : 26,
            opacity: lockupIn,
            transform: `translateY(${(1 - lockupIn) * 30}px)`,
          }}
        >
          <Flourish width={layout === "vertical" ? 340 : 300} />
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: layout === "vertical" ? 124 : 118, color: colors.text, letterSpacing: -1.5 }}>Verse by Verse</div>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: layout === "vertical" ? 40 : 38, color: colors.textMuted, textAlign: "center", maxWidth: layout === "vertical" ? 860 : 1200, lineHeight: 1.3 }}>
            The whole World English Bible, free to read.
          </div>
          <div
            style={{
              marginTop: 18,
              padding: "18px 40px",
              borderRadius: 999,
              border: `3px solid ${colors.primary}`,
              color: colors.primary,
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: layout === "vertical" ? 40 : 36,
            }}
          >
            Coming soon on iPhone
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
}

function LockScreenSettled({ settle, pressed }: { settle: number; pressed: number }) {
  // The reminder is already landing at frame 0 (it is also the poster), settling over 0.35 s.
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <LockScreen />
      <div
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          top: 402,
          height: 88,
          borderRadius: 22,
          background: "#000",
          opacity: pressed * 0.12,
          transform: `translateY(${(1 - settle) * -10}px)`,
        }}
      />
    </div>
  );
}

type Move = { inAt: number; at: number; press: number; out: number; target: { x: number; y: number }; from: "bottom" | "right"; bow: number };

const MOVES: Move[] = [
  { inAt: T.touch1In, at: T.touch1At, press: T.press1, out: T.press1 + 0.9, target: TARGETS.notification, from: "bottom", bow: 90 },
  { inAt: T.touch2In, at: T.touch2At, press: T.press2, out: T.press2 + 0.9, target: TARGETS.share, from: "right", bow: -70 },
  { inAt: T.touch3In, at: T.touch3At, press: T.press3, out: T.press3 + 0.8, target: TARGETS.shareCardButton, from: "bottom", bow: 80 },
];

function Touch({ t, toCanvas, width, height }: { t: number; toCanvas: (p: { x: number; y: number }) => { x: number; y: number }; width: number; height: number }) {
  const move = MOVES.find((m) => t >= m.inAt && t <= m.out + 0.6);
  if (!move) return null;
  const target = toCanvas(move.target);
  const start = move.from === "bottom" ? { x: target.x + 160, y: height + 80 } : { x: width + 80, y: target.y + 140 };
  const exit = { x: width + 90, y: target.y + 260 };
  let p: { x: number; y: number };
  if (t <= move.at) p = arc(start, target, prog(t, move.inAt, move.at, easeInOut), move.bow);
  else if (t <= move.press + 0.3) p = target;
  else p = arc(target, exit, prog(t, move.press + 0.3, move.out, easeIn), 60);
  const down = t >= move.press && t < move.press + 0.2;
  const ripple = prog(t, move.press, move.press + 0.4, easeOut);
  const size = 64;
  return (
    <>
      {ripple > 0 && ripple < 1 ? (
        <div
          style={{
            position: "absolute",
            left: target.x - size * (0.5 + ripple),
            top: target.y - size * (0.5 + ripple),
            width: size * (1 + ripple * 2),
            height: size * (1 + ripple * 2),
            borderRadius: "50%",
            border: `3px solid rgba(131,85,41,${0.5 * (1 - ripple)})`,
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
          border: "2px solid rgba(31,24,18,0.18)",
          boxShadow: "0 8px 22px rgba(0,0,0,0.22)",
          transform: `scale(${down ? 0.82 : 1})`,
        }}
      />
    </>
  );
}
