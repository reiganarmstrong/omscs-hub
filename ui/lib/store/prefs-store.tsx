"use client";

import * as React from "react";
import type { SpecializationId } from "@/lib/types";
import { readStorage, subscribeStorage, writeStorage } from "./storage";

type Prefs = {
  selectedSpec: SpecializationId | null;
};

const STORAGE_KEY = "omscs-hub:prefs:v1";
const EMPTY: Prefs = { selectedSpec: null };

type Ctx = Prefs & {
  setSelectedSpec: (id: SpecializationId | null) => void;
};

const PrefsCtx = React.createContext<Ctx | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const prefs = React.useSyncExternalStore(
    (cb) => subscribeStorage(STORAGE_KEY, cb),
    () => readStorage<Prefs>(STORAGE_KEY, EMPTY),
    () => EMPTY,
  );

  const value = React.useMemo<Ctx>(
    () => ({
      ...prefs,
      setSelectedSpec(id) {
        writeStorage(STORAGE_KEY, { ...prefs, selectedSpec: id });
      },
    }),
    [prefs],
  );

  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

export function usePrefs() {
  const ctx = React.useContext(PrefsCtx);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}
