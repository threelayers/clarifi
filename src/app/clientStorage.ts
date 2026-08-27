import { DEFAULT_MODEL } from "./appDefaults";

const canUseStorage = () => typeof window !== "undefined" && Boolean(window.localStorage);

export const storageKeys = {
  model: "clarifi.model",
  policyFile: "clarifi.policyFile",
  clientNotes: "clarifi.clientNotes",
  sessionTranscript: "clarifi.sessionTranscript",
  handwrittenNoteImage: "clarifi.handwrittenNoteImage",
  coverageIds: "clarifi.coverageIds",
  decisionIds: "clarifi.decisionIds"
} as const;

export function readString(key: string, fallback = "") {
  if (!canUseStorage()) return fallback;
  return window.localStorage.getItem(key) || fallback;
}

export function writeString(key: string, value: string) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, value);
}

export function removeValue(key: string) {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(key);
}

export function readStoredIds(key: string, fallback: string[]) {
  try {
    const parsed = JSON.parse(readString(key, "[]"));
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredIds(key: string, ids: string[]) {
  writeString(key, JSON.stringify(ids));
}

export function savedModelOrDefault() {
  const saved = readString(storageKeys.model);
  return saved.startsWith("gemini-") ? DEFAULT_MODEL : saved || DEFAULT_MODEL;
}
