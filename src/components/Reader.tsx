import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createContentLoader,
  ContentLoadError,
} from "../content/contentLoader";
import type { ReaderBundle } from "../content/types";
import { readerHash, navigateTo } from "../routing/hashRouter";
import {
  createPreferencesStore,
  type ReadingScale,
} from "../state/preferencesStore";
import { type ProgressData, createProgressStore } from "../state/progressStore";
import { adjacentLayer, adjacentPage } from "../state/readerState";
import { isNativeControl } from "../utilities/keyboard";
import { wordNarrationKey, wordNarrationUrl } from "../utilities/narration";
import { LayerNavigator } from "./LayerNavigator";
import { NotesPanel } from "./NotesPanel";
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
const readingScales: Array<{ id: ReadingScale; percent: number }> = [
  { id: "standard", percent: 100 },
  { id: "large", percent: 115 },
  { id: "extra-large", percent: 130 },
];

function deviceDefaultScale(): ReadingScale {
  if (typeof window === "undefined" || !window.matchMedia) return "standard";
  return window.matchMedia(
    "(min-width: 700px) and (max-width: 1180px) and (pointer: coarse)",
  ).matches
    ? "large"
    : "standard";
}

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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [availableAudio, setAvailableAudio] = useState<Set<string>>(new Set());
  const [activeAudioKey, setActiveAudioKey] = useState<string | null>(null);
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const [readingScale, setReadingScale] = useState<ReadingScale>(
    () => preferencesStore.load().readingScale ?? deviceDefaultScale(),
  );

  useEffect(() => {
    let active = true;
    const base = import.meta.env.BASE_URL.endsWith("/")
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    fetch(`${base}assets/audio/manifest.json`)
      .then((response) => (response.ok ? response.json() : { entries: {} }))
      .then((manifest: { entries?: Record<string, unknown> }) => {
        if (active) {
          setAvailableAudio(new Set(Object.keys(manifest.entries ?? {})));
        }
      })
      .catch(() => {
        if (active) setAvailableAudio(new Set());
      });
    return () => {
      active = false;
      audioRef.current?.pause();
    };
  }, []);

  const scaleIndex = readingScales.findIndex(
    (scale) => scale.id === readingScale,
  );
  const setScaleAt = (index: number) => {
    const scale = readingScales[index];
    if (!scale) return;
    setReadingScale(scale.id);
    preferencesStore.setReadingScale(scale.id);
  };

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

  const selectedNote = useMemo(
    () =>
      bundle?.notes.notes.find((note) => note.id === selectedNoteId) ?? null,
    [bundle, selectedNoteId],
  );
  const selectedAudioKey = selectedNote
    ? wordNarrationKey(bookId, pageId, selectedNote.id)
    : null;

  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setActiveAudioKey(null);
    setAudioMessage(null);
  }, [bookId, layerNumber, pageId, selectedNoteId]);

  const playAudio = (key: string, url: string) => {
    if (!availableAudio.has(key)) {
      setAudioMessage("Narration is awaiting generation.");
      return;
    }
    if (activeAudioKey === key && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
      setActiveAudioKey(null);
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(url);
    audioRef.current = audio;
    setActiveAudioKey(key);
    setAudioMessage(null);
    audio.addEventListener(
      "ended",
      () => {
        audioRef.current = null;
        setActiveAudioKey(null);
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        audioRef.current = null;
        setActiveAudioKey(null);
        setAudioMessage("Narration is awaiting generation.");
      },
      { once: true },
    );
    void audio.play().catch(() => {
      audioRef.current = null;
      setActiveAudioKey(null);
      setAudioMessage("Narration could not be played.");
    });
  };

  const toggleWordNarration = () => {
    if (!selectedNote || !selectedAudioKey) return;
    playAudio(
      selectedAudioKey,
      wordNarrationUrl(bookId, pageId, selectedNote.id),
    );
  };

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
    <main className={`reader-view reading-scale-${readingScale}`}>
      <ReaderToolbar
        onLibrary={onLibrary}
        onReset={onReset}
        scalePercent={readingScales[scaleIndex].percent}
        canDecreaseScale={scaleIndex > 0}
        canIncreaseScale={scaleIndex < readingScales.length - 1}
        onDecreaseScale={() => setScaleAt(scaleIndex - 1)}
        onIncreaseScale={() => setScaleAt(scaleIndex + 1)}
      />
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
            availableAudio={availableAudio}
            activeAudioKey={activeAudioKey}
            onPlayAudio={playAudio}
            onOpenNote={setSelectedNoteId}
          />
        </div>
        <NotesPanel
          notes={bundle.notes.notes}
          selectedNoteId={selectedNoteId}
          onClose={() => setSelectedNoteId(null)}
          narration={
            selectedNote && selectedAudioKey
              ? {
                  text: selectedNote.reading ?? selectedNote.term,
                  available: availableAudio.has(selectedAudioKey),
                  playing: activeAudioKey === selectedAudioKey,
                }
              : null
          }
          narrationMessage={audioMessage}
          onToggleNarration={toggleWordNarration}
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
