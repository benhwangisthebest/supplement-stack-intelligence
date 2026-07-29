// Auth — pure form-action state contract (Design §7).
//
// Architecture: deliberately NOT inside ./actions.ts. That module carries the
// "use server" directive, whose value exports must all be async functions; and
// the "use client" AuthForm needs this shape without reaching into a server
// module. Keeping the type here lets Presentation depend on lib/, never on app/.
export interface AuthActionState {
  error: string | null;
}
