"use client";

import { CharacterProfile, WardrobeProfile, CastMember } from "@/lib/schemas";

interface CastWardrobeBinderProps {
  characters: CharacterProfile[];
  wardrobes: WardrobeProfile[];
  cast: CastMember[];
  onChange: (cast: CastMember[]) => void;
}

export function CastWardrobeBinder({
  characters,
  wardrobes,
  cast,
  onChange,
}: CastWardrobeBinderProps) {
  const toggleCharacter = (characterId: string) => {
    const existing = cast.find((c) => c.characterId === characterId);
    if (existing) {
      onChange(cast.filter((c) => c.characterId !== characterId));
    } else {
      onChange([...cast, { characterId, wardrobeId: "" }]);
    }
  };

  const setWardrobe = (characterId: string, wardrobeId: string) => {
    onChange(
      cast.map((c) =>
        c.characterId === characterId ? { ...c, wardrobeId } : c
      )
    );
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newCast = [...cast];
    [newCast[index - 1], newCast[index]] = [newCast[index], newCast[index - 1]];
    onChange(newCast);
  };

  const moveDown = (index: number) => {
    if (index === cast.length - 1) return;
    const newCast = [...cast];
    [newCast[index], newCast[index + 1]] = [newCast[index + 1], newCast[index]];
    onChange(newCast);
  };

  const isSelected = (characterId: string) =>
    cast.some((c) => c.characterId === characterId);

  return (
    <div className="space-y-4">
      {/* Character selection */}
      <div>
        <label className="label">Select Cast Members</label>
        {characters.length === 0 ? (
          <p className="text-sm text-canvas-500 italic">
            No characters created yet.{" "}
            <a href="/characters" className="text-paw-600 hover:underline">
              Create characters first
            </a>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {characters.map((character) => (
              <button
                key={character.id}
                type="button"
                onClick={() => toggleCharacter(character.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isSelected(character.id)
                    ? "bg-paw-500 text-white shadow-md"
                    : "bg-canvas-100 text-canvas-700 hover:bg-canvas-200"
                }`}
              >
                {character.uiName}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Wardrobe bindings */}
      {cast.length > 0 && (
        <div>
          <label className="label">Wardrobe Bindings</label>
          <p className="text-xs text-canvas-500 mb-3">
            Assign exactly one wardrobe to each cast member. Use arrows to reorder (affects output order).
          </p>
          <div className="space-y-2">
            {cast.map((member, index) => {
              const character = characters.find(
                (c) => c.id === member.characterId
              );
              if (!character) return null;

              return (
                <div
                  key={member.characterId}
                  className="flex items-center gap-3 p-3 bg-canvas-50 rounded-xl border border-canvas-200"
                >
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-0.5 text-canvas-400 hover:text-canvas-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(index)}
                      disabled={index === cast.length - 1}
                      className="p-0.5 text-canvas-400 hover:text-canvas-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Character name */}
                  <div className="flex-shrink-0 min-w-[120px]">
                    <span className="font-medium text-canvas-800">
                      {index + 1}. {character.uiName}
                    </span>
                  </div>

                  {/* Arrow */}
                  <svg className="w-5 h-5 text-canvas-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>

                  {/* Wardrobe select */}
                  <select
                    className={`select flex-1 ${
                      !member.wardrobeId ? "border-red-300 bg-red-50" : ""
                    }`}
                    value={member.wardrobeId}
                    onChange={(e) => setWardrobe(member.characterId, e.target.value)}
                  >
                    <option value="">Select wardrobe...</option>
                    {wardrobes.map((wardrobe) => (
                      <option key={wardrobe.id} value={wardrobe.id}>
                        {wardrobe.uiName}
                      </option>
                    ))}
                  </select>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => toggleCharacter(member.characterId)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    title="Remove from cast"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
          {wardrobes.length === 0 && (
            <p className="text-sm text-amber-600 mt-2">
              ⚠️ No wardrobes created yet.{" "}
              <a href="/wardrobes" className="underline hover:no-underline">
                Create wardrobes
              </a>{" "}
              to bind to characters.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
