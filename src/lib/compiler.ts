import {
  PromptRequest,
  CharacterProfile,
  WardrobeProfile,
  LookFamily,
  LensProfile,
  MicroTexturePack,
  MicroDetailPack,
  Framing,
} from "./schemas";
import { FRAMING_COMPOSITIONS } from "@/data/defaults";

// ============================================
// TYPES
// ============================================

export interface CompilerContext {
  characters: CharacterProfile[];
  wardrobes: WardrobeProfile[];
  looks: LookFamily[];
  lenses: LensProfile[];
  microTextures: MicroTexturePack[];
  microDetails: MicroDetailPack[];
}

export interface CompiledPrompt {
  text: string;
  resolvedLens: {
    profile: LensProfile;
    source: "auto" | "manual";
    warning?: string;
  };
  seedSummary: string;
}

// ============================================
// LENS RESOLUTION (from addendum A)
// ============================================

function resolveLens(
  request: PromptRequest,
  looks: LookFamily[],
  lenses: LensProfile[]
): { profile: LensProfile; source: "auto" | "manual"; warning?: string } {
  if (request.lensMode === "manual" && request.lensProfileId) {
    const lens = lenses.find((l) => l.id === request.lensProfileId);
    if (lens) {
      return { profile: lens, source: "manual" };
    }
  }

  // Auto mode: resolve from look's recommendedLensByFraming
  const look = looks.find((l) => l.id === request.lookFamilyId);
  if (look) {
    const recommendedFocal = look.recommendedLensByFraming[request.framing];
    const lens = lenses.find((l) => l.focalLengthMm === recommendedFocal);
    if (lens) {
      return { profile: lens, source: "auto" };
    }
  }

  // Fallback to 50mm with warning
  const fallback = lenses.find((l) => l.focalLengthMm === "50");
  if (fallback) {
    return {
      profile: fallback,
      source: "auto",
      warning: "Lens auto-mapping missing; defaulted to 50mm",
    };
  }

  // Last resort: first available lens
  return {
    profile: lenses[0],
    source: "auto",
    warning: "No suitable lens found; using first available",
  };
}

// ============================================
// SEED SUMMARY GENERATOR
// ============================================

function generateSeedSummary(
  request: PromptRequest,
  context: CompilerContext,
  resolvedLens: LensProfile
): string {
  const look = context.looks.find((l) => l.id === request.lookFamilyId);
  const characterNames = request.cast
    .map((c) => context.characters.find((ch) => ch.id === c.characterId)?.uiName)
    .filter(Boolean)
    .join(", ");

  const framingLabel = request.framing.replace("_", " ");

  return `[${request.aspectRatio}] ${characterNames} | ${framingLabel} | ${resolvedLens.focalLengthMm}mm | ${look?.uiName || "Unknown Look"}`;
}

// ============================================
// COMPACT OUTPUT COMPILER
// ============================================

export function compileCompact(
  request: PromptRequest,
  context: CompilerContext
): CompiledPrompt {
  const sections: string[] = [];
  const resolvedLensResult = resolveLens(request, context.looks, context.lenses);
  const look = context.looks.find((l) => l.id === request.lookFamilyId);

  // 1. Scene Heart
  sections.push(`SCENE HEART:\n${request.sceneHeart}`);

  // 2. Cast + Wardrobe (paired blocks - CRITICAL requirement)
  const castLines: string[] = [];
  request.cast.forEach((member, idx) => {
    const character = context.characters.find((c) => c.id === member.characterId);
    const wardrobe = context.wardrobes.find((w) => w.id === member.wardrobeId);
    const charNum = idx + 1;

    if (character) {
      castLines.push(`- Character ${charNum} (identity): ${character.injectedText}`);
    }
    if (wardrobe) {
      let wardrobeText = wardrobe.outfitText;
      if (wardrobe.bansText) {
        wardrobeText += ` [BANS: ${wardrobe.bansText}]`;
      }
      castLines.push(`- Character ${charNum} (wardrobe): ${wardrobeText}`);
    }
  });
  sections.push(`CAST + WARDROBE (paired locks):\n${castLines.join("\n")}`);

  // 3. Mechanic Lock
  sections.push(`MECHANIC LOCK:\n${request.mechanicLock}`);

  // 4. Focus Target
  sections.push(`FOCUS TARGET:\n${request.focusTarget}`);

  // 5. Environment Anchors
  const anchors = request.environmentAnchors.filter((a) => a.trim());
  sections.push(`ENVIRONMENT ANCHORS:\n${anchors.map((a) => `- ${a}`).join("\n")}`);

  // 6. Composition/Staging
  const compositionText = FRAMING_COMPOSITIONS[request.framing] || "";
  sections.push(`COMPOSITION/STAGING:\n${compositionText}`);

  // 7. Camera/Optics
  const lensSource = resolvedLensResult.source === "auto" ? " (Auto via Look Default)" : " (Manual)";
  sections.push(
    `CAMERA/OPTICS${lensSource}: ${resolvedLensResult.profile.focalLengthMm}mm\n${resolvedLensResult.profile.injectedText}`
  );

  // 8. Look (Lighting + Color Grade + Finish)
  if (look) {
    sections.push(`LOOK (${look.uiName}):\n${look.injectedText}`);
  }

  // 9. Micro-textures
  const selectedTextures = context.microTextures.filter((t) =>
    request.selectedMicroTextures.includes(t.id)
  );
  if (selectedTextures.length > 0) {
    const textureItems = selectedTextures.flatMap((t) => t.items);
    sections.push(`MICRO-TEXTURES:\n${textureItems.map((i) => `- ${i}`).join("\n")}`);
  }

  // 10. Micro-details
  const selectedDetails = context.microDetails.filter((d) =>
    request.selectedMicroDetails.includes(d.id)
  );
  if (selectedDetails.length > 0) {
    const detailItems = selectedDetails.flatMap((d) => d.items);
    sections.push(`MICRO-DETAILS:\n${detailItems.map((i) => `- ${i}`).join("\n")}`);
  }

  // 11. Output Specs
  const cropRule =
    request.framing === "full_body"
      ? "NO CROPPING - hands and feet must be fully visible"
      : request.framing === "face_emotion"
        ? "Avoid awkward cropping of chin/forehead"
        : "";
  sections.push(
    `OUTPUT SPECS:\nAspect Ratio: ${request.aspectRatio}${cropRule ? `\nCrop Rule: ${cropRule}` : ""}`
  );

  // 12. Seed Summary
  const seedSummary = generateSeedSummary(request, context, resolvedLensResult.profile);
  sections.push(`SEED SUMMARY:\n${seedSummary}`);

  return {
    text: sections.join("\n\n"),
    resolvedLens: resolvedLensResult,
    seedSummary,
  };
}

// ============================================
// EXPANDED (5-STAR) OUTPUT COMPILER
// ============================================

export function compileExpanded(
  request: PromptRequest,
  context: CompilerContext
): CompiledPrompt {
  const sections: string[] = [];
  const resolvedLensResult = resolveLens(request, context.looks, context.lenses);
  const look = context.looks.find((l) => l.id === request.lookFamilyId);

  // 1. WHO/WHAT/WHERE (Scene Heart)
  sections.push(`== WHO/WHAT/WHERE ==\n${request.sceneHeart}`);

  // 2. Materials + Micro-textures
  const selectedTextures = context.microTextures.filter((t) =>
    request.selectedMicroTextures.includes(t.id)
  );
  if (selectedTextures.length > 0) {
    const textureItems = selectedTextures.flatMap((t) => t.items);
    sections.push(`== MATERIALS & MICRO-TEXTURES ==\n${textureItems.map((i) => `- ${i}`).join("\n")}`);
  }

  // 3. Micro-details
  const selectedDetails = context.microDetails.filter((d) =>
    request.selectedMicroDetails.includes(d.id)
  );
  if (selectedDetails.length > 0) {
    const detailItems = selectedDetails.flatMap((d) => d.items);
    sections.push(`== MICRO-DETAILS ==\n${detailItems.map((i) => `- ${i}`).join("\n")}`);
  }

  // 4. Composition / Staging (includes anchors + framing rules)
  const compositionText = FRAMING_COMPOSITIONS[request.framing] || "";
  const anchors = request.environmentAnchors.filter((a) => a.trim());
  sections.push(
    `== COMPOSITION / STAGING ==\n${compositionText}\n\nEnvironment Anchors:\n${anchors.map((a) => `- ${a}`).join("\n")}`
  );

  // 5. Camera & Optics
  const lensSource = resolvedLensResult.source === "auto" ? " (Auto via Look Default)" : " (Manual)";
  sections.push(
    `== CAMERA & OPTICS ==${lensSource}\nFocal Length: ${resolvedLensResult.profile.focalLengthMm}mm\n${resolvedLensResult.profile.injectedText}`
  );

  // 6. Lighting (from Look)
  if (look) {
    // Extract lighting portion - in our schema it's combined, so we use the full text
    sections.push(`== LIGHTING ==\n${look.injectedText}`);
  }

  // 7. Art Direction / Style (Finish) - using look's finish portion
  // Since our injectedText combines all, we reference the look's summary
  if (look) {
    sections.push(
      `== ART DIRECTION / STYLE ==\nLook: ${look.uiName}\nProduces: ${look.producesSummary.join("; ")}`
    );
  }

  // 8. Color Grade - referenced as part of look
  // Placeholder since our schema combines these
  sections.push(`== COLOR GRADE ==\nApplied via Look: ${look?.uiName || "None selected"}`);

  // 9. Locks (paired identity+wardrobe per character)
  const lockLines: string[] = [];
  request.cast.forEach((member, idx) => {
    const character = context.characters.find((c) => c.id === member.characterId);
    const wardrobe = context.wardrobes.find((w) => w.id === member.wardrobeId);
    const charNum = idx + 1;

    if (character) {
      lockLines.push(`Character ${charNum} Identity Lock: ${character.injectedText}`);
    }
    if (wardrobe) {
      let wardrobeText = wardrobe.outfitText;
      if (wardrobe.bansText) {
        wardrobeText += ` [BANS: ${wardrobe.bansText}]`;
      }
      lockLines.push(`Character ${charNum} Wardrobe Lock: ${wardrobeText}`);
    }
    if (idx < request.cast.length - 1) {
      lockLines.push(""); // Blank line between characters
    }
  });
  sections.push(`== CHARACTER LOCKS ==\n${lockLines.join("\n")}`);

  // 10. Mechanic Lock
  sections.push(`== MECHANIC LOCK ==\n${request.mechanicLock}`);

  // 11. Focus Target
  sections.push(`== FOCUS TARGET ==\n${request.focusTarget}`);

  // 12. Output Quality Specs
  const cropRule =
    request.framing === "full_body"
      ? "NO CROPPING - hands and feet must be fully visible"
      : request.framing === "face_emotion"
        ? "Avoid awkward cropping of chin/forehead"
        : "";
  sections.push(
    `== OUTPUT QUALITY SPECS ==\nAspect Ratio: ${request.aspectRatio}\nFraming: ${request.framing.replace("_", " ")}${cropRule ? `\nCrop Rule: ${cropRule}` : ""}`
  );

  // 13. Seed Summary
  const seedSummary = generateSeedSummary(request, context, resolvedLensResult.profile);
  sections.push(`== SEED SUMMARY ==\n${seedSummary}`);

  return {
    text: sections.join("\n\n"),
    resolvedLens: resolvedLensResult,
    seedSummary,
  };
}

// ============================================
// MAIN COMPILE FUNCTION
// ============================================

export function compilePrompt(
  request: PromptRequest,
  context: CompilerContext
): CompiledPrompt {
  if (request.outputMode === "expanded") {
    return compileExpanded(request, context);
  }
  return compileCompact(request, context);
}
