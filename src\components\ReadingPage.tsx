import type { ElementType, ReactNode } from "react";
import type { ContentInline, LayerFile } from "../content/types";
import { AnnotatedSpan } from "./AnnotatedSpan";

interface ReadingPageProps {
  layer: LayerFile;
  pageTitle: string;
  onOpenNote: (noteId: string) => void;
}

function renderInline(
  inline: ContentInline,
  index: number,
  onOpenNote: (noteId: string) => void,
): ReactNode {
  if (inline.type === "lineBreak") return <br key={index} />;
  if (inline.type === "annotated") {
    return (
      <AnnotatedSpan key={index} inline={inline} onOpenNote={onOpenNote} />
    );
  }
  if (inline.emphasis === "italic") return <em key={index}>{inline.text}</em>;
  if (inline.emphasis === "strong")
    return <strong key={index}>{inline.text}</strong>;
  return inline.text;
}

export function ReadingPage({
  layer,
  pageTitle,
  onOpenNote,
}: ReadingPageProps) {
  return (
    <article
      className="reading-page"
      aria-label={pageTitle}
      lang={layer.language === "ja" ? "ja" : undefined}
    >
      {layer.blocks.map((block, blockIndex) => {
        if (block.type === "divider") {
          return (
            <div className="text-divider" key={blockIndex} aria-hidden="true">
              ◇
            </div>
          );
        }
        const content = block.content.map((inline, inlineIndex) =>
          renderInline(inline, inlineIndex, onOpenNote),
        );
        if (block.type === "heading") {
          const Heading = `h${block.level}` as ElementType;
          return <Heading key={blockIndex}>{content}</Heading>;
        }
        return <p key={blockIndex}>{content}</p>;
      })}
    </article>
  );
}
