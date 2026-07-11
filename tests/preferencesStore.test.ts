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
  it("persists reading scale without losing commentary state", () => {
    const store = createPreferencesStore(new MemoryStorage());
    store.setCommentaryOpen(true);
    store.setReadingScale("extra-large");

    expect(store.load()).toMatchObject({
      commentaryOpen: true,
      readingScale: "extra-large",
    });
  });

  it("migrates existing preferences without a reading scale", () => {
    const storage = new MemoryStorage();
    storage.setItem(
      "moonlight-reader.preferences.v1",
      JSON.stringify({ version: 1, commentaryOpen: true }),
    );

    expect(createPreferencesStore(storage).load()).toMatchObject({
      commentaryOpen: true,
      readingScale: null,
    });
  });
});
