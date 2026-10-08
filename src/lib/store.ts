"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "./supabase/admin";
import { emptyDB, loadAppDB } from "./remote";
import type { DB, Draft, Session } from "./types";

/* ───────────────────────── server data (Supabase) ───────────────────────── */

let snapshot: DB | undefined;
let started = false;
let gen = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Re-query Supabase and notify every `useDB()` consumer. Call after any mutation. */
export async function refreshDB(): Promise<void> {
  const my = ++gen;
  try {
    const next = await loadAppDB();
    if (my === gen) {
      snapshot = next;
      emit();
    }
  } catch (e) {
    console.error("[db] load failed:", e);
    if (my === gen && !snapshot) {
      snapshot = emptyDB(); // don't leave the UI on an endless loader
      emit();
    }
  }
}

/** Non-hook access for api.ts (loads first if nothing is cached yet). */
export async function currentDB(): Promise<DB> {
  if (!snapshot) await refreshDB();
  return snapshot!;
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  refreshDB();
  supabase.auth.onAuthStateChange((event) => {
    if (event !== "INITIAL_SESSION") refreshDB();
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  start();
  return () => {
    listeners.delete(l);
  };
}

export const useDB = (): DB | undefined =>
  useSyncExternalStore(subscribe, () => snapshot, () => undefined);

/* ───────────────────────── auth hooks ───────────────────────── */

const toSession = (u: any): Session | null =>
  u?.email ? { email: u.email, name: u.user_metadata?.full_name || u.user_metadata?.name || "" } : null;

/** undefined = still checking, null = signed out. */
export function useSession(): Session | null | undefined {
  const [s, setS] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    let on = true;
    supabase.auth.getUser().then(({ data }) => on && setS(toSession(data.user)));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => on && setS(toSession(session?.user)));
    return () => {
      on = false;
      subscription.unsubscribe();
    };
  }, []);
  return s;
}

/** undefined = still checking. Admin = profiles.role === 'admin' (enforced by RLS too). */
export function useAdmin(): boolean | undefined {
  const [admin, setAdmin] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let on = true;
    const check = () => isAdmin().then((v) => on && setAdmin(v));
    check();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => check());
    return () => {
      on = false;
      subscription.unsubscribe();
    };
  }, []);
  return admin;
}

/* ───────────────────────── wizard draft (stays in the browser) ───────────────────────── */
// The in-progress "choose battle → rank roles" selection is per-device UI state,
// not data worth a round-trip, so it intentionally remains in localStorage.

function createLocalStore<T>(key: string, init: () => T) {
  let cache: T | undefined;
  const subs = new Set<() => void>();

  const read = (): T => {
    if (cache !== undefined) return cache;
    try {
      const raw = localStorage.getItem(key);
      cache = raw ? (JSON.parse(raw) as T) : init();
    } catch {
      cache = init();
    }
    return cache!;
  };
  const write = (next: T) => {
    cache = next;
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
    subs.forEach((l) => l());
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
      try {
        localStorage.removeItem(key);
      } catch {}
      cache = undefined;
      subs.forEach((l) => l());
    },
    subscribe(l: () => void) {
      subs.add(l);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          cache = undefined;
          subs.forEach((s) => s());
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        subs.delete(l);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}

export const draftStore = createLocalStore<Draft>("verdict.draft", () => ({}));
export const useDraft = (): Draft | undefined =>
  useSyncExternalStore(draftStore.subscribe, draftStore.get, () => undefined);
