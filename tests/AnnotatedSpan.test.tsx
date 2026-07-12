import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AnnotatedSpan } from "../src/components/AnnotatedSpan";

const noop = () => undefined;

describe("AnnotatedSpan", () => {
  it("renders a phonographic surface beneath its furigana", () => {
    const html = renderToStaticMarkup(
      <AnnotatedSpan
        inline={{
          type: "annotated",
          text: "葛飾郡",
          reading: "かつしかのこおり",
          language: "ja",
          noteIds: ["note-katsushika"],
          phonographic: { surface: "葛飾", reading: "かつしか" },
        }}
        onOpenNote={noop}
      />,
    );

    expect(html).toContain("is-phonographic");
    expect(html).toContain("<ruby");
    expect(html).toContain("<rt>かつしか</rt>");
    expect(html).toContain("葛飾");
    expect(html).toContain("郡");
  });
});
