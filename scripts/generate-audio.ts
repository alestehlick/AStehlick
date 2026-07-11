import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";

type JsonObject = Record<string, unknown>;

interface AudioTask {
  id: string;
  text: string;
  bookId: string;
  pageId: string;
  layer: number;
  relativePath: string;
}

interface AudioManifestEntry extends AudioTask {
  hash: string;
  modelUuid: string;
  speakerUuid: string;
  styleId: number;
}

interface AudioManifest {
  formatVersion: 1;
  generatedBy: string;
  voice: string;
  entries: Record<string, AudioManifestEntry>;
}

const projectRoot = process.cwd();
const contentRoot = resolve(projectRoot, "public", "content");
const audioRoot = resolve(projectRoot, "public", "assets", "audio");
const manifestPath = resolve(audioRoot, "manifest.json");
const apiKey = process.env.AIVIS_API_KEY?.trim() ?? "";
const endpoint =
  process.env.AIVIS_API_ENDPOINT ??
  "https://api.aivis-project.com/v1/tts/synthesize";
const modelUuid =
  process.env.AIVIS_MODEL_UUID ?? "47e53151-a378-46f3-abee-ce13aa07feb1";
const speakerUuid =
  process.env.AIVIS_SPEAKER_UUID ?? "561e4e59-3bc9-4726-9028-44a3c12a6f1d";
const styleId = Number(process.env.AIVIS_STYLE_ID ?? "1");
const requestInterval = Number(process.env.AIVIS_REQUEST_INTERVAL_MS ?? "6500");

const voiceSettings = {
  speaking_rate: 0.88,
  emotional_intensity: 0.7,
  tempo_dynamics: 0.75,
  volume: 1.0,
  leading_silence_seconds: 0.04,
  trailing_silence_seconds: 0.22,
  line_break_silence_seconds: 0.35,
  use_volume_normalizer: true,
  output_format: "mp3",
};

function readJson(path: string): JsonObject {
  return JSON.parse(readFileSync(path, "utf8")) as JsonObject;
}

function array(value: unknown): JsonObject[] {
  return Array.isArray(value) ? (value as JsonObject[]) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function collectTasks(): AudioTask[] {
  const tasks: AudioTask[] = [];
  const library = readJson(resolve(contentRoot, "library.json"));

  for (const libraryBook of array(library.books)) {
    const bookPath = resolve(contentRoot, text(libraryBook.path));
    const book = readJson(bookPath);
    const bookDirectory = dirname(bookPath);
    const bookId = text(book.id);
    const manifest = readJson(resolve(bookDirectory, text(book.manifest)));

    for (const pageEntry of array(manifest.pages)) {
      const pagePath = resolve(bookDirectory, text(pageEntry.path));
      const page = readJson(pagePath);
      const pageId = text(page.id);
      const layersDirectory = resolve(dirname(pagePath), text(page.layersPath));

      for (const layerEntry of array(manifest.layers)) {
        const layer = Number(layerEntry.number);
        const layerPath = resolve(
          layersDirectory,
          `${String(layer).padStart(2, "0")}.json`,
        );
        const layerFile = readJson(layerPath);

        for (const block of array(layerFile.blocks)) {
          for (const segment of array(block.audioSegments)) {
            const id = text(segment.id);
            tasks.push({
              id,
              text: text(segment.text),
              bookId,
              pageId,
              layer,
              relativePath: `${bookId}/${pageId}/layer-${String(layer).padStart(2, "0")}/${id}.mp3`,
            });
          }
        }
      }
    }
  }

  return tasks;
}

function loadManifest(): AudioManifest {
  if (!existsSync(manifestPath)) {
    return {
      formatVersion: 1,
      generatedBy: "Aivis Cloud API",
      voice: "阿井田 茂 / Calm",
      entries: {},
    };
  }
  return JSON.parse(readFileSync(manifestPath, "utf8")) as AudioManifest;
}

function taskKey(task: AudioTask): string {
  return `${task.bookId}:${task.pageId}:${task.layer}:${task.id}`;
}

function taskHash(task: AudioTask): string {
  return createHash("sha256")
    .update(
      JSON.stringify({ task, modelUuid, speakerUuid, styleId, voiceSettings }),
    )
    .digest("hex");
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds));
}

async function synthesize(task: AudioTask): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_uuid: modelUuid,
        speaker_uuid: speakerUuid,
        style_id: styleId,
        text: task.text,
        use_ssml: false,
        ...voiceSettings,
      }),
    });

    if (response.ok) return new Uint8Array(await response.arrayBuffer());
    const details = await response.text();
    if (response.status !== 429 || attempt === 3) {
      throw new Error(
        `Aivis synthesis failed for ${task.id} (${response.status}): ${details}`,
      );
    }
    const retryAfter = Number(response.headers.get("retry-after") ?? "10");
    await wait(Math.max(1, retryAfter) * 1000);
  }
  throw new Error(`Aivis synthesis failed for ${task.id}.`);
}

async function main(): Promise<void> {
  const tasks = collectTasks();
  if (!apiKey) {
    console.log(
      `AIVIS_API_KEY is not configured; ${tasks.length} audio segment(s) await generation.`,
    );
    return;
  }

  mkdirSync(audioRoot, { recursive: true });
  const previous = loadManifest();
  const next: AudioManifest = {
    formatVersion: 1,
    generatedBy: "Aivis Cloud API",
    voice: "阿井田 茂 / Calm",
    entries: {},
  };
  let generated = 0;

  for (const task of tasks) {
    const key = taskKey(task);
    const hash = taskHash(task);
    const destination = resolve(audioRoot, task.relativePath);
    const old = previous.entries[key];
    if (old?.hash === hash && existsSync(destination)) {
      next.entries[key] = old;
      continue;
    }

    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, await synthesize(task));
    next.entries[key] = { ...task, hash, modelUuid, speakerUuid, styleId };
    generated += 1;
    if (requestInterval > 0) await wait(requestInterval);
  }

  for (const [key, entry] of Object.entries(previous.entries)) {
    if (next.entries[key]) continue;
    const obsolete = resolve(audioRoot, entry.relativePath);
    if (existsSync(obsolete)) rmSync(obsolete);
  }

  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(
    `Audio generation complete: ${generated} generated, ${tasks.length - generated} unchanged.`,
  );
}

await main();
