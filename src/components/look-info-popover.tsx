"use client";

import { useState } from "react";
import { LookFamily } from "@/lib/schemas";
import { LOOK_DECISION_TREE } from "@/data/defaults";

interface LookInfoPopoverProps {
  look: LookFamily | null;
}

export function LookInfoPopover({ look }: LookInfoPopoverProps) {
  const [showDecisionTree, setShowDecisionTree] = useState(false);

  if (!look) {
    return (
      <div className="p-4 bg-canvas-50 rounded-xl border border-canvas-200 text-sm text-canvas-500">
        Select a look to see details
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bg-paw-50 rounded-xl border border-paw-200">
        <h4 className="font-semibold text-paw-800 mb-2">{look.uiName}</h4>
        <p className="text-sm text-paw-700 mb-3">{look.whenToUse}</p>
        
        <div className="mb-3">
          <span className="text-xs font-semibold text-paw-600 uppercase tracking-wide">Produces:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {look.producesSummary.map((item, i) => (
              <span key={i} className="badge badge-paw text-xs">
                {item}
              </span>
            ))}
          </div>
        </div>

        {look.exampleUseCase && (
          <p className="text-xs text-paw-600">
            <strong>Example:</strong> {look.exampleUseCase}
          </p>
        )}

        {look.opticsBiasNotes && (
          <p className="text-xs text-paw-600 mt-1">
            <strong>Optics note:</strong> {look.opticsBiasNotes}
          </p>
        )}

        <div className="mt-3 pt-3 border-t border-paw-200">
          <span className="text-xs font-semibold text-paw-600 uppercase tracking-wide">
            Auto Lens Mapping:
          </span>
          <div className="grid grid-cols-2 gap-1 mt-1 text-xs text-paw-700">
            <span>Face/Emotion: {look.recommendedLensByFraming.face_emotion}mm</span>
            <span>Medium: {look.recommendedLensByFraming.medium}mm</span>
            <span>Full Body: {look.recommendedLensByFraming.full_body}mm</span>
            <span>Wide Scene: {look.recommendedLensByFraming.wide_scene}mm</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowDecisionTree(!showDecisionTree)}
        className="text-sm text-paw-600 hover:text-paw-700"
      >
        {showDecisionTree ? "Hide" : "Show"} "Which Look Should I Pick?" guide
      </button>

      {showDecisionTree && (
        <div className="p-4 bg-canvas-50 rounded-xl border border-canvas-200">
          <h4 className="font-semibold text-canvas-800 mb-3">Decision Tree</h4>
          <ul className="space-y-2">
            {LOOK_DECISION_TREE.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-paw-500 mt-0.5">→</span>
                <span>
                  <span className="text-canvas-600">{item.condition}</span>
                  <span className="mx-2 text-canvas-400">→</span>
                  <span className="font-medium text-canvas-800">{item.recommendation}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
