import {
  joinContentPath,
  parentContentPath,
  toContentUrl,
} from "./contentPaths";
import type {
  BookFile,
  BookManifest,
  LayerFile,
  LibraryFile,
  NotesFile,
  PageFile,
  ReaderBundle,
} from "./types";

export class ContentLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentLoadError";
  }
}

export interface ContentLoaderOptions {
  baseUrl?: string;
  fetchText?: (url: string) => Promise<string>;
}

async function browserFetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new ContentLoadError(`Could not load ${url} (${response.status}).`);
  }
  return response.text();
}

function parseJson<T>(text: string, url: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ContentLoadError(`Content at ${url} is not valid JSON.`);
  }
}

export function createContentLoader(options: ContentLoaderOptions = {}) {
  const baseUrl = options.baseUrl ?? import.meta.env.BASE_URL;
  const fetchText = options.fetchText ?? browserFetchText;

  const loadText = async (path: string): Promise<string> => {
    const url = toContentUrl(baseUrl, path);
    try {
      return await fetchText(url);
    } catch (error) {
      if (error instanceof ContentLoadError) throw error;
      throw new ContentLoadError(
        `Could not load ${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  const loadJson = async <T>(path: string): Promise<T> =>
    parseJson<T>(await loadText(path), path);

  const loadLibrary = (): Promise<LibraryFile> =>
    loadJson<LibraryFile>("library.json");

  const loadReaderBundle = async (
    bookId: string,
    pageId: string,
    layerNumber: number,
  ): Promise<ReaderBundle> => {
    const library = await loadLibrary();
    const libraryEntry = library.books.find((entry) => entry.id === bookId);
    if (!libraryEntry) throw new ContentLoadError(`Unknown book: ${bookId}.`);

    const bookPath = libraryEntry.path;
    const book = await loadJson<BookFile>(bookPath);
    const bookDirectory = parentContentPath(bookPath);
    const manifestPath = joinContentPath(bookDirectory, book.manifest);
    const manifest = await loadJson<BookManifest>(manifestPath);
    const pageEntry = manifest.pages.find((entry) => entry.id === pageId);
    if (!pageEntry) throw new ContentLoadError(`Unknown page: ${pageId}.`);
    const pagePath = joinContentPath(bookDirectory, pageEntry.path);
    const page = await loadJson<PageFile>(pagePath);
    if (!page.layers.some((entry) => entry.number === layerNumber)) {
      throw new ContentLoadError(`Unknown layer: ${layerNumber}.`);
    }
    const pageDirectory = parentContentPath(pagePath);
    const layerPath = joinContentPath(
      pageDirectory,
      page.layersPath,
      `${String(layerNumber).padStart(2, "0")}.json`,
    );

    const [layer, notes] = await Promise.all([
      loadJson<LayerFile>(layerPath),
      loadJson<NotesFile>(joinContentPath(pageDirectory, page.notesPath)),
    ]);

    return { libraryEntry, book, manifest, page, layer, notes };
  };

  return { loadLibrary, loadReaderBundle };
}
