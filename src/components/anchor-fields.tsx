"use client";

interface AnchorFieldsProps {
  anchors: string[];
  onChange: (anchors: string[]) => void;
  onSuggest?: () => void;
  isLoadingSuggestions?: boolean;
}

export function AnchorFields({
  anchors,
  onChange,
  onSuggest,
  isLoadingSuggestions,
}: AnchorFieldsProps) {
  // Ensure we always have exactly 5 slots
  const normalizedAnchors = [...anchors];
  while (normalizedAnchors.length < 5) {
    normalizedAnchors.push("");
  }

  const updateAnchor = (index: number, value: string) => {
    const updated = [...normalizedAnchors];
    updated[index] = value;
    onChange(updated);
  };

  const filledCount = normalizedAnchors.filter((a) => a.trim()).length;
  const isValid = filledCount >= 3 && filledCount <= 5;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="label mb-0">
          Environment Anchors{" "}
          <span
            className={`label-hint ${
              !isValid ? "text-red-500" : "text-emerald-600"
            }`}
          >
            ({filledCount}/5 — need 3-5)
          </span>
        </label>
        {onSuggest && (
          <button
            type="button"
            onClick={onSuggest}
            disabled={isLoadingSuggestions}
            className="text-sm text-paw-600 hover:text-paw-700 disabled:opacity-50 flex items-center gap-1"
          >
            {isLoadingSuggestions ? (
              <>
                <span className="animate-spin">⏳</span> Suggesting...
              </>
            ) : (
              <>
                ✨ AI Suggest
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-xs text-canvas-500 mb-3">
        Specific objects/elements that ground your scene. Be concrete, not vague.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {normalizedAnchors.slice(0, 5).map((anchor, index) => (
          <input
            key={index}
            type="text"
            className={`input py-2 text-sm ${
              index < 3 && !anchor.trim() ? "border-amber-300" : ""
            }`}
            placeholder={`Anchor ${index + 1}${index < 3 ? " *" : ""}`}
            value={anchor}
            onChange={(e) => updateAnchor(index, e.target.value)}
          />
        ))}
      </div>
      <p className="text-xs text-canvas-400 mt-2">
        Examples: "worn leather armchair", "steaming coffee mug", "rain-streaked window"
      </p>
    </div>
  );
}
