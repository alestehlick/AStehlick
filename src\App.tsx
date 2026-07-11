import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { BookLibrary } from "./components/BookLibrary";
import { Reader } from "./components/Reader";
import { createContentLoader } from "./content/contentLoader";
import type { LibraryFile } from "./content/types";
import {
  libraryHash,
  navigateTo,
  parseHash,
  readerHash,
  type AppRoute,
} from "./routing/hashRouter";
import { createProgressStore, type ProgressData } from "./state/progressStore";

const loader = createContentLoader();

export default function App() {
  const progressStore = useMemo(() => createProgressStore(), []);
  const [progress, setProgress] = useState<ProgressData>(() =>
    progressStore.load(),
  );
  const [library, setLibrary] = useState<LibraryFile | null>(null);
  const [route, setRoute] = useState<AppRoute>(() =>
    parseHash(window.location.hash),
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loader
      .loadLibrary()
      .then(setLibrary)
      .catch(() => {
        setMessage("The library could not be opened.");
      });
  }, []);

  useEffect(() => {
    const readRoute = () => {
      const nextRoute = parseHash(window.location.hash);
      if (nextRoute.type === "invalid") {
        setMessage(
          "That reading location does not exist. The library has been restored.",
        );
        window.history.replaceState(
          null,
          "",
          `${window.location.pathname}${window.location.search}${libraryHash()}`,
        );
        setRoute({ type: "library" });
        return;
      }
      if (!window.location.hash || window.location.hash === "#") {
        navigateTo(libraryHash(), true);
      }
      setRoute(nextRoute);
    };
    readRoute();
    window.addEventListener("hashchange", readRoute);
    return () => window.removeEventListener("hashchange", readRoute);
  }, []);

  const returnToLibrary = useCallback(() => navigateTo(libraryHash()), []);
  const handleInvalid = useCallback((reason: string) => {
    setMessage(`${reason} The library has been restored.`);
    navigateTo(libraryHash(), true);
  }, []);

  if (!library) {
    return (
      <AppShell>
        <main className="reader-loading" aria-live="polite">
          <span aria-hidden="true">月</span>
          <p>{message ?? "Opening the library…"}</p>
        </main>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {route.type === "reader" ? (
        <Reader
          bookId={route.bookId}
          pageId={route.pageId}
          layerNumber={route.layer}
          progressStore={progressStore}
          onProgress={setProgress}
          onInvalid={handleInvalid}
          onLibrary={returnToLibrary}
          onReset={() => {
            setProgress(progressStore.reset());
            setMessage("Reading progress was reset.");
          }}
        />
      ) : (
        <BookLibrary
          library={library}
          progress={progress}
          message={message}
          onOpenBook={(bookId, pageId, layer) =>
            navigateTo(readerHash(bookId, pageId, layer))
          }
        />
      )}
    </AppShell>
  );
}
