export type AppRoute =
  | { type: "library" }
  | { type: "reader"; bookId: string; pageId: string; layer: number }
  | { type: "invalid" };

const readerPattern =
  /^#\/book\/([a-z0-9-]+)\/page\/([0-9]{3})\/layer\/([0-9]{2})$/;

export function parseHash(hash: string): AppRoute {
  if (hash === "" || hash === "#" || hash === "#/" || hash === "#/library") {
    return { type: "library" };
  }

  const match = readerPattern.exec(hash);
  if (!match) return { type: "invalid" };
  const layer = Number(match[3]);
  if (layer < 1 || layer > 99) return { type: "invalid" };
  return { type: "reader", bookId: match[1], pageId: match[2], layer };
}

export function libraryHash(): string {
  return "#/library";
}

export function readerHash(
  bookId: string,
  pageId: string,
  layer: number,
): string {
  return `#/book/${bookId}/page/${pageId}/layer/${String(layer).padStart(2, "0")}`;
}

export function navigateTo(hash: string, replace = false): void {
  if (replace) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${hash}`,
    );
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = hash;
  }
}
