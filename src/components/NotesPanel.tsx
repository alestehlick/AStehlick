import type { NoteRecord } from "../content/types";
import { isDictionaryKanji, shirakawaEntryUrl } from "../utilities/shirakawa";

interface NotesPanelProps {
  notes: NoteRecord[];
  selectedNoteId: string | null;
  onClose: () => void;
}

export function NotesPanel({
  notes,
  selectedNoteId,
  onClose,
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
          <p className="note-body">{note.body}</p>
        </div>
      ) : (
        <p className="notes-empty">No note selected.</p>
      )}
    </aside>
  );
}
