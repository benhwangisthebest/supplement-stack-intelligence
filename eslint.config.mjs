// ESLint flat config — Phase 2 U18, roadmap item 9.
//
// ===========================================================================
// WHAT THIS IS NOT: `eslint-config-next`
// ===========================================================================
// The obvious move was `next lint` with `eslint-config-next`, and it was
// declined deliberately. That config enables `next/core-web-vitals` and a
// sizeable set of rules nobody in this repository has adjudicated, which is
// how a linter arrives pre-loaded with opinions its users never chose. The
// roadmap names ONE thing as valuable — `eslint-plugin-react-hooks`, across
// 33 client components — and that is what is here.
//
// **Every rule that fires in this repository should be a rule someone chose.**
// Adding a shared config later is a decision to be argued, not a default.
//
// `next lint` is not used at all: it cannot run non-interactively (see
// `scripts/verify-lint.mjs`), it produces no machine-readable output for the
// scope assertion, and it is removed in Next 16.
//
// ===========================================================================
// WHY ESLint 9 AND NOT 10
// ===========================================================================
// Recorded so a future bump is a visible decision rather than a drift. ESLint
// 10 is current; 9 has the widest plugin peer range today, and no adjudicated
// reason to be on the newest major exists. The rules and plugins are the
// deliverable; the runner's major version is not. Note `@eslint/js` must be
// pinned to the SAME major — leaving it unpinned resolves to 10.x, whose peer
// range excludes eslint 9, and the install fails. That is the dependency
// stating a real constraint, and it is honoured rather than overridden.
//
// ===========================================================================
// reportUnusedDisableDirectives — THE STRUCTURAL FIX
// ===========================================================================
// U18 found FIVE `eslint-disable` comments naming rules from tooling that had
// never been installed. All five were inert: they suppressed nothing, and they
// were written by people who could not have seen the violation they claim to
// waive, because no linter had ever run here.
//
// With this set to "error", a disable comment that suppresses nothing is
// itself an error. The state U18 cleaned up becomes UNREPRESENTABLE rather
// than merely cleaned up once — which is the difference between fixing a bug
// and removing its habitat.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  {
    // Not source. Build output, dependencies, and coverage artifacts are
    // generated — linting them reports on code nobody wrote.
    //
    // KEEP THIS LIST MINIMAL AND JUSTIFIED. `LINT_SCOPE` derives its expected
    // file set from `git ls-files`, NOT from this list, precisely so that
    // widening it cannot quietly shrink what gets linted: anything tracked and
    // ignored here must appear in that guard's exemption list with a reason.
    ignores: [".next/**", "node_modules/**", "coverage/**", "playwright-report/**", "test-results/**"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    linterOptions: {
      // See the header. An inert disable comment is an error.
      reportUnusedDisableDirectives: "error",
    },
  },

  {
    files: ["**/*.{ts,tsx,mjs}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // `_`-prefixed bindings are the conventional "deliberately unused"
      // marker. `ignoreRestSiblings` defaults to true and is set explicitly
      // because `src/lib/product-matcher/index.ts` DEPENDS on it — see the
      // comment at that site; it is a §2.4 rule 17 boundary, not a style
      // preference.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },

  {
    // The one rule set the roadmap actually asks for.
    files: ["src/**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  {
    // Scripts and the seed are CLI entry points: printing is their output, not
    // a debugging leftover. `no-console` is NOT enabled anywhere in this config
    // (it is not part of `js.configs.recommended` either), so this block exists
    // to document the decision rather than to undo a rule — there were two
    // `eslint-disable-next-line no-console` comments in `seed.ts` waiving a
    // rule that was never on.
    files: ["scripts/**/*.mjs", "src/lib/db/seed.ts"],
    rules: {},
  },
);
