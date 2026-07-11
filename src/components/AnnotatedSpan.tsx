import type { AnnotatedInline } from "../content/types";

interface AnnotatedSpanProps {
  inline: AnnotatedInline;
  onOpenNote: (noteId: string) => void;
}

export function AnnotatedSpan({ inline, onOpenNote }: AnnotatedSpanProps) {
  const label = inline.reading
    ? `${inline.text}, reading ${inline.reading}. Open note.`
    : `${inline.text}. Open note.`;
  return (
    <button
      className={`annotation${inline.emphasis ? ` is-${inline.emphasis}` : ""}`}
      type="button"
      lang={inline.language === "ja" ? "ja" : undefined}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onOpenNote(inline.noteIds[0]);
      }}
    >
      {inline.text}
    </button>
  );
}
