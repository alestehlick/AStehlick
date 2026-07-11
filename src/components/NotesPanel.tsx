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

  return (
    <aside
      className={`notes-panel${note ? " is-open" : ""}`}
      aria-label="Reading notes"
      aria-hidden={!note}
    >
      <header className="notes-header">
        <p>Notes</p>
        <button
          className="icon-button notes-close"
          type="button"
          onClick={onClose}
          title="Close notes"
          aria-label="Close notes"
        >
          ×
        </button>
      </header>
      {note ? (
        <div className="note-content" key={note.id}>
          <p className={`note-status status-${note.status}`}>{note.status}</p>
          <h2 lang={note.language === "ja" ? "ja" : undefined}>
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
          <p className="note-body">{note.body}</p>
        </div>
      ) : (
        <p className="notes-empty">No note selected.</p>
      )}
    </aside>
  );
}
