interface ReaderToolbarProps {
  onLibrary: () => void;
  onReset: () => void;
}

export function ReaderToolbar({ onLibrary, onReset }: ReaderToolbarProps) {
  return (
    <div className="reader-toolbar">
      <button className="quiet-button" type="button" onClick={onLibrary}>
        ← Library
      </button>
      <p className="reader-mark">Moonlight Reader</p>
      <button className="quiet-button" type="button" onClick={onReset}>
        Reset progress
      </button>
    </div>
  );
}
