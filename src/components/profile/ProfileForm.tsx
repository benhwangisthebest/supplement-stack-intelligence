"use client";

import { useState } from "react";
import {
  OUTCOME_CATEGORIES,
  SUPPLEMENT_FORMS,
  type ExperienceLevel,
  type OutcomeCategory,
  type RiskTolerance,
  type SupplementForm,
  type UserProfile,
} from "@/types";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { TagInput } from "@/components/ui/TagInput";

type SaveState = "idle" | "saving" | "saved" | "error";

// Design §5.4 — Profile core fields. Persists via PUT /api/profile.
export function ProfileForm({ initial }: { initial: UserProfile | null }) {
  const [goals, setGoals] = useState<OutcomeCategory[]>(initial?.goals ?? []);
  const [diet, setDiet] = useState(initial?.diet ?? "");
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance | "">(
    initial?.riskTolerance ?? "",
  );
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">(
    initial?.experienceLevel ?? "",
  );
  const [caffeineSensitivity, setCaffeineSensitivity] = useState<boolean>(
    initial?.caffeineSensitivity ?? false,
  );
  const [allergies, setAllergies] = useState<string[]>(initial?.allergies ?? []);
  const [medications, setMedications] = useState<string[]>(initial?.medications ?? []);
  const [avoidedIngredients, setAvoidedIngredients] = useState<string[]>(
    initial?.avoidedIngredients ?? [],
  );
  const [formPreferences, setFormPreferences] = useState<SupplementForm[]>(
    initial?.formPreferences ?? [],
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goals,
          diet: diet || null,
          riskTolerance: riskTolerance || null,
          experienceLevel: experienceLevel || null,
          caffeineSensitivity,
          allergies,
          medications,
          avoidedIngredients,
          formPreferences,
          notes: notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Failed to save profile.");
      setState("saved");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Failed to save profile.");
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-6"
    >
      <MultiSelect
        label="Goals"
        options={OUTCOME_CATEGORIES.map((c) => ({ value: c, label: c }))}
        selected={goals}
        onChange={setGoals}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Diet</span>
          <input
            value={diet}
            onChange={(e) => setDiet(e.target.value)}
            placeholder="e.g. omnivore, vegan"
            className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Risk tolerance</span>
          <select
            value={riskTolerance}
            onChange={(e) => setRiskTolerance(e.target.value as RiskTolerance | "")}
            className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          >
            <option value="">—</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Experience</span>
          <select
            value={experienceLevel}
            onChange={(e) => setExperienceLevel(e.target.value as ExperienceLevel | "")}
            className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
          >
            <option value="">—</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={caffeineSensitivity}
          onChange={(e) => setCaffeineSensitivity(e.target.checked)}
        />
        <span className="font-medium text-neutral-700">Caffeine sensitive</span>
      </label>

      <TagInput
        label="Allergies & sensitivities"
        values={allergies}
        onChange={setAllergies}
        placeholder="Type and press Enter (e.g. fish, milk)"
      />
      <TagInput
        label="Medications"
        values={medications}
        onChange={setMedications}
        placeholder="Type and press Enter"
      />
      <TagInput
        label="Avoided ingredients"
        values={avoidedIngredients}
        onChange={setAvoidedIngredients}
        placeholder="Type and press Enter"
      />

      <MultiSelect
        label="Form preferences"
        options={SUPPLEMENT_FORMS.map((f) => ({ value: f, label: f }))}
        selected={formPreferences}
        onChange={setFormPreferences}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={state === "saving"}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {state === "saving" ? "Saving…" : "Save profile"}
        </button>
        {state === "saved" && <span className="text-sm text-emerald-600">Saved ✓</span>}
        {state === "error" && error && (
          <span role="alert" className="text-sm text-red-600">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
