"use client";

import * as React from "react";
import { readStorage, subscribeStorage, writeStorage } from "./storage";

export type PlannerTermKey = string;

type Plan = Record<PlannerTermKey, string[]>;

type Ctx = {
  plan: Plan;
  add: (term: PlannerTermKey, courseId: string) => void;
  remove: (term: PlannerTermKey, courseId: string) => void;
  move: (from: PlannerTermKey, to: PlannerTermKey, courseId: string) => void;
  clear: () => void;
  has: (courseId: string) => PlannerTermKey | null;
};

const STORAGE_KEY = "omscs-hub:planner:v1";
const EMPTY: Plan = {};
const PlannerCtx = React.createContext<Ctx | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const plan = React.useSyncExternalStore(
    (cb) => subscribeStorage(STORAGE_KEY, cb),
    () => readStorage<Plan>(STORAGE_KEY, EMPTY),
    () => EMPTY,
  );

  const value: Ctx = React.useMemo(
    () => ({
      plan,
      add(term, courseId) {
        const next: Plan = { ...plan };
        for (const k of Object.keys(next)) {
          next[k] = next[k].filter((c) => c !== courseId);
        }
        next[term] = Array.from(new Set([...(next[term] ?? []), courseId]));
        writeStorage(STORAGE_KEY, next);
      },
      remove(term, courseId) {
        const next: Plan = {
          ...plan,
          [term]: (plan[term] ?? []).filter((c) => c !== courseId),
        };
        writeStorage(STORAGE_KEY, next);
      },
      move(from, to, courseId) {
        const next: Plan = { ...plan };
        next[from] = (next[from] ?? []).filter((c) => c !== courseId);
        next[to] = Array.from(new Set([...(next[to] ?? []), courseId]));
        writeStorage(STORAGE_KEY, next);
      },
      clear() {
        writeStorage(STORAGE_KEY, EMPTY);
      },
      has(courseId) {
        for (const [k, v] of Object.entries(plan)) {
          if (v.includes(courseId)) return k;
        }
        return null;
      },
    }),
    [plan],
  );

  return <PlannerCtx.Provider value={value}>{children}</PlannerCtx.Provider>;
}

export function usePlanner() {
  const ctx = React.useContext(PlannerCtx);
  if (!ctx) throw new Error("usePlanner must be used within PlannerProvider");
  return ctx;
}
