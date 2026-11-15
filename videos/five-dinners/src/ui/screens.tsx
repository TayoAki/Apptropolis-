// The recreated Five Dinners screens, in iPhone points on a 440 x 956 screen. Positions are
// measured from the app's own captures (five-dinners/store/screenshots/captures/week1.png,
// shop-ticking.png, cook-midweek.png, week2.png: 3x, without the 54 pt status bar) and sizes follow
// five-dinners/theme/tokens.ts and the components. The household is the demo one the screenshot
// script builds through the real app: 4 people, $65 budget, no pork, Aldi ZIP 60601.
import type { ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { colors, SANS } from "../brand";
import { Abs, Bar, Icon, money, Photo, SCREEN, StatusBar, TabBar } from "./parts";

/** App-area y (as measured in the captures) to screen y. */
const Y = (y: number) => SCREEN.status + y;

const text = (size: number, weight = 400, color: string = colors.text, lh?: number) => ({
  fontFamily: SANS,
  fontSize: size,
  fontWeight: weight,
  color,
  lineHeight: lh ? `${lh}px` : undefined,
  fontVariantNumeric: "tabular-nums" as const,
});

function Screen({ children, tab }: { children: ReactNode; tab: "week" | "shop" | "cook" }) {
  return (
    <div style={{ width: SCREEN.w, height: SCREEN.h, position: "relative", overflow: "hidden", background: colors.background }}>
      <StatusBar />
      {children}
      <TabBar active={tab} />
    </div>
  );
}

function Header({ title, sub, center, icons = false }: { title: string; sub: string; center: number; icons?: boolean }) {
  return (
    <>
      <Abs x={16.5} y={Y(center - 22)} style={{ ...text(36, 700, colors.text, 44), letterSpacing: -0.3 }}>{title}</Abs>
      <Abs x={16.5} y={Y(center + 24)} style={text(16, 400, colors.textMuted, 20)}>{sub}</Abs>
      {icons ? (
        <>
          <Abs x={346} y={Y(18)}><Icon name="share-social-outline" size={24} color={colors.text} /></Abs>
          <Abs x={389} y={Y(18)}><Icon name="settings-outline" size={24} color={colors.text} /></Abs>
        </>
      ) : null}
    </>
  );
}

/** A receipt's torn edge along the bottom of the basket card. */
function Zigzag({ w }: { w: number }) {
  const step = 13;
  let d = `M0 10`;
  for (let x = 0; x < w; x += step) d += ` L${x + step / 2} 2 L${x + step} 10`;
  d += ` Z`;
  return (
    <svg width={w} height={10} style={{ position: "absolute", left: 0, bottom: -1, display: "block" }}>
      <path d={d} fill={colors.background} />
    </svg>
  );
}

function Basket({ total, week }: { total: number; week: 1 | 2 }) {
  const h = week === 1 ? 224 : 211;
  const noteTop = week === 1 ? 147.5 : 151;
  const noteH = week === 1 ? 57 : 38;
  return (
    <Abs
      x={16}
      y={Y(97)}
      w={408}
      h={h}
      style={{ background: colors.surface, borderLeft: `1px solid ${colors.border}`, borderRight: `1px solid ${colors.border}`, borderTop: `1px solid ${colors.border}`, borderRadius: "12px 12px 0 0", boxSizing: "border-box" }}
    >
      <Abs x={17} y={16.5} style={text(15, 400, colors.text, 19)}>This week's basket</Abs>
      <Abs x={17} y={43} style={{ ...text(36, 700, colors.text, 42), borderBottom: `2px solid ${colors.text}` }}>{money(total)}</Abs>
      <Abs x={151} y={45.5} style={text(15, 400, colors.textMuted, 19.5)}>of $65.00<br />budget</Abs>
      <div style={{ position: "absolute", right: 16, top: 55, height: 29, padding: "0 13px", borderRadius: 999, border: `1.5px solid ${colors.accent}`, boxSizing: "border-box", display: "flex", alignItems: "center", ...text(15, 500, colors.accent) }}>
        {money(65 - total)} left
      </div>
      <Abs x={17} y={99.5}><Bar pct={total / 65} w={335} /></Abs>
      <div style={{ position: "absolute", right: 17, top: 94, ...text(15, 400, colors.text, 19) }}>{Math.round((total / 65) * 100)}%</div>
      <Abs x={17} y={119} style={text(13, 400, colors.textMuted, 16)}>5 dinners · full packs · Aldi ZIP 60601 · prices Nov 15</Abs>
      <Abs x={17} y={noteTop + noteH / 2 - 22} w={44} h={44}>
        <Img src={staticFile(week === 1 ? "penny-happy.png" : "penny-half-full.png")} style={{ width: 44, height: 44, display: "block" }} />
      </Abs>
      <Abs x={69} y={noteTop} w={322} style={text(15, 400, week === 1 ? colors.textMuted : colors.accent, 19)}>
        {week === 1 ? (
          "Nothing carried over yet. What's left of this week's packs appears here when the week ends."
        ) : (
          <>
            <b>Carried over:</b> 4 oz penne, 11.6 oz chicken thighs, 8 eggs, 2 oz spinach and 6 more
          </>
        )}
      </Abs>
      <Zigzag w={406} />
    </Abs>
  );
}

type Row = { day: string; id: string; name: string; meta: string; uses?: string; h: number };

const WEEK1: Row[] = [
  { day: "Mon", id: "r1", name: "Tomato, garlic & spinach penne", meta: "20 min · $6.11 · 4 servings", h: 81 },
  { day: "Tue", id: "r2", name: "Chicken thigh & potato sheet‑pan dinner", meta: "45 min · $12.61 · 4 servings", h: 81 },
  { day: "Wed", id: "r3", name: "Beef & kidney bean chili with rice", meta: "40 min · $11.01 · 4 servings", h: 81 },
  { day: "Thu", id: "r4", name: "Egg & veggie fried rice", meta: "25 min · $5.94 · 4 servings", h: 81 },
  { day: "Fri", id: "r7", name: "Bean & cheese quesadillas", meta: "20 min · $8.53 · 4 servings", h: 81 },
];

const WEEK2: Row[] = [
  { day: "Mon", id: "r2", name: "Chicken thigh & potato sheet‑pan dinner", meta: "45 min · $8.83 · 4 servings", uses: "Uses 11.6 oz leftover chicken thighs", h: 106 },
  { day: "Tue", id: "r20", name: "Shakshuka", meta: "30 min · $5.87 · 4 servings", uses: "Uses 8 eggs leftover large eggs", h: 81 },
  { day: "Wed", id: "r22", name: "Kidney bean burritos", meta: "30 min · $7.63 · 4 servings", uses: "Uses 2 tortillas leftover flour tortillas", h: 87 },
  { day: "Thu", id: "r23", name: "Salmon rice bowl", meta: "25 min", h: 81 },
];

function DinnerRow({ row, y }: { row: Row; y: number }) {
  return (
    <Abs
      x={16}
      y={y}
      w={408}
      h={row.h}
      style={{ display: "flex", alignItems: "center", background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", boxSizing: "border-box" }}
    >
      <div style={{ width: 44, alignSelf: "stretch", background: colors.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", ...text(13, 700) }}>{row.day}</div>
      <div style={{ marginLeft: 8, flexShrink: 0 }}><Photo id={row.id} w={64} h={64} /></div>
      <div style={{ flex: 1, margin: "0 8px 0 8px", display: "flex", flexDirection: "column", gap: 1 }}>
        <div style={text(15, 500, colors.text, 19)}>{row.name}</div>
        <div style={text(13, 400, colors.textMuted, 17)}>{row.meta}</div>
        {row.uses ? <div style={text(13, 400, colors.accent, 16.5)}>{row.uses}</div> : null}
      </div>
      <div style={{ width: 60, height: 35, marginRight: 9, flexShrink: 0, borderRadius: 999, border: `1.5px solid ${colors.primary}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", ...text(15, 500, colors.primary) }}>Swap</div>
    </Abs>
  );
}

export function WeekScreen({ week }: { week: 1 | 2 }) {
  const one = week === 1;
  const rows = one ? WEEK1 : WEEK2;
  const heading = one ? 371 : 434;
  let y = Y(one ? 401 : 465);
  return (
    <Screen tab="week">
      <Header title="Week" sub={one ? "Nov 15–21 · for 4" : "Nov 22–28 · for 4"} center={30} icons />
      <Basket total={one ? 44.2 : 51.68} week={week} />
      {one ? null : (
        <Abs x={16} y={Y(336)} w={408} h={51.5} style={{ background: colors.surfaceAlt, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", boxSizing: "border-box", ...text(15) }}>
          <span><b>What's left</b> · 10 items from last week</span>
          <Icon name="chevron-down" size={18} color={colors.text} />
        </Abs>
      )}
      <Abs x={16.5} y={Y(heading - 12)} style={text(20, 700, colors.text, 24)}>Five dinners</Abs>
      <div style={{ position: "absolute", right: 19, top: Y(heading - 10), display: "flex", alignItems: "center", gap: 4, ...text(15, 500, colors.primary, 20) }}>
        Budget $65.00 <Icon name="chevron-down" size={16} color={colors.primary} />
      </div>
      {rows.map((row) => {
        const top = y;
        y += row.h + 9;
        return <DinnerRow key={row.day} row={row} y={top} />;
      })}
    </Screen>
  );
}

// ---------------------------------------------------------------- Shop

type ShopItem = { name: string; sub: string[]; estimate: number; paid?: boolean; key?: "onions" | "spinach" };

const PRODUCE: ShopItem[] = [
  { name: "Yellow onions", sub: ["Buy 1 × 3 lb bag, about 8 · uses 10 onions ·", "8 onions from cupboard · 6 onions left"], estimate: 2.45, key: "onions" },
  { name: "Spinach", sub: ["Buy 1 × 8 oz bag · uses 6 oz · 2 oz left"], estimate: 2.09, key: "spinach" },
  { name: "Bell peppers", sub: ["Buy 1 × 3 ct pack · uses 2 peppers ·", "1 pepper left"], estimate: 2.99, paid: true },
  { name: "Carrots", sub: ["Buy 1 × 2 lb bag · uses 1.38 lb · 10 oz left"], estimate: 2.19, paid: true },
  { name: "Russet potatoes", sub: ["Buy 1 × 5 lb bag · uses 2.25 lb · 2.75 lb left"], estimate: 4.09 },
];

/** A row's height: 10 pt padding, the name, the subtitle lines and, once ticked, the estimate line. */
function rowHeight(item: ShopItem, tick: number) {
  const base = Math.max(60, 20 + 21 + 2 + 16 * item.sub.length);
  return base + 18 * tick;
}

const LIST_TOP = 413.5;

/** Where the film's two ticks land, before either is ticked (onions) and after the first (spinach). */
export const SHOP_TARGETS = {
  onions: { x: 30, y: Y(LIST_TOP + rowHeight(PRODUCE[0], 0) / 2) },
  spinach: { x: 30, y: Y(LIST_TOP + rowHeight(PRODUCE[0], 1) + rowHeight(PRODUCE[1], 0) / 2) },
};

function ShopRow({ item, tick, y }: { item: ShopItem; tick: number; y: number }) {
  const h = rowHeight(item, tick);
  return (
    <Abs x={0} y={y} w={440} h={h} style={{ background: colors.surface, borderBottom: `1px solid ${colors.border}`, boxSizing: "border-box", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 16, top: h / 2 - 14, width: 28, height: 28 }}>
        <Icon name="ellipse-outline" size={28} color={colors.textMuted} style={{ position: "absolute", left: 0, top: 0, opacity: 1 - tick }} />
        <Icon name="checkmark-circle-outline" size={28} color={colors.text} style={{ position: "absolute", left: 0, top: 0, opacity: tick, transform: `scale(${0.75 + 0.25 * tick})` }} />
      </div>
      <div style={{ position: "absolute", left: 54, top: 10, width: 290 }}>
        <div style={text(17, 500, colors.text, 21)}>{item.name}</div>
        <div style={{ marginTop: 2, ...text(13, 400, colors.textMuted, 16) }}>
          {item.sub.map((l) => (
            <div key={l} style={{ whiteSpace: "nowrap" }}>{l}</div>
          ))}
        </div>
        <div style={{ marginTop: 2, opacity: tick, ...text(13, 400, colors.textMuted, 16), whiteSpace: "nowrap" }}>Estimate {money(item.estimate)} · checked Nov 15</div>
      </div>
      {/* Unticked: the estimate as plain text. Ticked: the "what you paid" box. */}
      <div style={{ position: "absolute", right: 16, top: h / 2 - 10, opacity: 1 - tick, ...text(15, 500, colors.text, 20) }}>{money(item.estimate)}</div>
      <div style={{ position: "absolute", right: 16, top: h / 2 - 30.5, width: 76, opacity: tick, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <div style={{ width: 76, height: 44, borderRadius: 10, border: `1px solid ${colors.textMuted}`, boxSizing: "border-box", background: colors.surface, display: "flex", alignItems: "center", justifyContent: "center", ...text(15, 400, item.paid ? colors.text : colors.textMuted) }}>
          {money(item.estimate)}
        </div>
        <div style={text(12, 500, colors.textMuted, 15)}>{item.paid ? "±$0.00" : "Paid?"}</div>
      </div>
    </Abs>
  );
}

/** `onions` and `spinach` run 0 → 1 as each is ticked. */
export function ShopScreen({ onions, spinach }: { onions: number; spinach: number }) {
  const on = onions >= 0.5 ? 1 : 0;
  const sp = spinach >= 0.5 ? 1 : 0;
  const ticked = 5 + on + sp;
  const paid = 23.4 + on * 2.45 + sp * 2.09;
  const produce = 3 + on + sp;
  const ticks: Record<string, number> = { onions, spinach };
  let y = Y(LIST_TOP);
  return (
    <Screen tab="shop">
      <Header title="Shop" sub="Nov 15–21 · Aldi · ZIP 60601 · prices Nov 15" center={21.7} />
      <Abs x={16} y={Y(81.5)} w={408} h={152} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, boxSizing: "border-box" }}>
        <Abs x={17} y={16.5} style={text(15, 400, colors.text, 19)}>Estimate</Abs>
        <Abs x={17} y={35} style={{ ...text(36, 700, colors.text, 42), borderBottom: `2px solid ${colors.text}` }}>$44.20</Abs>
        <div style={{ position: "absolute", right: 17, top: 26.5, ...text(15, 400, colors.text, 19) }}>Paid so far</div>
        <div style={{ position: "absolute", right: 17, top: 45, ...text(28, 700, colors.text, 34) }}>{money(paid)}</div>
        <Abs x={17} y={95.5}><Bar pct={ticked / 15} w={279} /></Abs>
        <div style={{ position: "absolute", right: 17, top: 90, ...text(15, 400, colors.text, 19) }}>{ticked} of 15 ticked</div>
        <Abs x={17} y={118.5} style={text(13, 400, colors.warning, 17)}>+$0.10 against the estimate on ticked items.</Abs>
      </Abs>
      <Abs x={16} y={Y(250.3)} w={408} h={51.2} style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, boxSizing: "border-box", display: "flex", padding: 3, gap: 4 }}>
        <div style={{ flex: 1, borderRadius: 9, background: colors.surfaceAlt, border: `1px solid ${colors.textMuted}`, display: "flex", alignItems: "center", justifyContent: "center", ...text(15, 700) }}>By aisle</div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", ...text(15, 400, colors.textMuted) }}>By dinner</div>
      </Abs>
      <Abs x={16.5} y={Y(330.6)} w={407} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", ...text(15, 400, colors.textMuted, 20) }}>
        <span>5 staples · not on this list</span>
        <Icon name="chevron-down" size={18} color={colors.text} />
      </Abs>
      <Abs x={0} y={Y(370)} w={440} h={43.5} style={{ background: colors.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 0 16.5px", boxSizing: "border-box", ...text(15) }}>
        <span>Produce · {produce} of 5</span>
        {produce === 5 ? <Icon name="checkmark-done-outline" size={22} color={colors.text} /> : null}
      </Abs>
      {PRODUCE.map((item) => {
        const tick = item.key ? ticks[item.key] : 1;
        const top = y;
        y += rowHeight(item, tick);
        return <ShopRow key={item.name} item={item} tick={tick} y={top} />;
      })}
    </Screen>
  );
}

// ---------------------------------------------------------------- Cook

const CARD_TOP = 183.5;
const CARD_NEXT_H = 128 + 16 + 24 + 2 + 19 + 12 + 48 + 16; // one-line title, meta, buttons
const CARD_COOKED_H = 412;

/** "Mark cooked" on Monday's card, before it is cooked. */
export const MARK_COOKED = { x: 328, y: Y(CARD_TOP + 128 + 16 + 24 + 2 + 19 + 12 + 24) };

function Buttons() {
  const b = { flex: 1, height: 48, borderRadius: 10, boxSizing: "border-box" as const, display: "flex", alignItems: "center", justifyContent: "center", ...text(15, 500) };
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ ...b, background: colors.primary, color: colors.onPrimary }}>Start cooking</div>
      <div style={{ ...b, border: `1px solid ${colors.primary}`, color: colors.primary }}>Mark cooked</div>
    </div>
  );
}

const LEFT = [
  { name: "Penne", amount: "4 oz of 1 lb", pct: 0.25 },
  { name: "Diced tomatoes", amount: "2 cans of 4 cans", pct: 0.5 },
  { name: "Spinach", amount: "2 oz of 8 oz", pct: 0.25 },
];

/** `cooked` runs 0 → 1 as Monday is marked cooked; `bars` runs 0 → 1 as What's left fills in. */
export function CookScreen({ cooked, bars }: { cooked: number; bars: number }) {
  const done = cooked >= 0.5;
  // The buttons fade out first, then the cooked card fades in as it grows: never both at once.
  const nextOpacity = 1 - Math.min(1, cooked / 0.35);
  const cookedOpacity = Math.max(0, (cooked - 0.45) / 0.55);
  const monH = CARD_NEXT_H + (CARD_COOKED_H - CARD_NEXT_H) * cooked;
  const tueTop = CARD_TOP + monH + 16;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  return (
    <Screen tab="cook">
      <Header title="Cook" sub={`${done ? 1 : 0} of 5 cooked this week`} center={30} />
      {days.map((d, i) => {
        const filled = i === 0 ? cooked : 0;
        return (
          <Abs key={d} x={24 + i * 88 - 10} y={Y(97)} w={60} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ position: "relative", width: 40, height: 40 }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: 20, border: `1.5px solid ${colors.textMuted}`, boxSizing: "border-box", opacity: 1 - filled }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: 20, background: colors.accent, display: "flex", alignItems: "center", justifyContent: "center", opacity: filled, transform: `scale(${0.6 + 0.4 * filled})` }}>
                <Icon name="checkmark" size={24} color="#fff" />
              </div>
            </div>
            <div style={{ marginTop: 6, ...text(14, i === 0 && done ? 700 : 400, i === 0 && done ? colors.text : colors.textMuted, 18) }}>{d}</div>
          </Abs>
        );
      })}

      {/* Monday: next → cooked. */}
      <Abs
        x={16}
        y={Y(CARD_TOP)}
        w={408}
        h={monH}
        style={{ background: colors.surface, border: done ? `1px solid ${colors.border}` : `2px solid ${colors.primary}`, borderRadius: 10, overflow: "hidden", boxSizing: "border-box" }}
      >
        <Photo id="r1" w={408} h={128} radius={0} style={{ position: "absolute", left: -1, top: -1 }} />
        <Abs x={-1} y={127} w={48} h={monH} style={{ background: colors.surfaceAlt }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: done ? 20 : (CARD_NEXT_H - 128) / 2 - 8, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={text(13, 700)}>Mon</span>
            {done ? <Icon name="checkmark-circle" size={18} color={colors.success} /> : null}
          </div>
        </Abs>
        {/* Next: a one-line title, the time, and the two buttons. */}
        <Abs x={63} y={143} w={328} style={{ opacity: nextOpacity }}>
          <div style={text(20, 700, colors.text, 24)}>Tomato, garlic & spinach penne</div>
          <div style={{ marginTop: 2, ...text(15, 400, colors.textMuted, 19) }}>20 min · for 4</div>
          <div style={{ marginTop: 12 }}><Buttons /></div>
        </Abs>
        {/* Cooked: the title wraps beside the rating, then what's left of each pack. */}
        <Abs x={63} y={143} w={328} style={{ opacity: cookedOpacity }}>
          <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={text(20, 700, colors.text, 24)}>Tomato, garlic & spinach penne</div>
              <div style={{ marginTop: 2, ...text(15, 400, colors.textMuted, 19) }}>Cooked · for 4</div>
            </div>
            <div style={{ display: "flex" }}>
              {(["thumbs-up-outline", "thumbs-down-outline"] as const).map((n) => (
                <div key={n} style={{ width: 38, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={n} size={24} color={colors.textMuted} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
            <div style={text(15, 700, colors.text, 19)}>What's left</div>
            {LEFT.map((l) => (
              <div key={l.name} style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 8, ...text(13, 400, colors.text, 16) }}>
                  <span style={{ flex: 1 }}>{l.name}</span>
                  <span style={{ color: colors.textMuted }}>{l.amount}</span>
                  <span style={{ minWidth: 36, textAlign: "right", fontWeight: 500 }}>{Math.round(l.pct * 100)}%</span>
                </div>
                <div style={{ marginTop: 4 }}><Bar pct={l.pct * bars} w={328} h={4} /></div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, height: 32, display: "flex", alignItems: "center", ...text(13, 400, colors.textMuted), textDecoration: "underline" }}>Not cooked after all</div>
        </Abs>
      </Abs>

      {/* Tuesday: later → next once Monday is cooked. */}
      <Abs
        x={16}
        y={Y(tueTop)}
        w={408}
        h={300}
        style={{ background: colors.surface, border: done ? `2px solid ${colors.primary}` : `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", boxSizing: "border-box" }}
      >
        <Photo id="r2" w={408} h={128} radius={0} style={{ position: "absolute", left: -1, top: -1 }} />
        <Abs x={-1} y={127} w={48} h={200} style={{ background: colors.surfaceAlt, display: "flex", justifyContent: "center", paddingTop: 36, boxSizing: "border-box", ...text(13, 700) }}>Tue</Abs>
        <Abs x={63} y={143} w={done ? 328 : 300} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={text(20, 700, colors.text, 24)}>Chicken thigh & potato sheet‑pan dinner</div>
            <div style={{ marginTop: 2, ...text(15, 400, colors.textMuted, 19) }}>45 min · for 4</div>
          </div>
          {done ? null : <Icon name="chevron-forward" size={20} color={colors.textMuted} />}
        </Abs>
      </Abs>
    </Screen>
  );
}
