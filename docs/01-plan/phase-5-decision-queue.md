# Phase 5 — decision queue

> **Append-only**, in Phase 4's form (`docs/01-plan/phase-4-decision-queue.md`, plan §6 D-1 item 5). A unit writes
> a question here instead of deciding it. An entry never blocks independent work. A unit waiting on one parks,
> and a batch-bearing landing waits for its answer. The owner answers inline, dated. Only the owner writes an
> answer. New entries continue the numbering at **Q-32**.
>
> **Opened 2026-10-08** with the draft of `docs/01-plan/phase-5-advisor-reliability.plan.md` (base `3e3e351`).
> The four entries Phase 4 carried (`features/p4-closeout.plan.md` §6; Check PC-6; closeout (b) task 2) are
> recorded here. Their text stays in the Phase 4 queue, which is closed history and is not edited.

## Carried from Phase 4

| # | Date | Origin | Question (Phase 4 queue, abridged) | Phase 5 disposition | Blocks |
|---|---|---|---|---|---|
| Q-20 | 2026-09-29 | U19 | Eight SQL comment strippers in seven specs under `src/architecture/` use the unanchored `/--[^\n]*/g`, keeping N-79's class: a `--` inside a SQL string literal would blank the rest of its line. Exposure today: none. Options: (a) register an FU for a string-aware SQL stripper · (b) accept as a stated limit, written beside the strippers in a later unit · (c) leave | **Queued, OUT of Phase 5's units** (owner direction 2026-10-08: one focus). Still unanswered. No Phase 5 unit touches those specs, and none adds a SQL string literal containing `--`. **Re-raise** when a migration adds such a literal, or when a unit opens any of the seven specs | no |
| Q-29 | 2026-10-08 | U27 | N-124: an explicit add request got a prose confirmation question instead of a proposal card. Options: (a) raise effort or change the model · (b) a prompt change · (c) both · (d) carry | **SUPERSEDED by plan D-5** (model and effort policy) **and D-12** (the seeded-stack reading, found at review P-02), with U3 as the prompt half. **Closes when the owner rules D-5 and D-12**; nothing here answers it. Reason: Phase 5 measures the behaviour (U2) before choosing the lever, which this entry's options could not do | no |
| Q-30 | 2026-10-08 | U27 | N-125: is the abstention intended when the profile lists no medications? Options: (a) intended, the spec changes · (b) not intended, the advisor says the profile lists none · (c) carry | **SUPERSEDED by plan D-4** (same options, re-stated with what the code shows: the reply is the deterministic `REFUSAL_NO_DATA`, whose trigger U2 will identify; plan §2). **Closes when the owner rules D-4** | no |
| Q-31 | 2026-10-08 | U27 | N-126: multi-action proposals in one reply, or one change per reply? Options: (a) multi-action, a prompt change · (b) one per reply, the spec rewritten · (c) carry | **SUPERSEDED by plan D-3** (same choice; option (b) now also caps the loop at 1, so the engine enforces it). **Closes when the owner rules D-3** | no |

## Phase 5 entries

| # | Date | Unit | Question | Options | Blocks |
|---|---|---|---|---|---|
