import { type ElementType, type ReactNode } from "react";
import type {
  AudioSegmentDefinition,
  ContentInline,
  LayerFile,
} from "../content/types";
import { narrationKey, narrationUrl } from "../utilities/narration";
import { AnnotatedSpan } from "./AnnotatedSpan";

interface ReadingPageProps {
  layer: LayerFile;
  bookId: string;
  pageId: string;
  pageTitle: string;
  availableAudio: Set<string>;
  activeAudioKey: string | null;
  onPlayAudio: (key: string, url: string) => void;
  selectedNoteId: string | null;
  returningNoteId: string | null;
  onOpenNote: (noteId: string, trigger: HTMLButtonElement) => void;
}

function renderInline(
  inline: ContentInline,
  index: number,
  selectedNoteId: string | null,
  returningNoteId: string | null,
  onOpenNote: (noteId: string, trigger: HTMLButtonElement) => void,
): ReactNode {
  if (inline.type === "lineBreak") return <br key={index} />;
  if (inline.type === "annotated") {
    return (
      <AnnotatedSpan
        key={index}
        inline={inline}
        isActive={inline.noteIds.includes(selectedNoteId ?? "")}
        isReturning={inline.noteIds.includes(returningNoteId ?? "")}
        onOpenNote={onOpenNote}
      />
    );
  }
  if (inline.emphasis === "italic") return <em key={index}>{inline.text}</em>;
  if (inline.emphasis === "strong") {
    return <strong key={index}>{inline.text}</strong>;
  }
  return inline.text;
}

function isSingleWordSegment(
  content: ContentInline[],
  segment: AudioSegmentDefinition,
): boolean {
  const section = content.slice(segment.start, segment.end + 1);
  return section.length === 1 && section[0]?.type === "annotated";
}

export function ReadingPage({
  layer,
  bookId,
  pageId,
  pageTitle,
  availableAudio,
  activeAudioKey,
  onPlayAudio,
  selectedNoteId,
  returningNoteId,
  onOpenNote,
}: ReadingPageProps) {
  const renderParagraph = (
    content: ContentInline[],
    segments: AudioSegmentDefinition[] = [],
  ): ReactNode[] => {
    const byStart = new Map(
      segments
        .filter((segment) => !isSingleWordSegment(content, segment))
        .map((segment) => [segment.start, segment]),
    );
    const rendered: ReactNode[] = [];
    let index = 0;

    while (index < content.length) {
      const segment = byStart.get(index);
      if (!segment) {
        rendered.push(
          renderInline(
            content[index],
            index,
            selectedNoteId,
            returningNoteId,
            onOpenNote,
          ),
        );
        index += 1;
        continue;
      }
      const key = narrationKey(bookId, pageId, layer.layer, segment.id);
      const playing = activeAudioKey === key;
      const available = availableAudio.has(key);
      rendered.push(
        <span key={segment.id}>
          {content
            .slice(segment.start, segment.end + 1)
            .map((inline, offset) =>
              renderInline(
                inline,
                segment.start + offset,
                selectedNoteId,
                returningNoteId,
                onOpenNote,
              ),
            )}
        </span>,
        <button
          className={`audio-play-button${playing ? " is-playing" : ""}`}
          type="button"
          onClick={() =>
            onPlayAudio(
              key,
              narrationUrl(bookId, pageId, layer.layer, segment.id),
            )
          }
          disabled={!available}
          aria-label={`${playing ? "Stop" : "Play"} Japanese narration: ${segment.text}`}
          title={available ? "Play narration" : "Narration awaiting generation"}
          key={`${segment.id}-audio`}
        >
          <span aria-hidden="true">{playing ? "■" : "▶"}</span>
        </button>,
      );
      index = segment.end + 1;
    }
    return rendered;
  };

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
        const content =
          block.type === "paragraph"
            ? renderParagraph(block.content, block.audioSegments)
            : block.content.map((inline, inlineIndex) =>
                renderInline(
                  inline,
                  inlineIndex,
                  selectedNoteId,
                  returningNoteId,
                  onOpenNote,
                ),
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
