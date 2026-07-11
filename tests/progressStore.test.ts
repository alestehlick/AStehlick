import { describe, expect, it } from "vitest";
import { createProgressStore, PROGRESS_KEY } from "../src/state/progressStore";
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

describe("progress store", () => {
  it("records the highest layer and final-layer completion", () => {
    const storage = new MemoryStorage();
    const store = createProgressStore(storage);
    store.recordVisit("ugetsu", "001", 4, 6);
    store.recordVisit("ugetsu", "001", 2, 6);
    const completed = store.recordVisit("ugetsu", "001", 6, 6);

    expect(completed.highestLayerByPage["ugetsu:001"]).toBe(6);
    expect(completed.finalLayerReached["ugetsu:001"]).toBe(true);
    expect(completed.last?.layer).toBe(6);
  });

  it("recovers from malformed storage", () => {
    const storage = new MemoryStorage();
    storage.setItem(PROGRESS_KEY, "{not-json");
    expect(createProgressStore(storage).load().last).toBeNull();
  });

  it("resets stored progress", () => {
    const storage = new MemoryStorage();
    const store = createProgressStore(storage);
    store.recordVisit("ugetsu", "001", 3, 6);
    expect(store.reset().highestLayerByPage).toEqual({});
    expect(storage.getItem(PROGRESS_KEY)).toBeNull();
  });
});
