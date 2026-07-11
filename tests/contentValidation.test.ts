import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateContent } from "../scripts/validate-content";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("content validation", () => {
  it("accepts the committed content library", () => {
    const result = validateContent(resolve(process.cwd(), "public", "content"));
    expect(result.errors).toEqual([]);
    expect(result.filesChecked).toBeGreaterThanOrEqual(12);
  });

  it("detects a missing note reference", () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), "moonlight-reader-"));
    temporaryDirectories.push(temporaryRoot);
    const contentRoot = resolve(temporaryRoot, "content");
    cpSync(resolve(process.cwd(), "public", "content"), contentRoot, {
      recursive: true,
    });

    const layerPath = resolve(
      contentRoot,
      "books",
      "ugetsu",
      "pages",
      "001",
      "layers",
      "02.json",
    );
    const layer = JSON.parse(readFileSync(layerPath, "utf8")) as {
      blocks: Array<{ content?: Array<{ noteIds?: string[] }> }>;
    };
    const annotated = layer.blocks
      .flatMap((block) => block.content ?? [])
      .find((item) => item.noteIds);
    annotated!.noteIds = ["note-does-not-exist"];
    writeFileSync(layerPath, `${JSON.stringify(layer, null, 2)}\n`, "utf8");

    const result = validateContent(contentRoot);
    expect(
      result.errors.some((error) => error.includes("note-does-not-exist")),
    ).toBe(true);
  });

  it("rejects audio segments longer than one sentence", () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), "moonlight-reader-"));
    temporaryDirectories.push(temporaryRoot);
    const contentRoot = resolve(temporaryRoot, "content");
    cpSync(resolve(process.cwd(), "public", "content"), contentRoot, {
      recursive: true,
    });

    const layerPath = resolve(
      contentRoot,
      "books",
      "ugetsu",
      "pages",
      "001",
      "layers",
      "06.json",
    );
    const layer = JSON.parse(readFileSync(layerPath, "utf8")) as {
      blocks: Array<{ audioSegments?: Array<{ text: string }> }>;
    };
    const segment = layer.blocks
      .flatMap((block) => block.audioSegments ?? [])
      .at(0)!;
    segment.text = "一文です。二文です。";
    writeFileSync(layerPath, `${JSON.stringify(layer, null, 2)}\n`, "utf8");

    const result = validateContent(contentRoot);
    expect(
      result.errors.some((error) => error.includes("longer than one sentence")),
    ).toBe(true);
  });
  it("rejects a layer that introduces more than three new items", () => {
    const temporaryRoot = mkdtempSync(resolve(tmpdir(), "moonlight-reader-"));
    temporaryDirectories.push(temporaryRoot);
    const contentRoot = resolve(temporaryRoot, "content");
    cpSync(resolve(process.cwd(), "public", "content"), contentRoot, {
      recursive: true,
    });

    const layerPath = resolve(
      contentRoot,
      "books",
      "ugetsu",
      "pages",
      "001",
      "layers",
      "02.json",
    );
    const layer = JSON.parse(readFileSync(layerPath, "utf8")) as {
      blocks: Array<{
        type: string;
        content?: Array<Record<string, unknown>>;
      }>;
    };
    const paragraph = layer.blocks.find(
      (block) => block.type === "paragraph" && block.content,
    )!;
    paragraph.content!.push({
      type: "annotated",
      text: "勝四郎",
      reading: "かつしらう",
      language: "ja",
      noteIds: ["note-katsushiro"],
    });
    writeFileSync(layerPath, `${JSON.stringify(layer, null, 2)}\n`, "utf8");

    const result = validateContent(contentRoot);
    expect(
      result.errors.some((error) =>
        error.includes("a layer may introduce at most 3"),
      ),
    ).toBe(true);
  });
});
