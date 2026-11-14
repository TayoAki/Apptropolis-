// Which day it is, for screens that depend on it. A screen left open past midnight (or reopened
// the next morning) re-renders with the new day instead of showing yesterday's workout.
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { dayKey } from "./schema";

/** Today as YYYY-MM-DD. The screen re-renders when the calendar day changes. */
export function useToday(): string {
  const [today, setToday] = useState(() => dayKey(new Date()));
  useEffect(() => {
    const check = () => setToday(dayKey(new Date()));
    const timer = setInterval(check, 60_000);
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") check();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);
  return today;
}
