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
  commentaryOpen: boolean;
  readingScale: ReadingScale | null;
}

const defaults: Preferences = {
  version: 1,
  commentaryOpen: false,
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
    const candidate = value as Partial<Preferences>;
    if (
      candidate.version !== 1 ||
      typeof candidate.commentaryOpen !== "boolean"
    ) {
      return defaults;
    }
    return {
      version: 1,
      commentaryOpen: candidate.commentaryOpen,
      readingScale: isReadingScale(candidate.readingScale)
        ? candidate.readingScale
        : null,
    };
  };

  const setCommentaryOpen = (commentaryOpen: boolean): void => {
    writeStoredJson(storage, PREFERENCES_KEY, {
      ...load(),
      commentaryOpen,
    });
  };

  const setReadingScale = (readingScale: ReadingScale): void => {
    writeStoredJson(storage, PREFERENCES_KEY, {
      ...load(),
      readingScale,
    });
  };

  return { load, setCommentaryOpen, setReadingScale };
}
