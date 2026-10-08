"use client";

import { useSyncExternalStore } from "react";
import { DB_VERSION, seedDB } from "./seed";
import type { DB, Draft } from "./types";
export const useSession = () => null;
function createLocalStore<T>(key: string, init: () => T) {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  const read = (): T => {
    if (cache !== undefined) return cache;

    try {
      const raw = localStorage.getItem(key);

      if (raw) {
        cache = JSON.parse(raw) as T;
      } else {
        cache = init();
        localStorage.setItem(key, JSON.stringify(cache));
      }
    } catch {
      cache = init();
    }

    return cache!;
  };

  const emit = () => listeners.forEach((l) => l());

  const write = (next: T) => {
    cache = next;

    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      throw new Error("Browser storage is full.");
    }

    emit();
  };

  const subscribe = (l: () => void) => {
    listeners.add(l);

    const onStorage = (e: StorageEvent) => {
      if (e.key === key) {
        cache = undefined;
        emit();
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(l);
      window.removeEventListener("storage", onStorage);
    };
  };

  return {
    get: read,
    set: write,

    update(fn: (draft: T) => void) {
      const next = structuredClone(read());
      fn(next);
      write(next);
      return next;
    },

    reset() {
      localStorage.removeItem(key);
      cache = undefined;
      emit();
    },

    subscribe,
  };
}

export const dbStore = createLocalStore<DB>("verdict.db", () => seedDB());

export const draftStore = createLocalStore<Draft>(
  "verdict.draft",
  () => ({})
);

export const adminStore = createLocalStore<boolean>(
  "verdict.admin",
  () => false
);

if (typeof window !== "undefined") {
  try {
    const d = dbStore.get();

    if (d.version !== DB_VERSION) {
      dbStore.reset();
    }
  } catch {}
}

type Store<T> = ReturnType<typeof createLocalStore<T>>;

function useStore<T>(store: Store<T>): T | undefined {
  return useSyncExternalStore(
    store.subscribe,
    store.get,
    () => undefined
  );
}

export const useDB = () => useStore(dbStore);
export const useDraft = () => useStore(draftStore);
export const useAdmin = () => useStore(adminStore);