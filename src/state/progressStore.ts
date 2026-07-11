import {
  browserStorage,
  readStoredJson,
  removeStoredValue,
  type StorageLike,
  writeStoredJson,
} from "../utilities/storage";

export const PROGRESS_KEY = "moonlight-reader.progress.v1";

export interface ProgressData {
  version: 1;
  last: { bookId: string; pageId: string; layer: number } | null;
  highestLayerByPage: Record<string, number>;
  finalLayerReached: Record<string, boolean>;
}

export const emptyProgress = (): ProgressData => ({
  version: 1,
  last: null,
  highestLayerByPage: {},
  finalLayerReached: {},
});

function isProgressData(value: unknown): value is ProgressData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProgressData>;
  return (
    candidate.version === 1 &&
    (candidate.last === null || typeof candidate.last === "object") &&
    typeof candidate.highestLayerByPage === "object" &&
    candidate.highestLayerByPage !== null &&
    typeof candidate.finalLayerReached === "object" &&
    candidate.finalLayerReached !== null
  );
}

export function createProgressStore(
  storage: StorageLike | null = browserStorage(),
) {
  const load = (): ProgressData => {
    const value = readStoredJson(storage, PROGRESS_KEY);
    return isProgressData(value) ? value : emptyProgress();
  };

  const recordVisit = (
    bookId: string,
    pageId: string,
    layer: number,
    totalLayers: number,
  ): ProgressData => {
    const current = load();
    const pageKey = `${bookId}:${pageId}`;
    const next: ProgressData = {
      version: 1,
      last: { bookId, pageId, layer },
      highestLayerByPage: {
        ...current.highestLayerByPage,
        [pageKey]: Math.max(current.highestLayerByPage[pageKey] ?? 0, layer),
      },
      finalLayerReached: {
        ...current.finalLayerReached,
        [pageKey]: Boolean(
          current.finalLayerReached[pageKey] || layer >= totalLayers,
        ),
      },
    };
    writeStoredJson(storage, PROGRESS_KEY, next);
    return next;
  };

  const reset = (): ProgressData => {
    removeStoredValue(storage, PROGRESS_KEY);
    return emptyProgress();
  };

  return { load, recordVisit, reset };
}
