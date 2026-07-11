import type { BookManifest } from "../content/types";

export function adjacentLayer(
  manifest: BookManifest,
  currentLayer: number,
  direction: -1 | 1,
): number | null {
  const layers = manifest.layers
    .map((entry) => entry.number)
    .sort((a, b) => a - b);
  const index = layers.indexOf(currentLayer);
  return layers[index + direction] ?? null;
}

export function adjacentPage(
  manifest: BookManifest,
  currentPageId: string,
  direction: -1 | 1,
): string | null {
  const pages = [...manifest.pages].sort((a, b) => a.sequence - b.sequence);
  const index = pages.findIndex((entry) => entry.id === currentPageId);
  return pages[index + direction]?.id ?? null;
}
