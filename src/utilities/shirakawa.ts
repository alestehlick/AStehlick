export const SHIRAKAWA_ENTRY_BASE =
  "https://alestehlick.github.io/shirakawa-dictionary/entries/";

const hanCharacter = /^\p{Script=Han}$/u;

export function isDictionaryKanji(character: string): boolean {
  return hanCharacter.test(character);
}

export function shirakawaEntryUrl(kanji: string): string {
  return `${SHIRAKAWA_ENTRY_BASE}${encodeURIComponent(kanji)}.html`;
}
