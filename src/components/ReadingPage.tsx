import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import type {
  AudioSegmentDefinition,
  ContentInline,
  LayerFile,
} from "../content/types";
import { AnnotatedSpan } from "./AnnotatedSpan";

interface ReadingPageProps {
  layer: LayerFile;
  bookId: string;
  pageId: string;
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

function audioUrl(
  bookId: string,
  pageId: string,
  layer: number,
  id: string,
): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}assets/audio/${bookId}/${pageId}/layer-${String(layer).padStart(2, "0")}/${id}.mp3`;
}

export function ReadingPage({
  layer,
  bookId,
  pageId,
  pageTitle,
  onOpenNote,
}: ReadingPageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [audioMessage, setAudioMessage] = useState<string | null>(null);
  const [availableAudio, setAvailableAudio] = useState<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    const base = import.meta.env.BASE_URL.endsWith("/")
      ? import.meta.env.BASE_URL
      : `${import.meta.env.BASE_URL}/`;
    fetch(`${base}assets/audio/manifest.json`)
      .then((response) => (response.ok ? response.json() : { entries: {} }))
      .then((manifest: { entries?: Record<string, unknown> }) => {
        if (active)
          setAvailableAudio(new Set(Object.keys(manifest.entries ?? {})));
      })
      .catch(() => {
        if (active) setAvailableAudio(new Set());
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, [layer.layer]);

  const playSegment = (segment: AudioSegmentDefinition) => {
    const key = `${bookId}:${pageId}:${layer.layer}:${segment.id}`;
    if (!availableAudio.has(key)) {
      setAudioMessage("Narration is awaiting generation.");
      return;
    }
    if (activeSegment === segment.id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setActiveSegment(null);
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(audioUrl(bookId, pageId, layer.layer, segment.id));
    audioRef.current = audio;
    setActiveSegment(segment.id);
    setAudioMessage(null);
    audio.addEventListener("ended", () => setActiveSegment(null), {
      once: true,
    });
    audio.addEventListener(
      "error",
      () => {
        setActiveSegment(null);
        setAudioMessage("Narration is awaiting generation.");
      },
      { once: true },
    );
    void audio.play().catch(() => {
      setActiveSegment(null);
      setAudioMessage("Narration could not be played.");
    });
  };

  const renderParagraph = (
    content: ContentInline[],
    segments: AudioSegmentDefinition[] = [],
  ): ReactNode[] => {
    const byStart = new Map(
      segments.map((segment) => [segment.start, segment]),
    );
    const rendered: ReactNode[] = [];
    let index = 0;

    while (index < content.length) {
      const segment = byStart.get(index);
      if (!segment) {
        rendered.push(renderInline(content[index], index, onOpenNote));
        index += 1;
        continue;
      }

      const isPlaying = activeSegment === segment.id;
      const key = `${bookId}:${pageId}:${layer.layer}:${segment.id}`;
      const isAvailable = availableAudio.has(key);
      rendered.push(
        <span
          className={`audio-segment${isPlaying ? " is-playing" : ""}${isAvailable ? "" : " is-pending"}`}
          onClick={() => playSegment(segment)}
          title={`Play: ${segment.text}`}
          key={segment.id}
        >
          {content
            .slice(segment.start, segment.end + 1)
            .map((inline, offset) =>
              renderInline(inline, segment.start + offset, onOpenNote),
            )}
        </span>,
      );
      rendered.push(
        <button
          className={`audio-play-button${isPlaying ? " is-playing" : ""}`}
          type="button"
          onClick={() => playSegment(segment)}
          disabled={!isAvailable}
          aria-label={
            isAvailable
              ? `${isPlaying ? "Stop" : "Play"} Japanese narration: ${segment.text}`
              : `Japanese narration awaiting generation: ${segment.text}`
          }
          title={
            isAvailable
              ? `${isPlaying ? "Stop" : "Play"} narration`
              : "Narration awaiting generation"
          }
          key={`${segment.id}-control`}
        >
          <span aria-hidden="true">{isPlaying ? "■" : "▶"}</span>
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
                renderInline(inline, inlineIndex, onOpenNote),
              );
        if (block.type === "heading") {
          const Heading = `h${block.level}` as ElementType;
          return <Heading key={blockIndex}>{content}</Heading>;
        }
        return <p key={blockIndex}>{content}</p>;
      })}
      <p className="audio-status" aria-live="polite">
        {audioMessage}
      </p>
    </article>
  );
}
