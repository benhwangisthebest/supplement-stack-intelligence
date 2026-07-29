// Domain: public type surface (Design §3.1)
// This layer is PURE — no React, no Supabase, no I/O (Design §9.2).
//
// Architecture: this is a BARREL and nothing else. It declares NO types of its
// own — declarations live in ./primitives or in the owning leaf. Modules inside
// src/types/ must NOT import from here (that would create index → leaf → index);
// they import ./primitives or the owning sibling directly. External consumers
// keep importing "@/types" exactly as before.

export * from "./primitives";
export * from "./supplement";
export * from "./evidence-grading";
export * from "./effect";
export * from "./paper";
export * from "./profile";
export * from "./stack";
export * from "./evaluation";
export * from "./protocol";
export * from "./product";
