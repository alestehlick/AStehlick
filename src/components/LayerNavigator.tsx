interface LayerNavigatorProps {
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function LayerNavigator({
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}: LayerNavigatorProps) {
  return (
    <div className="navigator-group" aria-label="Layer navigation">
      <button
        className="icon-button"
        type="button"
        onClick={onPrevious}
        disabled={!canPrevious}
        title="Previous layer"
        aria-label="Previous layer"
      >
        ←
      </button>
      <span>Layer</span>
      <button
        className="icon-button"
        type="button"
        onClick={onNext}
        disabled={!canNext}
        title="Next layer"
        aria-label="Next layer"
      >
        →
      </button>
    </div>
  );
}
