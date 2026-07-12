import {
  browserStorage,
  readStoredJson,
  type StorageLike,
  writeStoredJson,
} from "../utilities/storage";

const PREFERENCES_KEY = "moonlight-reader.preferences.v1";

export type ReadingScale = "standard" | "large" | "extra-large";

interface Preferences {
  version: 1;
  readingScale: ReadingScale | null;
}

const defaults: Preferences = {
  version: 1,
  readingScale: null,
};

function isReadingScale(value: unknown): value is ReadingScale {
  return value === "standard" || value === "large" || value === "extra-large";
}

export function createPreferencesStore(
  storage: StorageLike | null = browserStorage(),
) {
  const load = (): Preferences => {
    const value = readStoredJson(storage, PREFERENCES_KEY);
    if (!value || typeof value !== "object") return defaults;
    const candidate = value as { version?: unknown; readingScale?: unknown };
    if (candidate.version !== 1) return defaults;
    return {
      version: 1,
      readingScale: isReadingScale(candidate.readingScale)
        ? candidate.readingScale
        : null,
    };
  };

  const setReadingScale = (readingScale: ReadingScale): void => {
    writeStoredJson(storage, PREFERENCES_KEY, {
      ...load(),
      readingScale,
    });
  };

  return { load, setReadingScale };
}
