import type { AnnotatedInline } from "../content/types";

interface AnnotatedSpanProps {
  inline: AnnotatedInline;
  onOpenNote: (noteId: string) => void;
}

function renderAnnotationText(inline: AnnotatedInline) {
  const cue = inline.phonographic;
  if (!cue) return inline.text;

  const start = inline.text.indexOf(cue.surface);
  if (start < 0) return inline.text;

  const before = inline.text.slice(0, start);
  const after = inline.text.slice(start + cue.surface.length);

  return (
    <>
      {before}
      <ruby className="phonographic-ruby">
        <span className="phonographic-veil">
          <span className="phonographic-glyphs">{cue.surface}</span>
        </span>
        <rt>{cue.reading}</rt>
      </ruby>
      {after}
    </>
  );
}

export function AnnotatedSpan({ inline, onOpenNote }: AnnotatedSpanProps) {
  const label = inline.phonographic
    ? `${inline.text}, phonographic spelling. Read ${inline.phonographic.reading}. Open note.`
    : inline.reading
      ? `${inline.text}, reading ${inline.reading}. Open note.`
      : `${inline.text}. Open note.`;

  return (
    <button
      className={`annotation${inline.phonographic ? " is-phonographic" : ""}${inline.emphasis ? ` is-${inline.emphasis}` : ""}`}
      type="button"
      lang={inline.language === "ja" ? "ja" : undefined}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onOpenNote(inline.noteIds[0]);
      }}
    >
      {renderAnnotationText(inline)}
    </button>
  );
}
