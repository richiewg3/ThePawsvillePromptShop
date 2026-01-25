import { ConfidenceLevel, OneAndDoneSuggestion } from "./schemas";

export interface OneAndDoneOption {
  id: string;
  name: string;
}

export interface OneAndDoneOptions {
  lookFamilies: OneAndDoneOption[];
  lensProfiles: Array<OneAndDoneOption & { focalLengthMm?: string; category?: string }>;
  microTexturePacks: OneAndDoneOption[];
  microDetailPacks: OneAndDoneOption[];
}

export interface OneAndDoneRecommendation<T> {
  value: T | null;
  confidence: ConfidenceLevel;
  valid: boolean;
  reason?: string;
}

export interface LookLensRecommendation {
  lookFamilyId: string;
  lensMode: "auto" | "manual";
  lensProfileId?: string;
}

export interface OneAndDoneValidated {
  ultraPrecisePrompt: OneAndDoneRecommendation<string>;
  environmentAnchors: OneAndDoneRecommendation<string[]>;
  lookLens: OneAndDoneRecommendation<LookLensRecommendation> & {
    alternate?: LookLensRecommendation;
  };
  mechanicLock: OneAndDoneRecommendation<string>;
  focusTarget: OneAndDoneRecommendation<string>;
  microPacks: OneAndDoneRecommendation<{
    texturePackIds: string[];
    detailPackIds: string[];
  }>;
  assumptions: string[];
}

const normalizeLookLens = (
  recommendation: LookLensRecommendation,
  options: OneAndDoneOptions
): OneAndDoneRecommendation<LookLensRecommendation> => {
  const lookIds = new Set(options.lookFamilies.map((look) => look.id));
  const lensIds = new Set(options.lensProfiles.map((lens) => lens.id));

  if (!lookIds.size) {
    return {
      value: null,
      confidence: "low",
      valid: false,
      reason: "No look families are available in this project.",
    };
  }

  const hasLook = lookIds.has(recommendation.lookFamilyId);
  const lensMode = recommendation.lensMode;
  const lensProfileId = recommendation.lensProfileId;
  const needsLens = lensMode === "manual";
  const hasLens = !needsLens || (lensProfileId ? lensIds.has(lensProfileId) : false);

  if (!hasLook || !hasLens) {
    return {
      value: null,
      confidence: "low",
      valid: false,
      reason: "Recommended look/lens is not available.",
    };
  }

  return {
    value: {
      lookFamilyId: recommendation.lookFamilyId,
      lensMode,
      lensProfileId: lensMode === "manual" ? lensProfileId : undefined,
    },
    confidence: "high",
    valid: true,
  };
};

export function validateOneAndDoneSuggestion(
  suggestion: OneAndDoneSuggestion,
  options: OneAndDoneOptions
): OneAndDoneValidated {
  const anchors = suggestion.environmentAnchors.anchors;
  const anchorsValid = anchors.length >= 3 && anchors.length <= 5;

  const primaryLookLens = normalizeLookLens(
    {
      lookFamilyId: suggestion.lookLens.lookFamilyId,
      lensMode: suggestion.lookLens.lensMode,
      lensProfileId: suggestion.lookLens.lensProfileId,
    },
    options
  );

  const alternateLookLens = suggestion.lookLens.alternate
    ? normalizeLookLens(
        {
          lookFamilyId: suggestion.lookLens.alternate.lookFamilyId,
          lensMode: suggestion.lookLens.alternate.lensMode,
          lensProfileId: suggestion.lookLens.alternate.lensProfileId,
        },
        options
      )
    : null;

  let lookLens = primaryLookLens;
  let lookLensAlternate: LookLensRecommendation | undefined;

  if (alternateLookLens?.valid) {
    lookLensAlternate = alternateLookLens.value ?? undefined;
  }

  if (!lookLens.valid && lookLensAlternate) {
    lookLens = {
      value: lookLensAlternate,
      confidence: suggestion.lookLens.confidence,
      valid: true,
      reason: "Primary look/lens was invalid; using alternate recommendation.",
    };
    lookLensAlternate = undefined;
  } else {
    lookLens = {
      ...lookLens,
      confidence: suggestion.lookLens.confidence,
    };
  }

  const availableTextureIds = new Set(options.microTexturePacks.map((pack) => pack.id));
  const availableDetailIds = new Set(options.microDetailPacks.map((pack) => pack.id));
  const filteredTextureIds = suggestion.microPacks.texturePackIds.filter((id) =>
    availableTextureIds.has(id)
  );
  const filteredDetailIds = suggestion.microPacks.detailPackIds.filter((id) =>
    availableDetailIds.has(id)
  );

  const hasMicroOptions = availableTextureIds.size > 0 || availableDetailIds.size > 0;
  const microValid =
    hasMicroOptions && (filteredTextureIds.length > 0 || filteredDetailIds.length > 0);

  const normalizeText = (value: string) => value.trim();

  return {
    ultraPrecisePrompt: {
      value: normalizeText(suggestion.ultraPrecisePrompt.text),
      confidence: suggestion.ultraPrecisePrompt.confidence,
      valid: normalizeText(suggestion.ultraPrecisePrompt.text).length > 0,
      reason: normalizeText(suggestion.ultraPrecisePrompt.text).length
        ? undefined
        : "AI did not provide a prompt rewrite.",
    },
    environmentAnchors: {
      value: anchorsValid ? anchors : null,
      confidence: suggestion.environmentAnchors.confidence,
      valid: anchorsValid,
      reason: anchorsValid
        ? undefined
        : "Anchors must include 3–5 placement-aware items.",
    },
    lookLens: {
      ...lookLens,
      alternate: lookLensAlternate,
    },
    mechanicLock: {
      value: normalizeText(suggestion.mechanicLock.text),
      confidence: suggestion.mechanicLock.confidence,
      valid: normalizeText(suggestion.mechanicLock.text).length > 0,
      reason: normalizeText(suggestion.mechanicLock.text).length
        ? undefined
        : "AI did not provide a mechanic lock recommendation.",
    },
    focusTarget: {
      value: normalizeText(suggestion.focusTarget.text),
      confidence: suggestion.focusTarget.confidence,
      valid: normalizeText(suggestion.focusTarget.text).length > 0,
      reason: normalizeText(suggestion.focusTarget.text).length
        ? undefined
        : "AI did not provide a focus target recommendation.",
    },
    microPacks: {
      value: microValid
        ? {
            texturePackIds: filteredTextureIds,
            detailPackIds: filteredDetailIds,
          }
        : null,
      confidence: suggestion.microPacks.confidence,
      valid: microValid,
      reason: microValid
        ? undefined
        : hasMicroOptions
          ? "No valid micro pack recommendations matched your options."
          : "No micro packs are available in this project.",
    },
    assumptions: suggestion.assumptions,
  };
}
