import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
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

interface AivisStyle {
  id: number;
  name: string;
  type?: string;
}

interface AivisSpeaker {
  name: string;
  speaker_uuid: string;
  styles: AivisStyle[];
}

interface SelectedVoice {
  speakerName: string;
  speakerUuid: string;
  styleName: string;
  styleId: number;
}

interface AudioManifestEntry extends AudioTask, SelectedVoice {
  hash: string;
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
const engineUrl = (
  process.env.AIVIS_ENGINE_URL ?? "http://127.0.0.1:10101"
).replace(/\/$/, "");
const preferredSpeaker = process.env.AIVIS_SPEAKER_NAME ?? "阿井田 茂";
const preferredSpeakerUuid =
  process.env.AIVIS_SPEAKER_UUID ?? "561e4e59-3bc9-4726-9028-44a3c12a6f1d";
const preferredStyle = process.env.AIVIS_STYLE_NAME ?? "Calm";
const styleOverride = process.env.AIVIS_STYLE_ID
  ? Number(process.env.AIVIS_STYLE_ID)
  : null;
const ffmpeg = process.env.FFMPEG_PATH ?? "ffmpeg";

const voiceSettings = {
  speedScale: 0.88,
  intonationScale: 0.72,
  tempoDynamicsScale: 0.78,
  volumeScale: 1.0,
  prePhonemeLength: 0.04,
  postPhonemeLength: 0.22,
  outputSamplingRate: 44100,
  outputStereo: false,
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
        const layerFile = readJson(
          resolve(layersDirectory, `${String(layer).padStart(2, "0")}.json`),
        );
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
      generatedBy: "AivisSpeech local engine",
      voice: "阿井田 茂 / Calm",
      entries: {},
    };
  }
  return JSON.parse(readFileSync(manifestPath, "utf8")) as AudioManifest;
}

function normalize(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, "").toLocaleLowerCase();
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${engineUrl}${path}`, {
    signal: AbortSignal.timeout(120_000),
    ...init,
  });
  if (!response.ok) {
    throw new Error(
      `AivisSpeech ${path} failed (${response.status}): ${await response.text()}`,
    );
  }
  return response;
}

async function selectVoice(): Promise<SelectedVoice> {
  let speakers: AivisSpeaker[];
  try {
    speakers = (await (await request("/speakers")).json()) as AivisSpeaker[];
  } catch (error) {
    throw new Error(
      `The local AivisSpeech engine is unavailable at ${engineUrl}. ${String(error)}`,
    );
  }
  const preferred = normalize(preferredSpeaker);
  const speaker =
    speakers.find(
      (candidate) =>
        candidate.speaker_uuid.toLocaleLowerCase() ===
        preferredSpeakerUuid.toLocaleLowerCase(),
    ) ??
    speakers.find((candidate) => {
      const name = normalize(candidate.name);
      return (
        name === preferred ||
        name.includes(preferred) ||
        preferred.includes(name)
      );
    });
  if (!speaker) {
    throw new Error(
      `Voice ${preferredSpeakerUuid} ("${preferredSpeaker}") is not installed. Available voices: ${speakers.map((item) => `${item.name} [${item.speaker_uuid}]`).join(", ") || "none"}.`,
    );
  }
  const spokenStyles = speaker.styles.filter(
    (style) => !style.type || style.type === "talk",
  );
  const style =
    (styleOverride === null
      ? spokenStyles.find(
          (candidate) =>
            normalize(candidate.name) === normalize(preferredStyle),
        )
      : spokenStyles.find((candidate) => candidate.id === styleOverride)) ??
    spokenStyles.find((candidate) =>
      /calm|落ち着|穏やか/i.test(candidate.name),
    );
  if (!style) {
    throw new Error(
      `Style "${preferredStyle}" was not found for ${speaker.name}. Available styles: ${spokenStyles.map((item) => `${item.name} (${item.id})`).join(", ")}.`,
    );
  }
  return {
    speakerName: speaker.name,
    speakerUuid: speaker.speaker_uuid,
    styleName: style.name,
    styleId: style.id,
  };
}

function taskKey(task: AudioTask): string {
  return `${task.bookId}:${task.pageId}:${task.layer}:${task.id}`;
}

function taskHash(task: AudioTask, voice: SelectedVoice): string {
  return createHash("sha256")
    .update(
      JSON.stringify({ task, voice, voiceSettings, format: "mp3-128k-v1" }),
    )
    .digest("hex");
}

async function synthesize(
  task: AudioTask,
  voice: SelectedVoice,
): Promise<Uint8Array> {
  const parameters = new URLSearchParams({
    text: task.text,
    speaker: String(voice.styleId),
  });
  const query = (await (
    await request(`/audio_query?${parameters}`, { method: "POST" })
  ).json()) as JsonObject;
  Object.assign(query, voiceSettings);
  const response = await request(`/synthesis?speaker=${voice.styleId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(query),
  });
  return new Uint8Array(await response.arrayBuffer());
}

function encodeMp3(wav: Uint8Array, destination: string): void {
  const temporary = `${destination}.tmp.mp3`;
  const result = spawnSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      "pipe:0",
      "-map_metadata",
      "-1",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "128k",
      temporary,
    ],
    { input: wav, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  if (result.status !== 0) {
    rmSync(temporary, { force: true });
    throw new Error(
      `FFmpeg failed. Verify FFMPEG_PATH. ${result.stderr || result.error || ""}`,
    );
  }
  renameSync(temporary, destination);
}

async function main(): Promise<void> {
  const tasks = collectTasks();
  const voice = await selectVoice();
  console.log(
    `Using local AivisSpeech voice: ${voice.speakerName} / ${voice.styleName} (style ${voice.styleId}).`,
  );
  if (process.argv.includes("--check")) return;
  mkdirSync(audioRoot, { recursive: true });
  const previous = loadManifest();
  const next: AudioManifest = {
    formatVersion: 1,
    generatedBy: "AivisSpeech local engine",
    voice: `${voice.speakerName} / ${voice.styleName}`,
    entries: {},
  };
  let generated = 0;
  for (const task of tasks) {
    const key = taskKey(task);
    const hash = taskHash(task, voice);
    const destination = resolve(audioRoot, task.relativePath);
    const old = previous.entries[key];
    if (old?.hash === hash && existsSync(destination)) {
      next.entries[key] = old;
      continue;
    }
    mkdirSync(dirname(destination), { recursive: true });
    encodeMp3(await synthesize(task, voice), destination);
    next.entries[key] = { ...task, hash, ...voice };
    generated += 1;
    console.log(`Generated ${generated}: ${task.relativePath}`);
  }
  for (const [key, entry] of Object.entries(previous.entries)) {
    if (next.entries[key]) continue;
    rmSync(resolve(audioRoot, entry.relativePath), { force: true });
  }
  writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(
    `Audio generation complete: ${generated} generated, ${tasks.length - generated} unchanged.`,
  );
}

await main();
