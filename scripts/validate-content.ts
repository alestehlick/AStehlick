import Ajv2020, { type ValidateFunction } from "ajv/dist/2020.js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type JsonObject = Record<string, unknown>;

export interface ValidationResult {
  errors: string[];
  filesChecked: number;
}

const schemaDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "schemas",
);
const schemaNames = [
  "library",
  "book",
  "manifest",
  "page",
  "layer",
  "notes",
] as const;

function readJson(path: string): JsonObject {
  return JSON.parse(readFileSync(path, "utf8")) as JsonObject;
}

function loadValidators(): Record<
  (typeof schemaNames)[number],
  ValidateFunction
> {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  return Object.fromEntries(
    schemaNames.map((name) => {
      const schema = readJson(resolve(schemaDirectory, `${name}.schema.json`));
      return [name, ajv.compile(schema)];
    }),
  ) as Record<(typeof schemaNames)[number], ValidateFunction>;
}

function formatSchemaErrors(
  path: string,
  validator: ValidateFunction,
): string[] {
  return (validator.errors ?? []).map(
    (error) =>
      `${path}${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
  );
}

function resolveInside(base: string, target: string): string {
  if (isAbsolute(target)) {
    throw new Error(`Absolute content path is not allowed: ${target}`);
  }
  const resolved = resolve(base, target);
  const difference = relative(base, resolved);
  if (difference.startsWith("..") || isAbsolute(difference)) {
    throw new Error(`Content path escapes its manifest directory: ${target}`);
  }
  return resolved;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }
  return value;
}

function requireArray(value: unknown, label: string): JsonObject[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }
  return value as JsonObject[];
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  return [
    ...new Set(
      values.filter((value) => (seen.has(value) ? true : !seen.add(value))),
    ),
  ];
}

function annotatedNoteIds(layer: JsonObject): string[] {
  const ids: string[] = [];
  for (const block of requireArray(layer.blocks, "blocks")) {
    if (!Array.isArray(block.content)) continue;
    for (const inline of block.content as JsonObject[]) {
      if (inline.type === "annotated" && Array.isArray(inline.noteIds)) {
        ids.push(
          ...inline.noteIds.filter(
            (id): id is string => typeof id === "string",
          ),
        );
      }
    }
  }
  return ids;
}

function audioSegmentErrors(layer: JsonObject, layerPath: string): string[] {
  const errors: string[] = [];
  const ids: string[] = [];

  for (const block of requireArray(layer.blocks, "blocks")) {
    if (!Array.isArray(block.audioSegments)) continue;
    const contentLength = Array.isArray(block.content)
      ? block.content.length
      : 0;
    let previousEnd = -1;

    for (const segment of block.audioSegments as JsonObject[]) {
      const id = requireString(segment.id, "audioSegment.id");
      const text = requireString(segment.text, "audioSegment.text");
      const start = Number(segment.start);
      const end = Number(segment.end);
      ids.push(id);

      if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
        errors.push(`${layerPath}: audio segment ${id} has an invalid range.`);
      } else if (start <= previousEnd || end >= contentLength) {
        errors.push(
          `${layerPath}: audio segment ${id} overlaps or exceeds its paragraph.`,
        );
      }
      previousEnd = end;

      if (
        !/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text)
      ) {
        errors.push(
          `${layerPath}: audio segment ${id} does not contain Japanese text.`,
        );
      }
      if ((text.match(/[。！？!?]/g) ?? []).length > 1) {
        errors.push(
          `${layerPath}: audio segment ${id} is longer than one sentence.`,
        );
      }
    }
  }

  errors.push(
    ...findDuplicates(ids).map(
      (id) => `${layerPath}: duplicate audio segment ${id}.`,
    ),
  );
  return errors;
}

export function validateContent(
  contentRoot = resolve(process.cwd(), "public", "content"),
): ValidationResult {
  const validators = loadValidators();
  const errors: string[] = [];
  let filesChecked = 0;

  const validateFile = (
    path: string,
    schema: keyof typeof validators,
  ): JsonObject | null => {
    if (!existsSync(path)) {
      errors.push(`Missing file: ${path}`);
      return null;
    }
    filesChecked += 1;
    try {
      const data = readJson(path);
      if (!validators[schema](data)) {
        errors.push(...formatSchemaErrors(path, validators[schema]));
      }
      return data;
    } catch (error) {
      errors.push(
        `${path}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  };

  const libraryPath = resolve(contentRoot, "library.json");
  const library = validateFile(libraryPath, "library");
  if (!library) return { errors, filesChecked };

  try {
    const books = requireArray(library.books, "library.books");
    const duplicateBookIds = findDuplicates(
      books.map((book) => requireString(book.id, "book.id")),
    );
    errors.push(...duplicateBookIds.map((id) => `Duplicate book id: ${id}`));

    for (const libraryBook of books) {
      const bookPath = resolveInside(
        contentRoot,
        requireString(libraryBook.path, "book.path"),
      );
      const book = validateFile(bookPath, "book");
      if (!book) continue;
      const bookId = requireString(book.id, "book.id");
      if (bookId !== libraryBook.id)
        errors.push(`${bookPath}: id does not match library entry.`);

      const bookDirectory = dirname(bookPath);
      const manifestPath = resolveInside(
        bookDirectory,
        requireString(book.manifest, "book.manifest"),
      );
      const manifest = validateFile(manifestPath, "manifest");
      if (!manifest) continue;
      if (manifest.bookId !== bookId)
        errors.push(`${manifestPath}: bookId does not match book.`);

      const layers = requireArray(manifest.layers, "manifest.layers");
      const layerNumbers = layers.map((layer) => String(layer.number));
      errors.push(
        ...findDuplicates(layerNumbers).map(
          (id) => `${manifestPath}: duplicate layer ${id}.`,
        ),
      );

      const pages = requireArray(manifest.pages, "manifest.pages");
      const pageIds = pages.map((page) => requireString(page.id, "page.id"));
      errors.push(
        ...findDuplicates(pageIds).map(
          (id) => `${manifestPath}: duplicate page ${id}.`,
        ),
      );

      for (const manifestPage of pages) {
        const pagePath = resolveInside(
          bookDirectory,
          requireString(manifestPage.path, "page.path"),
        );
        const page = validateFile(pagePath, "page");
        if (!page) continue;
        const pageId = requireString(page.id, "page.id");
        if (pageId !== manifestPage.id)
          errors.push(`${pagePath}: id does not match manifest entry.`);
        if (page.bookId !== bookId)
          errors.push(`${pagePath}: bookId does not match book.`);

        const pageDirectory = dirname(pagePath);
        const notesPath = resolveInside(
          pageDirectory,
          requireString(page.notesPath, "page.notesPath"),
        );
        const notes = validateFile(notesPath, "notes");
        const noteList = notes ? requireArray(notes.notes, "notes.notes") : [];
        const noteIds = noteList.map((note) =>
          requireString(note.id, "note.id"),
        );
        errors.push(
          ...findDuplicates(noteIds).map(
            (id) => `${notesPath}: duplicate note ${id}.`,
          ),
        );
        const knownNotes = new Set(noteIds);

        const commentaryPath = resolveInside(
          pageDirectory,
          requireString(page.commentaryPath, "page.commentaryPath"),
        );
        if (!existsSync(commentaryPath)) {
          errors.push(`Missing file: ${commentaryPath}`);
        } else {
          filesChecked += 1;
          const commentary = readFileSync(commentaryPath, "utf8");
          if (/<\/?(?:script|iframe|object|embed)\b/i.test(commentary)) {
            errors.push(`${commentaryPath}: unsafe HTML is not allowed.`);
          }
        }

        const layersDirectory = resolveInside(
          pageDirectory,
          requireString(page.layersPath, "page.layersPath"),
        );
        for (const layerEntry of layers) {
          const layerNumber = Number(layerEntry.number);
          const layerPath = resolve(
            layersDirectory,
            `${String(layerNumber).padStart(2, "0")}.json`,
          );
          const layer = validateFile(layerPath, "layer");
          if (!layer) continue;
          if (layer.pageId !== pageId)
            errors.push(`${layerPath}: pageId does not match page.`);
          if (layer.layer !== layerNumber)
            errors.push(`${layerPath}: layer number does not match filename.`);
          for (const noteId of annotatedNoteIds(layer)) {
            if (!knownNotes.has(noteId))
              errors.push(`${layerPath}: missing referenced note ${noteId}.`);
          }
          errors.push(...audioSegmentErrors(layer, layerPath));
        }
      }
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  return { errors, filesChecked };
}

const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  const result = validateContent();
  if (result.errors.length > 0) {
    console.error(
      `Content validation failed with ${result.errors.length} error(s):`,
    );
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(
      `Content validation passed (${result.filesChecked} files checked).`,
    );
  }
}
