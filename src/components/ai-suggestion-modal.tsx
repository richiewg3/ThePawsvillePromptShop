"use client";

import { useState } from "react";
import { Modal, ModalFooter } from "./modal";

interface AISuggestionModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  suggestions: T[];
  renderSuggestion: (item: T, index: number) => React.ReactNode;
  onAccept: (item: T) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function AISuggestionModal<T>({
  isOpen,
  onClose,
  title,
  suggestions,
  renderSuggestion,
  onAccept,
  isLoading,
  error,
}: AISuggestionModalProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const handleAccept = () => {
    if (selectedIndex !== null && suggestions[selectedIndex]) {
      onAccept(suggestions[selectedIndex]);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      {isLoading ? (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin text-4xl mb-3">⏳</div>
          <p className="text-canvas-600">Generating suggestions...</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-red-600 mb-2">Failed to get suggestions</p>
          <p className="text-sm text-canvas-500">{error}</p>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="py-8 text-center text-canvas-500">
          No suggestions available
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {suggestions.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                selectedIndex === index
                  ? "border-paw-500 bg-paw-50"
                  : "border-canvas-200 hover:border-canvas-300 bg-white"
              }`}
            >
              {renderSuggestion(item, index)}
            </button>
          ))}
        </div>
      )}

      <ModalFooter>
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button
          onClick={handleAccept}
          className="btn btn-primary"
          disabled={selectedIndex === null || isLoading || !!error}
        >
          Accept Selected
        </button>
      </ModalFooter>
    </Modal>
  );
}

// Specialized component for anchor suggestions (multi-select)
interface AnchorSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: string[];
  recommended: string[];
  onAccept: (anchors: string[]) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function AnchorSuggestionModal({
  isOpen,
  onClose,
  candidates,
  recommended,
  onAccept,
  isLoading,
  error,
}: AnchorSuggestionModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(recommended));

  const toggleAnchor = (anchor: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(anchor)) {
      newSelected.delete(anchor);
    } else if (newSelected.size < 5) {
      newSelected.add(anchor);
    }
    setSelected(newSelected);
  };

  const handleAccept = () => {
    onAccept(Array.from(selected));
    onClose();
  };

  // Reset selection when modal opens with new recommendations
  useState(() => {
    setSelected(new Set(recommended));
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="AI Anchor Suggestions" size="lg">
      {isLoading ? (
        <div className="py-12 text-center">
          <div className="inline-block animate-spin text-4xl mb-3">⏳</div>
          <p className="text-canvas-600">Generating anchor suggestions...</p>
        </div>
      ) : error ? (
        <div className="py-8 text-center">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-red-600 mb-2">Failed to get suggestions</p>
          <p className="text-sm text-canvas-500">{error}</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-canvas-600 mb-4">
            Select 3-5 anchors. Recommended picks are pre-selected.{" "}
            <span className={selected.size < 3 ? "text-red-500" : "text-emerald-600"}>
              ({selected.size}/5 selected)
            </span>
          </p>

          <div className="space-y-4">
            {/* Recommended */}
            <div>
              <h4 className="text-sm font-semibold text-canvas-700 mb-2">
                ⭐ Recommended
              </h4>
              <div className="flex flex-wrap gap-2">
                {recommended.map((anchor) => (
                  <button
                    key={anchor}
                    type="button"
                    onClick={() => toggleAnchor(anchor)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      selected.has(anchor)
                        ? "bg-paw-500 text-white"
                        : "bg-canvas-100 text-canvas-700 hover:bg-canvas-200"
                    }`}
                  >
                    {anchor}
                  </button>
                ))}
              </div>
            </div>

            {/* All candidates */}
            <div>
              <h4 className="text-sm font-semibold text-canvas-700 mb-2">
                All Suggestions
              </h4>
              <div className="flex flex-wrap gap-2">
                {candidates
                  .filter((a) => !recommended.includes(a))
                  .map((anchor) => (
                    <button
                      key={anchor}
                      type="button"
                      onClick={() => toggleAnchor(anchor)}
                      disabled={!selected.has(anchor) && selected.size >= 5}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        selected.has(anchor)
                          ? "bg-paw-500 text-white"
                          : "bg-canvas-100 text-canvas-700 hover:bg-canvas-200 disabled:opacity-50"
                      }`}
                    >
                      {anchor}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}

      <ModalFooter>
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button
          onClick={handleAccept}
          className="btn btn-primary"
          disabled={selected.size < 3 || isLoading || !!error}
        >
          Accept ({selected.size}) Anchors
        </button>
      </ModalFooter>
    </Modal>
  );
}
