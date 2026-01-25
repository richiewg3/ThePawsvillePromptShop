import { describe, expect, it } from "vitest";
import { validateOneAndDoneSuggestion } from "./one-and-done";
import { OneAndDoneSuggestion } from "./schemas";

const baseSuggestion: OneAndDoneSuggestion = {
  ultraPrecisePrompt: { text: "Ultra precise prompt text.", confidence: "high" },
  environmentAnchors: {
    anchors: [
      "foreground left: a stone fountain ~2m from camera, fully visible",
      "background right: tall stained-glass window ~10m away, must be visible",
      "midground center: oak table ~4m away, visible top surface",
    ],
    confidence: "high",
  },
  lookLens: {
    lookFamilyId: "look-1",
    lensMode: "manual",
    lensProfileId: "lens-1",
    confidence: "medium",
  },
  mechanicLock: { text: "The lantern glows, causing soft light on the floor.", confidence: "high" },
  focusTarget: { text: "Focus on the character's hands and lantern flame.", confidence: "high" },
  microPacks: {
    texturePackIds: ["texture-1"],
    detailPackIds: ["detail-1"],
    confidence: "medium",
  },
  assumptions: ["Indoor cathedral lighting."],
};

const options = {
  lookFamilies: [{ id: "look-1", name: "Soft Film" }],
  lensProfiles: [{ id: "lens-1", name: "Normal 50", focalLengthMm: "50" }],
  microTexturePacks: [{ id: "texture-1", name: "Stonework" }],
  microDetailPacks: [{ id: "detail-1", name: "Dust Motes" }],
};

describe("validateOneAndDoneSuggestion", () => {
  it("accepts valid look/lens and micro packs", () => {
    const result = validateOneAndDoneSuggestion(baseSuggestion, options);

    expect(result.lookLens.valid).toBe(true);
    expect(result.lookLens.value?.lookFamilyId).toBe("look-1");
    expect(result.lookLens.value?.lensProfileId).toBe("lens-1");
    expect(result.microPacks.valid).toBe(true);
    expect(result.microPacks.value?.texturePackIds).toEqual(["texture-1"]);
  });

  it("flags invalid options for look/lens and micro packs", () => {
    const invalidSuggestion: OneAndDoneSuggestion = {
      ...baseSuggestion,
      lookLens: {
        lookFamilyId: "missing-look",
        lensMode: "manual",
        lensProfileId: "missing-lens",
        confidence: "low",
      },
      microPacks: {
        texturePackIds: ["missing-texture"],
        detailPackIds: ["missing-detail"],
        confidence: "low",
      },
    };

    const result = validateOneAndDoneSuggestion(invalidSuggestion, options);

    expect(result.lookLens.valid).toBe(false);
    expect(result.microPacks.valid).toBe(false);
  });
});
