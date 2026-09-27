"use client";

import * as React from "react";
import { currentPlanningTerm } from "@/lib/data/planning-terms";

function subscribe(callback: () => void) {
  const interval = window.setInterval(callback, 60_000);
  window.addEventListener("focus", callback);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener("focus", callback);
  };
}

export function useCurrentTermKey(serverTermKey: string) {
  return React.useSyncExternalStore(
    subscribe,
    () => currentPlanningTerm().key,
    () => serverTermKey,
  );
}
