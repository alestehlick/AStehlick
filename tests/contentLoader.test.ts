import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createContentLoader,
  ContentLoadError,
} from "../src/content/contentLoader";

const publicDirectory = resolve(process.cwd(), "public");
const fetchFromPublic = (url: string): Promise<string> =>
  readFile(resolve(publicDirectory, url.replace(/^\//, "")), "utf8");

describe("content loader", () => {
  it("loads the complete authored reader bundle", async () => {
    const loader = createContentLoader({
      baseUrl: "/",
      fetchText: fetchFromPublic,
    });
    const bundle = await loader.loadReaderBundle("ugetsu", "001", 9);

    expect(bundle.book.titleJa).toBe("雨月物語");
    expect(bundle.layer.layer).toBe(9);
    expect(bundle.notes.notes.length).toBeGreaterThan(0);
    expect(bundle.notes.notes.length).toBe(24);
  });

  it("reports an absent layer clearly", async () => {
    const loader = createContentLoader({
      baseUrl: "/",
      fetchText: fetchFromPublic,
    });
    await expect(
      loader.loadReaderBundle("ugetsu", "001", 99),
    ).rejects.toBeInstanceOf(ContentLoadError);
  });
});
