import type { ReactNode } from "react";

interface PageCommentaryProps {
  markdown: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function inlineMarkdown(text: string): ReactNode[] {
  return text
    .split(/(\*[^*]+\*)/g)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("*") && part.endsWith("*") ? (
        <em key={index}>{part.slice(1, -1)}</em>
      ) : (
        part
      ),
    );
}

function markdownBlocks(markdown: string): ReactNode[] {
  return markdown
    .trim()
    .split(/\n\s*\n/)
    .map((block, index) => {
      if (block.startsWith("## "))
        return <h3 key={index}>{inlineMarkdown(block.slice(3))}</h3>;
      return <p key={index}>{inlineMarkdown(block.replace(/\n/g, " "))}</p>;
    });
}

export function PageCommentary({
  markdown,
  open,
  onOpenChange,
}: PageCommentaryProps) {
  return (
    <details
      className="commentary"
      open={open}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary>Commentary</summary>
      <div className="commentary-body">{markdownBlocks(markdown)}</div>
    </details>
  );
}
