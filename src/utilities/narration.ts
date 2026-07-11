import type { AudioSegmentDefinition, LayerFile } from "../content/types";

export function findNarrationForNote(
  layer: LayerFile,
  noteId: string | null,
): AudioSegmentDefinition | null {
  if (!noteId) return null;
  for (const block of layer.blocks) {
    if (block.type !== "paragraph") continue;
    for (const segment of block.audioSegments ?? []) {
      if (
        block.content
          .slice(segment.start, segment.end + 1)
          .some(
            (inline) =>
              inline.type === "annotated" && inline.noteIds.includes(noteId),
          )
      ) {
        return segment;
      }
    }
  }
  return null;
}

export function narrationKey(
  bookId: string,
  pageId: string,
  layer: number,
  segmentId: string,
): string {
  return `${bookId}:${pageId}:${layer}:${segmentId}`;
}

export function narrationUrl(
  bookId: string,
  pageId: string,
  layer: number,
  segmentId: string,
): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}assets/audio/${bookId}/${pageId}/layer-${String(layer).padStart(2, "0")}/${segmentId}.mp3`;
}

export function wordNarrationKey(
  bookId: string,
  pageId: string,
  noteId: string,
): string {
  return `${bookId}:${pageId}:word:${noteId}`;
}

export function wordNarrationUrl(
  bookId: string,
  pageId: string,
  noteId: string,
): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}assets/audio/${bookId}/${pageId}/words/${noteId}.mp3`;
}
