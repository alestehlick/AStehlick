import type { AnnotatedInline } from "../content/types";

interface AnnotatedSpanProps {
  inline: AnnotatedInline;
  onOpenNote: (noteId: string) => void;
}

export function AnnotatedSpan({ inline, onOpenNote }: AnnotatedSpanProps) {
  const label = inline.reading
    ? `${inline.text}, reading ${inline.reading}. Open note.`
    : `${inline.text}. Open note.`;
  const content =
    inline.language === "ja" && inline.reading ? (
      <ruby>
        {inline.text}
        <rt>{inline.reading}</rt>
      </ruby>
    ) : (
      inline.text
    );

  return (
    <button
      className={`annotation${inline.emphasis ? ` is-${inline.emphasis}` : ""}`}
      type="button"
      aria-label={label}
      onClick={() => onOpenNote(inline.noteIds[0])}
    >
      {content}
    </button>
  );
}
