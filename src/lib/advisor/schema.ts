// Application boundary — Zod validation for the advisor API (Design §4.2, §6).
import { z } from "zod";

export const advisorRequestSchema = z.object({
  // null/omitted → start a new conversation; otherwise continue an existing one.
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1, "Message is required.").max(2000),
});

export type AdvisorRequest = z.infer<typeof advisorRequestSchema>;
