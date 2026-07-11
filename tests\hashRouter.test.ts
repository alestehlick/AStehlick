import { describe, expect, it } from "vitest";
import { parseHash, readerHash } from "../src/routing/hashRouter";

describe("hash router", () => {
  it("parses the library route", () => {
    expect(parseHash("#/library")).toEqual({ type: "library" });
  });

  it("parses a direct reader route", () => {
    expect(parseHash("#/book/ugetsu/page/001/layer/06")).toEqual({
      type: "reader",
      bookId: "ugetsu",
      pageId: "001",
      layer: 6,
    });
  });

  it("rejects malformed routes", () => {
    expect(parseHash("#/book/ugetsu/page/1/layer/1")).toEqual({
      type: "invalid",
    });
  });

  it("formats a padded reader route", () => {
    expect(readerHash("ugetsu", "001", 2)).toBe(
      "#/book/ugetsu/page/001/layer/02",
    );
  });
});
