import {
  browserStorage,
  readStoredJson,
  type StorageLike,
  writeStoredJson,
} from "../utilities/storage";

const PREFERENCES_KEY = "moonlight-reader.preferences.v1";

interface Preferences {
  version: 1;
  commentaryOpen: boolean;
}

const defaults: Preferences = { version: 1, commentaryOpen: false };

export function createPreferencesStore(
  storage: StorageLike | null = browserStorage(),
) {
  const load = (): Preferences => {
    const value = readStoredJson(storage, PREFERENCES_KEY);
    if (!value || typeof value !== "object") return defaults;
    const candidate = value as Partial<Preferences>;
    return candidate.version === 1 &&
      typeof candidate.commentaryOpen === "boolean"
      ? { version: 1, commentaryOpen: candidate.commentaryOpen }
      : defaults;
  };

  const setCommentaryOpen = (commentaryOpen: boolean): void => {
    writeStoredJson(storage, PREFERENCES_KEY, { version: 1, commentaryOpen });
  };

  return { load, setCommentaryOpen };
}
