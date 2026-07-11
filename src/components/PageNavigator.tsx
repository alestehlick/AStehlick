interface PageNavigatorProps {
  current: number;
  total: number;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function PageNavigator({
  current,
  total,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
}: PageNavigatorProps) {
  return (
    <div className="navigator-group" aria-label="Page navigation">
      <button
        className="icon-button"
        type="button"
        onClick={onPrevious}
        disabled={!canPrevious}
        title="Previous page"
        aria-label="Previous page"
      >
        ←
      </button>
      <span>
        Page {current} / {total}
      </span>
      <button
        className="icon-button"
        type="button"
        onClick={onNext}
        disabled={!canNext}
        title="Next page"
        aria-label="Next page"
      >
        →
      </button>
    </div>
  );
}
