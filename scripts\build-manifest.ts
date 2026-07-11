import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface PageRecord {
  id: string;
  title: string;
  sequence: number;
}

const bookId = process.argv[2] ?? "ugetsu";
const bookDirectory = resolve(
  process.cwd(),
  "public",
  "content",
  "books",
  bookId,
);
const pagesDirectory = resolve(bookDirectory, "pages");
const manifestPath = resolve(bookDirectory, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
  string,
  unknown
>;

const pages = readdirSync(pagesDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const page = JSON.parse(
      readFileSync(resolve(pagesDirectory, entry.name, "page.json"), "utf8"),
    ) as PageRecord;
    return {
      id: page.id,
      title: page.title,
      sequence: page.sequence,
      path: `pages/${entry.name}/page.json`,
    };
  })
  .sort((a, b) => a.sequence - b.sequence);

writeFileSync(
  manifestPath,
  `${JSON.stringify({ ...manifest, pages }, null, 2)}\n`,
  "utf8",
);
console.log(`Updated ${manifestPath} with ${pages.length} page(s).`);
