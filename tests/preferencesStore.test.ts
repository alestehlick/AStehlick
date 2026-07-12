import { describe, expect, it } from "vitest";
import { createPreferencesStore } from "../src/state/preferencesStore";
import type { StorageLike } from "../src/utilities/storage";

class MemoryStorage implements StorageLike {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

describe("preferences store", () => {
  it("persists the reading scale", () => {
    const store = createPreferencesStore(new MemoryStorage());
    store.setReadingScale("extra-large");

    expect(store.load()).toEqual({
      version: 1,
      readingScale: "extra-large",
    });
  });

  it("accepts older preference records that still contain commentary state", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "moonlight-reader.preferences.v1",
      JSON.stringify({ version: 1, commentaryOpen: true }),
    );

    expect(createPreferencesStore(storage).load()).toEqual({
      version: 1,
      readingScale: null,
    });
  });
});
