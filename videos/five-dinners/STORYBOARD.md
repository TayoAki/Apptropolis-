# Storyboard: Five Dinners — "Five dinners. One list. Leftovers first." (v2)

**Runtime:** 21.0 s · **Masters:** 1080 × 1920 @ 30 fps (vertical), 1920 × 1080 @ 30 fps (16:9)
· **Sound plan:** silent · **Timing map:** `src/script.ts`

## Beat sheet

| # | Time | Beat | Lands on |
|---|---|---|---|
| B1 | 0:00–0:02.8 | Hook: the Week screen for a household of 4, $44.20 of a $65.00 budget, the five dinners with their pictures. "Five dinners." in the band from frame 0 (= poster). The camera drifts, then pulls back to the whole phone | frame 0 |
| B2 | 0:02.8–0:03.8 | A finger taps Shop; the list opens. "One list." lands | press at 2.7 s |
| B3 | 0:03.8–0:07.2 | Shop, in the store: the finger ticks Yellow onions, then Spinach. Paid so far $23.40 → $25.85 → $27.94; 5 → 7 of 15 ticked; Produce 3 → 5 of 5 | presses at 5.1 s, 6.1 s |
| B4 | 0:07.2–0:09.4 | Pull back to the whole phone; the finger taps Cook | press at 8.3 s |
| B5 | 0:09.4–0:12.9 | Marquee: "Mark cooked" on Monday's penne. Mon's circle fills, "1 of 5 cooked this week", the card opens to What's left: Penne 4 oz of 1 lb, Diced tomatoes 2 cans of 4, Spinach 2 oz of 8 oz. "Leftovers first." lands. Camera pushes in and holds | press at 10.1 s |
| B6 | 0:12.9–0:17.1 | A week later (a slide, no tap): Nov 22–28 is planned around the leftovers: "Carried over: 4 oz penne, 11.6 oz chicken thighs, 8 eggs…", and each dinner says what it uses. the paid label "With Unlimited weekly plans" | 13.6 s |
| B7 | 0:17.1–0:21.0 | Close: the week's five dinners as round pictures, "Five Dinners", "Five dinners a week. / One list, in whole packs.", CTA "Coming soon on iPhone". Clean hold | 17.8 s |

## Camera
The phone's top edge is fixed on the canvas (y 310 vertical, y 46 in 16:9) and always in view under
the band; the camera only changes the scale, so the bottom of the phone may run off the frame.

| Shot | k vertical (px/pt) | k 16:9 | Shows |
|---|---|---|---|
| week | 1.8 → 1.83 | 1.5 → 1.53 | header, basket, the five dinners |
| low | 1.42 | 0.98 | the whole phone, to tap the tab bar |
| shop | 1.8 | 1.5 | estimate, paid so far, the produce rows |
| cook | 1.8 | 1.5 | the week's circles and Monday's card |
| cookPush | 1.95 | 1.55 | What's left |
| week2 | 1.8 → 1.84 | 1.5 → 1.53 | Carried over and the dinners that use it |

16:9 is recomposed, not cropped: the band sits on the left and builds all three lines; the phone is
on the right at x 1380. In the vertical cut the band shows one line at a time.

## Touch
Four moves, each entering and leaving through a frame edge: Shop tab (from the bottom), the two
ticks (from the bottom left, one hop between them), Cook tab (bottom), Mark cooked (right). Each
press dims the control the way the app's press does, and the press causes the change on screen.

## Truth notes
See REVIEW.md.
