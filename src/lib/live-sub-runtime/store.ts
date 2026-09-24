"use client";

import { useSyncExternalStore } from "react";
import { isFlagEnabled, parseRuntimeConfig } from "./parse";
import {
  APP_KEY,
  RUNTIME_BASE_URL,
  RUNTIME_ENV,
  RUNTIME_STORAGE_KEY,
} from "./env";
import type { RuntimeConfig, RuntimeMaintenance, RuntimeNotice } from "./types";

let state: RuntimeConfig | null = null;
let started = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function readCache(): RuntimeConfig | null {
  try {
    const raw = localStorage.getItem(RUNTIME_STORAGE_KEY);
    if (!raw) return null;
    return parseRuntimeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeCache(payload: unknown) {
  try {
    localStorage.setItem(RUNTIME_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* Storage privacy settings must not affect the page. */
  }
}

function buildUrl() {
  const base = RUNTIME_BASE_URL.endsWith("/")
    ? RUNTIME_BASE_URL
    : `${RUNTIME_BASE_URL}/`;
  const url = new URL(`api/runtime/v1/apps/${APP_KEY}/config`, base);
  url.searchParams.set("env", RUNTIME_ENV);
  url.searchParams.set("platform", "web");
  url.searchParams.set("appVersion", "web");
  return url;
}

/** HQ is the sole source; a failed or slow fetch keeps the last cached value, if any. */
async function load() {
  const cached = readCache();
  if (cached) {
    state = cached;
    notify();
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(buildUrl(), { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return;
    const payload = await response.json();
    state = parseRuntimeConfig(payload);
    writeCache(payload);
    notify();
  } catch {
    /* Network/HQ failure: state stays whatever the cache produced above, if anything. */
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    void load();
  }
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return null;
}

export function useRuntimeConfig(): RuntimeConfig | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useRuntimeFlag(key: string, defaultValue: boolean): boolean {
  const config = useRuntimeConfig();
  return isFlagEnabled(config, key, defaultValue);
}

export function useRuntimeNotices(): RuntimeNotice[] {
  const config = useRuntimeConfig();
  return config?.notices ?? [];
}

export function useRuntimeMaintenance(): RuntimeMaintenance | null {
  const config = useRuntimeConfig();
  return config?.maintenance ?? null;
}
