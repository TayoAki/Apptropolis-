// The timing map, in seconds. Every beat, press and transition reads from here.
export const T = {
  // B1 hook: lock screen with the reminder; touch arcs in and presses it.
  touch1In: 1.0,
  touch1At: 2.05,
  press1: 2.25,
  open: [2.35, 2.95] as const,
  // B3 read
  pushRead: [3.3, 4.6] as const,
  // B4 share
  touch2In: 7.9,
  touch2At: 8.65,
  press2: 8.85,
  sheet: [8.95, 9.45] as const,
  pushCard: [9.5, 10.6] as const,
  // B6 send
  touch3In: 11.9,
  touch3At: 12.55,
  press3: 12.75,
  send: [12.9, 13.6] as const,
  delivered: 14.0,
  // B7 put it down
  screenOff: [15.4, 16.1] as const,
  drop: [15.7, 17.4] as const,
  putDown: [16.2, 16.7] as const,
  // B8 close
  lockup: [18.2, 18.9] as const,
  end: 21.0,
};
