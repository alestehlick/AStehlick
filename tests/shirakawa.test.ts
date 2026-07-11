import { describe, expect, it } from "vitest";
import {
  isDictionaryKanji,
  shirakawaEntryUrl,
} from "../src/utilities/shirakawa";

describe("Shirakawa dictionary links", () => {
  it("recognizes kanji without linking kana", () => {
    expect(isDictionaryKanji("月")).toBe(true);
    expect(isDictionaryKanji("の")).toBe(false);
  });

  it("builds the entry URL used by the Shirakawa site", () => {
    expect(shirakawaEntryUrl("月")).toBe(
      "https://alestehlick.github.io/shirakawa-dictionary/entries/%E6%9C%88.html",
    );
  });
});
