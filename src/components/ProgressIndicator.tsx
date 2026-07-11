import type { LayerDefinition } from "../content/types";
import { layerDescription, toRoman } from "../utilities/accessibility";

interface ProgressIndicatorProps {
  layers: LayerDefinition[];
  currentLayer: number;
  onSelectLayer: (layer: number) => void;
}

export function ProgressIndicator({
  layers,
  currentLayer,
  onSelectLayer,
}: ProgressIndicatorProps) {
  const current =
    layers.find((entry) => entry.number === currentLayer) ?? layers[0];
  return (
    <div className="layer-progress">
      <div className="layer-progress-label">
        <span>
          {toRoman(currentLayer)} / {toRoman(layers.length)}
        </span>
        <span>{current.label}</span>
      </div>
      <div
        className="layer-sequence"
        aria-label={layerDescription(
          currentLayer,
          layers.length,
          current.label,
        )}
      >
        {layers.map((layer) => (
          <button
            type="button"
            className={
              layer.number === currentLayer
                ? "is-current"
                : layer.number < currentLayer
                  ? "is-passed"
                  : ""
            }
            key={layer.number}
            title={`Layer ${layer.number}: ${layer.label}`}
            aria-label={`Open layer ${layer.number}: ${layer.label}`}
            aria-current={layer.number === currentLayer ? "step" : undefined}
            onClick={() => onSelectLayer(layer.number)}
          />
        ))}
      </div>
    </div>
  );
}
