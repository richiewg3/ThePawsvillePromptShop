"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, ModalFooter } from "./modal";
import { LensProfile, LookFamily, MicroDetailPack, MicroTexturePack } from "@/lib/schemas";
import { LookLensRecommendation, OneAndDoneValidated } from "@/lib/one-and-done";

type SectionKey =
  | "ultraPrecisePrompt"
  | "environmentAnchors"
  | "lookLens"
  | "mechanicLock"
  | "focusTarget"
  | "microPacks";

interface OneAndDoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: OneAndDoneValidated | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onApply: (payload: {
    acceptedSections: Record<SectionKey, boolean>;
    lookLensChoice: "primary" | "alternate";
  }) => void;
  looks: LookFamily[];
  lenses: LensProfile[];
  microTextures: MicroTexturePack[];
  microDetails: MicroDetailPack[];
}

const confidenceStyles: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-rose-100 text-rose-700",
};

const sectionOrder: SectionKey[] = [
  "ultraPrecisePrompt",
  "environmentAnchors",
  "lookLens",
  "mechanicLock",
  "focusTarget",
  "microPacks",
];

const getConfidenceLabel = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

export function OneAndDoneModal({
  isOpen,
  onClose,
  data,
  isLoading,
  error,
  onRetry,
  onApply,
  looks,
  lenses,
  microTextures,
  microDetails,
}: OneAndDoneModalProps) {
  const [acceptedSections, setAcceptedSections] = useState<Record<SectionKey, boolean>>({
    ultraPrecisePrompt: true,
    environmentAnchors: true,
    lookLens: true,
    mechanicLock: true,
    focusTarget: true,
    microPacks: true,
  });
  const [lookLensChoice, setLookLensChoice] = useState<"primary" | "alternate">(
    "primary"
  );

  const lookMap = useMemo(() => new Map(looks.map((look) => [look.id, look])), [looks]);
  const lensMap = useMemo(() => new Map(lenses.map((lens) => [lens.id, lens])), [lenses]);
  const microTextureMap = useMemo(
    () => new Map(microTextures.map((pack) => [pack.id, pack])),
    [microTextures]
  );
  const microDetailMap = useMemo(
    () => new Map(microDetails.map((pack) => [pack.id, pack])),
    [microDetails]
  );

  useEffect(() => {
    if (isOpen && data) {
      setAcceptedSections({
        ultraPrecisePrompt: data.ultraPrecisePrompt.valid,
        environmentAnchors: data.environmentAnchors.valid,
        lookLens: data.lookLens.valid,
        mechanicLock: data.mechanicLock.valid,
        focusTarget: data.focusTarget.valid,
        microPacks: data.microPacks.valid,
      });
      setLookLensChoice("primary");
    }
  }, [isOpen, data]);

  const handleToggle = (key: SectionKey) => {
    setAcceptedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAcceptAll = () => {
    if (!data) return;
    setAcceptedSections({
      ultraPrecisePrompt: data.ultraPrecisePrompt.valid,
      environmentAnchors: data.environmentAnchors.valid,
      lookLens: data.lookLens.valid,
      mechanicLock: data.mechanicLock.valid,
      focusTarget: data.focusTarget.valid,
      microPacks: data.microPacks.valid,
    });
  };

  const handleApply = () => {
    onApply({ acceptedSections, lookLensChoice });
    onClose();
  };

  const canApply =
    data &&
    !isLoading &&
    !error &&
    sectionOrder.some((key) => acceptedSections[key]);

  const renderConfidence = (confidence: string) => (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        confidenceStyles[confidence] || "bg-canvas-100 text-canvas-600"
      }`}
    >
      Confidence: {getConfidenceLabel(confidence)}
    </span>
  );

  const renderLookLens = (recommendation: LookLensRecommendation) => {
    const look = lookMap.get(recommendation.lookFamilyId);
    const lens = recommendation.lensProfileId
      ? lensMap.get(recommendation.lensProfileId)
      : null;
    const lensLabel =
      recommendation.lensMode === "auto"
        ? "Auto (Look Default)"
        : lens
          ? `${lens.uiName} (${lens.focalLengthMm}mm)`
          : "Manual lens not available";

    return (
      <div className="space-y-1 text-sm text-canvas-700">
        <p>
          <span className="font-semibold">Look:</span>{" "}
          {look ? look.uiName : "Unknown look"}
        </p>
        <p>
          <span className="font-semibold">Lens:</span> {lensLabel}
        </p>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="✨ One & Done Suggestions" size="xl">
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="inline-block animate-spin text-5xl mb-4">⏳</div>
          <p className="text-canvas-600 text-lg">Running One & Done...</p>
          <p className="text-canvas-500 text-sm mt-2">
            Generating an ultra-precise rewrite and recommendations
          </p>
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <div className="text-5xl mb-4">❌</div>
          <p className="text-red-600 text-lg mb-2">
            Failed to generate One & Done suggestions
          </p>
          <p className="text-sm text-canvas-500 mb-4">{error}</p>
          <button onClick={onRetry} className="btn btn-primary">
            Retry
          </button>
        </div>
      ) : !data ? (
        <div className="py-12 text-center text-canvas-500">
          No data available
        </div>
      ) : (
        <div className="space-y-6">
          {/* Ultra-Precise Prompt */}
          <section className="border border-canvas-200 rounded-xl p-4 space-y-3">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={acceptedSections.ultraPrecisePrompt}
                  onChange={() => handleToggle("ultraPrecisePrompt")}
                  disabled={!data.ultraPrecisePrompt.valid}
                />
                <h3 className="font-semibold text-canvas-800">
                  Ultra-Precise Prompt Rewrite
                </h3>
              </div>
              {renderConfidence(data.ultraPrecisePrompt.confidence)}
            </header>
            {data.ultraPrecisePrompt.valid ? (
              <p className="text-sm text-canvas-700 whitespace-pre-wrap">
                {data.ultraPrecisePrompt.value}
              </p>
            ) : (
              <p className="text-sm text-red-600">
                {data.ultraPrecisePrompt.reason}
              </p>
            )}
          </section>

          {/* Environmental Anchors */}
          <section className="border border-canvas-200 rounded-xl p-4 space-y-3">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={acceptedSections.environmentAnchors}
                  onChange={() => handleToggle("environmentAnchors")}
                  disabled={!data.environmentAnchors.valid}
                />
                <h3 className="font-semibold text-canvas-800">
                  Environmental Anchors
                </h3>
              </div>
              {renderConfidence(data.environmentAnchors.confidence)}
            </header>
            {data.environmentAnchors.valid ? (
              <ul className="list-disc list-inside text-sm text-canvas-700 space-y-1">
                {data.environmentAnchors.value?.map((anchor) => (
                  <li key={anchor}>{anchor}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-red-600">
                {data.environmentAnchors.reason}
              </p>
            )}
          </section>

          {/* Look & Lens */}
          <section className="border border-canvas-200 rounded-xl p-4 space-y-3">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={acceptedSections.lookLens}
                  onChange={() => handleToggle("lookLens")}
                  disabled={!data.lookLens.valid}
                />
                <h3 className="font-semibold text-canvas-800">Look & Lens</h3>
              </div>
              {renderConfidence(data.lookLens.confidence)}
            </header>
            {data.lookLens.valid && data.lookLens.value ? (
              <div className="space-y-3">
                <label className="flex items-start gap-2 text-sm text-canvas-700">
                  <input
                    type="radio"
                    name="look-lens-choice"
                    checked={lookLensChoice === "primary"}
                    onChange={() => setLookLensChoice("primary")}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-canvas-800">Primary</p>
                    {renderLookLens(data.lookLens.value)}
                  </div>
                </label>
                {data.lookLens.alternate && (
                  <label className="flex items-start gap-2 text-sm text-canvas-700">
                    <input
                      type="radio"
                      name="look-lens-choice"
                      checked={lookLensChoice === "alternate"}
                      onChange={() => setLookLensChoice("alternate")}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-canvas-800">Alternate</p>
                      {renderLookLens(data.lookLens.alternate)}
                    </div>
                  </label>
                )}
              </div>
            ) : (
              <p className="text-sm text-red-600">{data.lookLens.reason}</p>
            )}
          </section>

          {/* Mechanical Lock */}
          <section className="border border-canvas-200 rounded-xl p-4 space-y-3">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={acceptedSections.mechanicLock}
                  onChange={() => handleToggle("mechanicLock")}
                  disabled={!data.mechanicLock.valid}
                />
                <h3 className="font-semibold text-canvas-800">Mechanical Lock</h3>
              </div>
              {renderConfidence(data.mechanicLock.confidence)}
            </header>
            {data.mechanicLock.valid ? (
              <p className="text-sm text-canvas-700 whitespace-pre-wrap">
                {data.mechanicLock.value}
              </p>
            ) : (
              <p className="text-sm text-red-600">{data.mechanicLock.reason}</p>
            )}
          </section>

          {/* Focus Target */}
          <section className="border border-canvas-200 rounded-xl p-4 space-y-3">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={acceptedSections.focusTarget}
                  onChange={() => handleToggle("focusTarget")}
                  disabled={!data.focusTarget.valid}
                />
                <h3 className="font-semibold text-canvas-800">Focus Target</h3>
              </div>
              {renderConfidence(data.focusTarget.confidence)}
            </header>
            {data.focusTarget.valid ? (
              <p className="text-sm text-canvas-700 whitespace-pre-wrap">
                {data.focusTarget.value}
              </p>
            ) : (
              <p className="text-sm text-red-600">{data.focusTarget.reason}</p>
            )}
          </section>

          {/* Micro Packs */}
          <section className="border border-canvas-200 rounded-xl p-4 space-y-3">
            <header className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={acceptedSections.microPacks}
                  onChange={() => handleToggle("microPacks")}
                  disabled={!data.microPacks.valid}
                />
                <h3 className="font-semibold text-canvas-800">Micro Packs</h3>
              </div>
              {renderConfidence(data.microPacks.confidence)}
            </header>
            {data.microPacks.valid && data.microPacks.value ? (
              <div className="grid gap-4 md:grid-cols-2 text-sm text-canvas-700">
                <div>
                  <p className="font-semibold text-canvas-800 mb-1">Textures</p>
                  <ul className="list-disc list-inside space-y-1">
                    {data.microPacks.value.texturePackIds.map((id) => (
                      <li key={id}>{microTextureMap.get(id)?.uiName || id}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-canvas-800 mb-1">Details</p>
                  <ul className="list-disc list-inside space-y-1">
                    {data.microPacks.value.detailPackIds.map((id) => (
                      <li key={id}>{microDetailMap.get(id)?.uiName || id}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-600">{data.microPacks.reason}</p>
            )}
          </section>

          {/* Assumptions */}
          <section className="border border-canvas-200 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-canvas-800">Assumptions</h3>
            {data.assumptions.length > 0 ? (
              <ul className="list-disc list-inside text-sm text-canvas-600 space-y-1">
                {data.assumptions.map((assumption) => (
                  <li key={assumption}>{assumption}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-canvas-500">No assumptions provided.</p>
            )}
          </section>
        </div>
      )}

      {!isLoading && !error && data && (
        <ModalFooter>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleAcceptAll} className="btn btn-secondary">
            Accept All
          </button>
          <button onClick={handleApply} className="btn btn-primary" disabled={!canApply}>
            Apply Selected
          </button>
        </ModalFooter>
      )}
    </Modal>
  );
}
