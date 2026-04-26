"use client";

const SUBSCRIBERS = new Map<string, Set<() => void>>();
const CACHE = new Map<string, { raw: string | null; value: unknown }>();

function subscribers(key: string) {
  let s = SUBSCRIBERS.get(key);
  if (!s) {
    s = new Set();
    SUBSCRIBERS.set(key, s);
  }
  return s;
}

function notify(key: string) {
  subscribers(key).forEach((fn) => fn());
}

export function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return fallback;
  }
  const cached = CACHE.get(key);
  if (cached && cached.raw === raw) {
    return cached.value as T;
  }
  let value: T;
  try {
    value = raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    value = fallback;
  }
  CACHE.set(key, { raw, value });
  return value;
}

export function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(value);
    localStorage.setItem(key, raw);
    CACHE.set(key, { raw, value });
    notify(key);
  } catch {
    // ignore
  }
}

export function subscribeStorage(key: string, cb: () => void) {
  const set = subscribers(key);
  set.add(cb);
  // Multi-tab sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === key) cb();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    set.delete(cb);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}
