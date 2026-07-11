export type ContentLanguage = "en" | "ja" | "mixed";
export type NoteStatus = "active" | "reading" | "local" | "treasured";

export interface TextInline {
  type: "text";
  text: string;
  emphasis?: "italic" | "strong";
}

export interface AnnotatedInline {
  type: "annotated";
  text: string;
  reading?: string;
  language: ContentLanguage;
  noteIds: string[];
  emphasis?: "italic" | "strong";
  audio?: string;
}

export interface LineBreakInline {
  type: "lineBreak";
}

export type ContentInline = TextInline | AnnotatedInline | LineBreakInline;

export interface AudioSegmentDefinition {
  id: string;
  text: string;
  start: number;
  end: number;
}

export interface ParagraphBlock {
  type: "paragraph";
  content: ContentInline[];
  audioSegments?: AudioSegmentDefinition[];
}

export interface HeadingBlock {
  type: "heading";
  level: 2 | 3 | 4;
  content: ContentInline[];
}

export interface DividerBlock {
  type: "divider";
}

export type ContentBlock = ParagraphBlock | HeadingBlock | DividerBlock;

export interface LibraryBookRecord {
  id: string;
  title: string;
  titleJa: string;
  author: string;
  authorJa: string;
  description: string;
  path: string;
}

export interface LibraryFile {
  formatVersion: 1;
  title: string;
  books: LibraryBookRecord[];
}

export interface BookFile {
  formatVersion: 1;
  id: string;
  title: string;
  titleJa: string;
  author: string;
  authorJa: string;
  language: ContentLanguage;
  description: string;
  manifest: string;
}

export interface LayerDefinition {
  number: number;
  label: string;
  description: string;
}

export interface PageManifestEntry {
  id: string;
  title: string;
  sequence: number;
  path: string;
}

export interface BookManifest {
  formatVersion: 1;
  bookId: string;
  layers: LayerDefinition[];
  pages: PageManifestEntry[];
}

export interface PageFile {
  formatVersion: 1;
  id: string;
  bookId: string;
  title: string;
  titleJa: string;
  sequence: number;
  layersPath: string;
  notesPath: string;
  commentaryPath: string;
}

export interface LayerFile {
  formatVersion: 1;
  pageId: string;
  layer: number;
  language: ContentLanguage;
  blocks: ContentBlock[];
}

export interface NoteRecord {
  id: string;
  status: NoteStatus;
  term: string;
  reading?: string;
  gloss: string;
  body: string;
  language: ContentLanguage;
}

export interface NotesFile {
  formatVersion: 1;
  pageId: string;
  notes: NoteRecord[];
}

export interface ReaderBundle {
  libraryEntry: LibraryBookRecord;
  book: BookFile;
  manifest: BookManifest;
  page: PageFile;
  layer: LayerFile;
  notes: NotesFile;
  commentary: string;
}
