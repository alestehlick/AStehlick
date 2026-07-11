export function normalizeBaseUrl(baseUrl: string): string {
  const withLeadingSlash = baseUrl.startsWith("/") ? baseUrl : `/${baseUrl}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
}

export function joinContentPath(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .map((part, index) => {
      const withoutLeading = index === 0 ? part : part.replace(/^\/+/, "");
      return withoutLeading.replace(/\/+$/, "");
    })
    .filter(Boolean)
    .join("/");
}

export function parentContentPath(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

export function toContentUrl(baseUrl: string, contentPath: string): string {
  return `${normalizeBaseUrl(baseUrl)}content/${contentPath.replace(/^\/+/, "")}`;
}
