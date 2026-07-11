import type { LibraryFile } from "../content/types";
import type { ProgressData } from "../state/progressStore";

interface BookLibraryProps {
  library: LibraryFile;
  progress: ProgressData;
  message?: string | null;
  onOpenBook: (bookId: string, pageId: string, layer: number) => void;
}

export function BookLibrary({
  library,
  progress,
  message,
  onOpenBook,
}: BookLibraryProps) {
  return (
    <main className="library-view">
      <header className="library-header">
        <p className="site-kicker">Progressive Japanese literary reader</p>
        <h1>{library.title}</h1>
        <p className="library-intro">
          Enter a text slowly. Let each layer alter what you can see.
        </p>
      </header>

      {message ? (
        <p className="route-message" role="status">
          {message}
        </p>
      ) : null}

      <section className="library-list" aria-label="Library">
        {library.books.map((book) => {
          const last = progress.last?.bookId === book.id ? progress.last : null;
          const pageId = last?.pageId ?? "001";
          const layer = last?.layer ?? 1;
          return (
            <article className="book-entry" key={book.id}>
              <div className="book-index" aria-hidden="true">
                I
              </div>
              <div className="book-copy">
                <p className="book-title-ja" lang="ja">
                  {book.titleJa}
                </p>
                <h2>{book.title}</h2>
                <p className="book-author">
                  {book.author} · <span lang="ja">{book.authorJa}</span>
                </p>
                <p>{book.description}</p>
              </div>
              <button
                className="command-button library-open"
                type="button"
                onClick={() => onOpenBook(book.id, pageId, layer)}
              >
                {last ? "Continue reading" : "Begin reading"}
                <span aria-hidden="true">→</span>
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
