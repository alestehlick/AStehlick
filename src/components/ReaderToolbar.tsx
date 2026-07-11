interface ReaderToolbarProps {
  onLibrary: () => void;
  onReset: () => void;
  scalePercent: number;
  canDecreaseScale: boolean;
  canIncreaseScale: boolean;
  onDecreaseScale: () => void;
  onIncreaseScale: () => void;
}

export function ReaderToolbar({
  onLibrary,
  onReset,
  scalePercent,
  canDecreaseScale,
  canIncreaseScale,
  onDecreaseScale,
  onIncreaseScale,
}: ReaderToolbarProps) {
  return (
    <div className="reader-toolbar">
      <button className="quiet-button" type="button" onClick={onLibrary}>
        ← Library
      </button>
      <p className="reader-mark">Moonlight Reader</p>
      <div className="reader-toolbar-actions">
        <div className="text-scale-control" aria-label="Reading text size">
          <button
            className="icon-button"
            type="button"
            onClick={onDecreaseScale}
            disabled={!canDecreaseScale}
            aria-label="Decrease reading text size"
            title="Decrease text size"
          >
            A-
          </button>
          <output aria-live="polite">{scalePercent}%</output>
          <button
            className="icon-button"
            type="button"
            onClick={onIncreaseScale}
            disabled={!canIncreaseScale}
            aria-label="Increase reading text size"
            title="Increase text size"
          >
            A+
          </button>
        </div>
        <button className="quiet-button" type="button" onClick={onReset}>
          Reset progress
        </button>
      </div>
    </div>
  );
}
