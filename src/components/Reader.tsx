import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createContentLoader,
  ContentLoadError,
} from "../content/contentLoader";
import type { ReaderBundle } from "../content/types";
import { readerHash, navigateTo } from "../routing/hashRouter";
import { createPreferencesStore } from "../state/preferencesStore";
import { type ProgressData, createProgressStore } from "../state/progressStore";
import { adjacentLayer, adjacentPage } from "../state/readerState";
import { isNativeControl } from "../utilities/keyboard";
import { LayerNavigator } from "./LayerNavigator";
import { NotesPanel } from "./NotesPanel";
import { PageCommentary } from "./PageCommentary";
import { PageNavigator } from "./PageNavigator";
import { ProgressIndicator } from "./ProgressIndicator";
import { ReaderToolbar } from "./ReaderToolbar";
import { ReadingPage } from "./ReadingPage";

interface ReaderProps {
  bookId: string;
  pageId: string;
  layerNumber: number;
  progressStore: ReturnType<typeof createProgressStore>;
  onProgress: (progress: ProgressData) => void;
  onInvalid: (message: string) => void;
  onLibrary: () => void;
  onReset: () => void;
}

const loader = createContentLoader();
const preferencesStore = createPreferencesStore();

export function Reader({
  bookId,
  pageId,
  layerNumber,
  progressStore,
  onProgress,
  onInvalid,
  onLibrary,
  onReset,
}: ReaderProps) {
  const [bundle, setBundle] = useState<ReaderBundle | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [commentaryOpen, setCommentaryOpen] = useState(
    () => preferencesStore.load().commentaryOpen,
  );

  useEffect(() => {
    let active = true;
    setBundle(null);
    setSelectedNoteId(null);
    loader
      .loadReaderBundle(bookId, pageId, layerNumber)
      .then((loaded) => {
        if (!active) return;
        setBundle(loaded);
        onProgress(
          progressStore.recordVisit(
            bookId,
            pageId,
            layerNumber,
            loaded.page.layers.length,
          ),
        );
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message =
          error instanceof ContentLoadError
            ? error.message
            : "The requested reading page could not be loaded.";
        onInvalid(message);
      });
    return () => {
      active = false;
    };
  }, [bookId, layerNumber, onInvalid, onProgress, pageId, progressStore]);

  const goToLayer = useCallback(
    (layer: number) => navigateTo(readerHash(bookId, pageId, layer)),
    [bookId, pageId],
  );

  const goToPage = useCallback(
    (nextPageId: string) => navigateTo(readerHash(bookId, nextPageId, 1)),
    [bookId],
  );

  const previousLayer = bundle
    ? adjacentLayer(bundle.page, layerNumber, -1)
    : null;
  const nextLayer = bundle ? adjacentLayer(bundle.page, layerNumber, 1) : null;
  const previousPage = bundle
    ? adjacentPage(bundle.manifest, pageId, -1)
    : null;
  const nextPage = bundle ? adjacentPage(bundle.manifest, pageId, 1) : null;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedNoteId) {
        event.preventDefault();
        setSelectedNoteId(null);
        return;
      }
      if (isNativeControl(event.target)) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

      const direction = event.key === "ArrowLeft" ? -1 : 1;
      const destination = event.shiftKey
        ? direction === -1
          ? previousPage
          : nextPage
        : direction === -1
          ? previousLayer
          : nextLayer;
      if (destination === null) return;
      event.preventDefault();
      if (event.shiftKey) goToPage(destination as string);
      else goToLayer(destination as number);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    goToLayer,
    goToPage,
    nextLayer,
    nextPage,
    previousLayer,
    previousPage,
    selectedNoteId,
  ]);

  const pagePosition = useMemo(() => {
    if (!bundle) return 1;
    return (
      [...bundle.manifest.pages]
        .sort((a, b) => a.sequence - b.sequence)
        .findIndex((entry) => entry.id === pageId) + 1
    );
  }, [bundle, pageId]);

  if (!bundle) {
    return (
      <main className="reader-loading" aria-live="polite">
        <span aria-hidden="true">月</span>
        <p>Gathering the page…</p>
      </main>
    );
  }

  const layerMeta = bundle.page.layers.find(
    (entry) => entry.number === layerNumber,
  )!;

  return (
    <main className="reader-view">
      <ReaderToolbar onLibrary={onLibrary} onReset={onReset} />
      <header className="reader-header">
        <div>
          <p className="reader-author">
            {bundle.book.author} · <span lang="ja">{bundle.book.authorJa}</span>
          </p>
          <h1>
            <span lang="ja">{bundle.book.titleJa}</span>{" "}
            <span>{bundle.book.title}</span>
          </h1>
        </div>
        <div className="reader-page-title">
          <span>{bundle.page.title}</span>
          <span lang="ja">{bundle.page.titleJa}</span>
        </div>
      </header>

      <ProgressIndicator
        layers={bundle.page.layers}
        currentLayer={layerNumber}
        onSelectLayer={goToLayer}
      />

      <div className="reader-workspace">
        <div className="reading-column">
          <p className="layer-description">{layerMeta.description}</p>
          {bundle.layer.blocks.some(
            (block) =>
              block.type === "paragraph" && block.audioSegments?.length,
          ) ? (
            <p className="narration-credit">
              Narration: AivisSpeech ·{" "}
              <a
                href="https://hub.aivis-project.com/aivm-models/47e53151-a378-46f3-abee-ce13aa07feb1"
                target="_blank"
                rel="noopener noreferrer"
              >
                阿井田 茂 / Calm
              </a>
            </p>
          ) : null}
          <ReadingPage
            layer={bundle.layer}
            bookId={bookId}
            pageId={pageId}
            pageTitle={bundle.page.title}
            onOpenNote={setSelectedNoteId}
          />
          <PageCommentary
            markdown={bundle.commentary}
            open={commentaryOpen}
            onOpenChange={(open) => {
              setCommentaryOpen(open);
              preferencesStore.setCommentaryOpen(open);
            }}
          />
        </div>
        <NotesPanel
          notes={bundle.notes.notes}
          selectedNoteId={selectedNoteId}
          onClose={() => setSelectedNoteId(null)}
        />
      </div>

      <footer className="reader-controls">
        <PageNavigator
          current={pagePosition}
          total={bundle.manifest.pages.length}
          canPrevious={previousPage !== null}
          canNext={nextPage !== null}
          onPrevious={() => previousPage && goToPage(previousPage)}
          onNext={() => nextPage && goToPage(nextPage)}
        />
        <LayerNavigator
          canPrevious={previousLayer !== null}
          canNext={nextLayer !== null}
          onPrevious={() => previousLayer && goToLayer(previousLayer)}
          onNext={() => nextLayer && goToLayer(nextLayer)}
        />
      </footer>
    </main>
  );
}
