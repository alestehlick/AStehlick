import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { NoteRecord } from "../content/types";
import { isDictionaryKanji, shirakawaEntryUrl } from "../utilities/shirakawa";

interface NotesPanelProps {
  notes: NoteRecord[];
  selectedNoteId: string | null;
  onClose: () => void;
  narration: {
    text: string;
    available: boolean;
    playing: boolean;
  } | null;
  narrationMessage: string | null;
  onToggleNarration: () => void;
}

export function NotesPanel({
  notes,
  selectedNoteId,
  onClose,
  narration,
  narrationMessage,
  onToggleNarration,
}: NotesPanelProps) {
  const note = notes.find((entry) => entry.id === selectedNoteId) ?? null;
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!note) return;
    closeButtonRef.current?.focus();
  }, [note]);

  if (!note) return null;

  const keepFocusInside = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="notes-overlay"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <aside
        className="notes-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={dialogRef}
        onKeyDown={keepFocusInside}
      >
        <header className="notes-header">
          <p>Notes</p>
          <button
            className="icon-button notes-close"
            type="button"
            onClick={onClose}
            title="Close notes"
            aria-label="Close notes"
            ref={closeButtonRef}
          >
            ×
          </button>
        </header>
        <div className="note-content" key={note.id}>
          <p className={`note-status status-${note.status}`}>{note.status}</p>
          <h2 id={titleId} lang={note.language === "ja" ? "ja" : undefined}>
            {Array.from(note.term).map((character, index) =>
              isDictionaryKanji(character) ? (
                <a
                  className="dictionary-kanji"
                  href={shirakawaEntryUrl(character)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${character} in Shirakawa Dictionary`}
                  title={`Open ${character} in Shirakawa Dictionary`}
                  key={`${character}-${index}`}
                >
                  {character}
                </a>
              ) : (
                <span key={`${character}-${index}`}>{character}</span>
              ),
            )}
          </h2>
          {note.reading ? (
            <p className="note-reading" lang="ja">
              {note.reading}
            </p>
          ) : null}
          <p className="note-gloss">{note.gloss}</p>
          {narration ? (
            <button
              className={`note-audio-button${narration.playing ? " is-playing" : ""}`}
              type="button"
              onClick={onToggleNarration}
              disabled={!narration.available}
              aria-label={`${narration.playing ? "Stop" : "Play"} Japanese narration: ${narration.text}`}
              title={
                narration.available
                  ? `${narration.playing ? "Stop" : "Play"} narration`
                  : "Narration awaiting generation"
              }
            >
              <span className="note-audio-symbol" aria-hidden="true">
                {narration.playing ? "■" : "▶"}
              </span>
              <span>
                {narration.available
                  ? narration.playing
                    ? "Stop narration"
                    : "Listen"
                  : "Audio pending"}
              </span>
            </button>
          ) : null}
          <p className="note-audio-status" aria-live="polite">
            {narrationMessage}
          </p>
          <div className="note-body">
            {note.body
              .trim()
              .split(/\n\s*\n/)
              .map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
