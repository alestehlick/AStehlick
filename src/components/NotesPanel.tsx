import type { NoteRecord } from "../content/types";

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
          <h2 lang={note.language === "ja" ? "ja" : undefined}>{note.term}</h2>
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
