export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function browserStorage(): StorageLike | null {
  try {
    const storage = window.localStorage;
    const probe = "__moonlight_reader_probe__";
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function readStoredJson(
  storage: StorageLike | null,
  key: string,
): unknown {
  if (!storage) return null;
  try {
    const stored = storage.getItem(key);
    return stored ? (JSON.parse(stored) as unknown) : null;
  } catch {
    return null;
  }
}

export function writeStoredJson(
  storage: StorageLike | null,
  key: string,
  value: unknown,
): void {
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Reading remains available even when a browser blocks writes.
  }
}

export function removeStoredValue(
  storage: StorageLike | null,
  key: string,
): void {
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Reset is best-effort in restricted browsing modes.
  }
}
