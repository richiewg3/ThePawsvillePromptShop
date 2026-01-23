"use client";

import { useState, useEffect, useRef } from "react";
import { SceneHeartUpgrade } from "@/lib/schemas";

type VersionKey = "clean" | "cinematic" | "precise";

interface SceneHeartUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  upgradeData: SceneHeartUpgrade | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onApply: (selectedVersion: string, selectedAnchors: string[]) => void;
}

const VERSION_INFO: Record<
  VersionKey,
  { label: string; description: string }
> = {
  clean: {
    label: "Clean (Default)",
    description: "Clear and controlled",
  },
  cinematic: {
    label: "Cinematic",
    description: "Film-still voice, still factual",
  },
  precise: {
    label: "Ultra-Precise",
    description: "Max clarity for model interpretation",
  },
};

export function SceneHeartUpgradeModal({
  isOpen,
  onClose,
  upgradeData,
  isLoading,
  error,
  onRetry,
  onApply,
}: SceneHeartUpgradeModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<VersionKey>("clean");
  const [selectedAnchors, setSelectedAnchors] = useState<Set<string>>(
    new Set()
  );
  const modalRef = useRef<HTMLDivElement>(null);

  // Initialize selected anchors when data loads
  useEffect(() => {
    if (upgradeData?.recommendedAnchors) {
      setSelectedAnchors(new Set(upgradeData.recommendedAnchors));
    }
  }, [upgradeData]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedVersion("clean");
      if (upgradeData?.recommendedAnchors) {
        setSelectedAnchors(new Set(upgradeData.recommendedAnchors));
      }
    }
  }, [isOpen, upgradeData]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEscape);
    }
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key === "Tab") {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      window.addEventListener("keydown", handleTab);
      firstElement?.focus();
      return () => window.removeEventListener("keydown", handleTab);
    }
  }, [isOpen, isLoading, upgradeData]);

  const toggleAnchor = (anchor: string) => {
    setSelectedAnchors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(anchor)) {
        newSet.delete(anchor);
      } else if (newSet.size < 5) {
        newSet.add(anchor);
      }
      return newSet;
    });
  };

  const handleApply = () => {
    if (!upgradeData) return;
    const versionText = upgradeData.versions[selectedVersion];
    const anchorsArray = Array.from(selectedAnchors);
    onApply(versionText, anchorsArray);
    onClose();
  };

  const canApply =
    upgradeData &&
    selectedAnchors.size >= 3 &&
    selectedAnchors.size <= 5 &&
    !isLoading &&
    !error;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - fixed to viewport */}
      <div
        className="fixed inset-0 bg-canvas-950/60 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal container - fixed and centered */}
      <div
        ref={modalRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
      >
        <div
          className="pointer-events-auto w-full max-w-3xl bg-white rounded-2xl shadow-2xl 
                     flex flex-col animate-fade-in"
          style={{ maxHeight: "calc(100vh - 48px)" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - sticky */}
          <div className="sticky top-0 bg-white border-b border-canvas-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
            <h2
              id="upgrade-modal-title"
              className="font-display text-xl font-semibold text-canvas-800"
            >
              ✨ Upgrade Scene Heart
            </h2>
            <button
              onClick={onClose}
              className="btn-ghost p-2 rounded-lg -mr-2"
              aria-label="Close modal"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="py-16 text-center">
                <div className="inline-block animate-spin text-5xl mb-4">
                  ⏳
                </div>
                <p className="text-canvas-600 text-lg">Upgrading...</p>
                <p className="text-canvas-500 text-sm mt-2">
                  Generating 3 versions and anchor suggestions
                </p>
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <div className="text-5xl mb-4">❌</div>
                <p className="text-red-600 text-lg mb-2">
                  Failed to upgrade Scene Heart
                </p>
                <p className="text-sm text-canvas-500 mb-4">{error}</p>
                <button onClick={onRetry} className="btn btn-primary">
                  Retry
                </button>
              </div>
            ) : upgradeData ? (
              <div className="space-y-8">
                {/* Section A: Version Selection */}
                <section>
                  <h3 className="font-display text-lg font-semibold text-canvas-800 mb-4">
                    Choose a Rewritten Version{" "}
                    <span className="text-red-500">*</span>
                  </h3>
                  <div className="space-y-3">
                    {(Object.keys(VERSION_INFO) as VersionKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedVersion(key)}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          selectedVersion === key
                            ? "border-paw-500 bg-paw-50 ring-2 ring-paw-200"
                            : "border-canvas-200 hover:border-canvas-300 bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Radio indicator */}
                          <div
                            className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              selectedVersion === key
                                ? "border-paw-500 bg-paw-500"
                                : "border-canvas-400"
                            }`}
                          >
                            {selectedVersion === key && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-canvas-800">
                                {VERSION_INFO[key].label}
                              </span>
                              <span className="text-xs text-canvas-500 bg-canvas-100 px-2 py-0.5 rounded-full">
                                {VERSION_INFO[key].description}
                              </span>
                            </div>
                            <p className="text-sm text-canvas-700 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                              {upgradeData.versions[key]}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Section B: Anchor Selection */}
                <section>
                  <h3 className="font-display text-lg font-semibold text-canvas-800 mb-2">
                    Environment Anchors
                  </h3>
                  <p className="text-sm text-canvas-600 mb-4">
                    Select 3–5 anchors.{" "}
                    <span
                      className={
                        selectedAnchors.size < 3
                          ? "text-red-500 font-medium"
                          : selectedAnchors.size <= 5
                          ? "text-emerald-600 font-medium"
                          : "text-red-500 font-medium"
                      }
                    >
                      Selected: {selectedAnchors.size}/5
                    </span>
                    {selectedAnchors.size < 3 && (
                      <span className="text-red-500 ml-2">
                        (need at least {3 - selectedAnchors.size} more)
                      </span>
                    )}
                  </p>

                  {/* Recommended anchors */}
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-canvas-700 mb-2 flex items-center gap-2">
                      <span>⭐</span> Recommended
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {upgradeData.recommendedAnchors.map((anchor) => (
                        <button
                          key={anchor}
                          type="button"
                          onClick={() => toggleAnchor(anchor)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            selectedAnchors.has(anchor)
                              ? "bg-paw-500 text-white shadow-sm"
                              : "bg-canvas-100 text-canvas-700 hover:bg-canvas-200"
                          }`}
                        >
                          {selectedAnchors.has(anchor) && (
                            <span className="mr-1">✓</span>
                          )}
                          {anchor}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Other candidates */}
                  <div>
                    <h4 className="text-sm font-semibold text-canvas-700 mb-2">
                      More Suggestions
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {upgradeData.anchorCandidates
                        .filter(
                          (a) => !upgradeData.recommendedAnchors.includes(a)
                        )
                        .map((anchor) => (
                          <button
                            key={anchor}
                            type="button"
                            onClick={() => toggleAnchor(anchor)}
                            disabled={
                              !selectedAnchors.has(anchor) &&
                              selectedAnchors.size >= 5
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              selectedAnchors.has(anchor)
                                ? "bg-paw-500 text-white shadow-sm"
                                : "bg-canvas-100 text-canvas-700 hover:bg-canvas-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            }`}
                          >
                            {selectedAnchors.has(anchor) && (
                              <span className="mr-1">✓</span>
                            )}
                            {anchor}
                          </button>
                        ))}
                    </div>
                  </div>
                </section>
              </div>
            ) : (
              <div className="py-12 text-center text-canvas-500">
                No data available
              </div>
            )}
          </div>

          {/* Footer - sticky */}
          <div className="sticky bottom-0 bg-white border-t border-canvas-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!canApply}
              className="btn btn-primary"
            >
              Apply Selected
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
