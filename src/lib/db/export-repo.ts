// Infrastructure — the user's complete data export (Phase 2 U16, roadmap 8 read
// half). Composes the existing per-table repositories; owns no SQL of its own.
//
// ===========================================================================
// THE TWELVE TABLES, AND WHY THERE ARE TWELVE AND NOT THIRTEEN
// ===========================================================================
// The migration set creates THIRTEEN tables. The exit criterion says "all 12".
// That number had never been enumerated anywhere, and at the 2026-08-12 owner
// sitting the SQL editor's list view happened to DISPLAY twelve — one row had
// scrolled off — which would have "confirmed" the criterion against a rendering
// artifact. `count(*)` said thirteen. So the twelve are enumerated here, derived
// from ownership in the migrations rather than from anyone's memory:
//
//   DIRECTLY OWNED — `user_id uuid NOT NULL references auth.users(id)` (9):
//     user_profiles, stacks, lab_panels, lab_markers, advisor_conversations,
//     advisor_actions, advisor_usage, checkins, side_effect_reports
//
//   TRANSITIVELY OWNED (3):
//     stack_items        -> stacks.user_id
//     evaluation_flags   -> stacks.user_id
//     advisor_messages   -> advisor_conversations.user_id
//
// 9 + 3 = 12. The thirteenth is `api_rate_limits`, excluded — see
// EXPORT_EXCLUSIONS below, and `src/architecture/export-coverage.test.ts`, which
// derives the whole partition from the migrations and fails if a future table
// is neither exported nor excluded. That guard, not this comment, is what keeps
// the list true.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getProfile } from "./profile-repo";
import { listStacks } from "./stack-repo";
import { listItems } from "./stack-item-repo";
import { listFlags } from "./evaluation-flag-repo";
import { listPanels } from "./lab-panel-repo";
import { listLabMarkers } from "./lab-marker-repo";
import { listAllCheckins } from "./checkin-repo";
import { listAllSideEffectReports } from "./side-effect-repo";
import { listActionsByUser } from "./advisor-action-repo";
import { listConversations, getMessages, listUsageRows } from "@/lib/advisor/repo";

/**
 * Tables deliberately NOT exported, each with the reason. Asserted against the
 * migrations by `EXPORT_COVERAGE`: an entry naming a table that does not exist
 * is as red as a table that is neither exported nor listed here.
 */
export const EXPORT_EXCLUSIONS: Record<string, string> = {
  api_rate_limits:
    "Not the user's data — the rate limiter's state about a BUCKET. Three facts from the schema, " +
    "none of which hold for any of the twelve: its primary key is (bucket_key, window_start); its " +
    "`user_id` is the ONLY NULLABLE ownership column among the thirteen tables; and migration 0009's " +
    "own header states that `user_id` is kept alongside `bucket_key` \"purely so RLS can grant the " +
    "SELECT — it is not the key\". `bucket_key` is an opaque string designed so a future per-IP or " +
    "per-API-key bucket needs no migration, so a row here may describe no user at all. Exporting it " +
    "would hand someone enforcement machinery in the shape of personal data.",
};

/** What the export deliberately leaves out, stated IN the payload. */
export interface ExportOmission {
  what: string;
  where: string;
  why: string;
}

export interface UserDataExport {
  exportedAt: string;
  userId: string;
  /**
   * Scope honesty, shipped in the artifact itself rather than in documentation
   * a reader would have to go and find. A user opening "an export of my data"
   * should not have to diff the schema to discover what is not in it.
   */
  notIncluded: ExportOmission[];
  tables: Record<string, unknown>;
}

/**
 * Everything the twelve tables hold for one user.
 *
 * NO WINDOWS. `listAllCheckins` / `listAllSideEffectReports` exist because the
 * ordinary readers default to 90 days — right for a dashboard, silently wrong
 * here, because a truncated export looks exactly like a complete one.
 *
 * NOTHING IS LOGGED. This payload is the user's complete health record, and
 * §2.3 rule 15 says health data is not logged. There is no logging call in this
 * module or in the route above it, and
 * `src/app/api/account/export/route.test.ts` proves it behaviourally by spying
 * on every `console` method during a real export rather than by grepping for
 * `console.` — which would only ever have checked one file.
 */
export async function exportUserData(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserDataExport> {
  const [profile, stacks, panels, markers, conversations, actions, checkins, sideEffects, usage] =
    await Promise.all([
      getProfile(supabase, userId),
      listStacks(supabase, userId),
      listPanels(supabase, userId),
      listLabMarkers(supabase, userId),
      listConversations(supabase, userId),
      listActionsByUser(supabase, userId),
      listAllCheckins(supabase, userId),
      listAllSideEffectReports(supabase, userId),
      listUsageRows(supabase, userId),
    ]);

  // The three transitively-owned tables. Read per parent, because that is the
  // only handle they have — they carry no `user_id` column (which is also why
  // REPO_SCOPING exempts exactly these three).
  const stackItems = await Promise.all(stacks.map((s) => listItems(supabase, s.id)));
  const flags = await Promise.all(stacks.map((s) => listFlags(supabase, s.id)));
  const messages = await Promise.all(conversations.map((c) => getMessages(supabase, c.id)));

  return {
    exportedAt: new Date().toISOString(),
    userId,
    notIncluded: OMISSIONS,
    tables: {
      user_profiles: profile ? [profile] : [],
      stacks,
      stack_items: stackItems.flat(),
      evaluation_flags: flags.flat(),
      lab_panels: panels,
      lab_markers: markers,
      advisor_conversations: conversations,
      advisor_messages: messages.flat(),
      advisor_actions: actions,
      advisor_usage: usage,
      checkins,
      side_effect_reports: sideEffects,
    },
  };
}

/**
 * Stated in the payload, per the U17 scope-honesty precedent applied to the read
 * half. Both entries describe things a reader could reasonably expect to find.
 */
const OMISSIONS: ExportOmission[] = [
  {
    what: "Your account identity — email address, sign-in metadata, and account timestamps.",
    where: "Supabase's `auth.users`, which this application does not own or read.",
    why:
      "The twelve tables exported here are the application's own data about you. The identity row " +
      "lives in the authentication provider's schema, outside them. It is not omitted because it is " +
      "unimportant — it is omitted because this export cannot speak for a schema it does not own.",
  },
  {
    what: "Rate-limiter state.",
    where: "`api_rate_limits`, the thirteenth table in the schema.",
    why:
      "It records a limiter's counters against an opaque bucket key rather than facts about you; its " +
      "owner column is nullable and, per migration 0009, \"is not the key\". A row there may describe " +
      "no user at all.",
  },
];
