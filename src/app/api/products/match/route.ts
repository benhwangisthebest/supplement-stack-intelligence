// Application — POST /api/products/match (Design §4.2). I/O only; scoring in lib/product-matcher.
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth/session";
import { getStack } from "@/lib/db/stack-repo";
import { listItems } from "@/lib/db/stack-item-repo";
import { getProfile } from "@/lib/db/profile-repo";
import { matchProducts } from "@/lib/product-matcher";
import { matchProductsSchema } from "@/lib/validation/schemas";
import { handle, notFound, ok, unauthorized } from "@/lib/api/respond";

export async function POST(request: NextRequest) {
  return handle(async () => {
    const user = await getUser();
    if (!user) return unauthorized();

    const { stackId } = matchProductsSchema.parse(await request.json());
    const supabase = await createClient();

    const stack = await getStack(supabase, user.id, stackId);
    if (!stack) return notFound("Stack");

    const [stackItems, profile] = await Promise.all([
      listItems(supabase, stackId),
      getProfile(supabase, user.id),
    ]);

    // Plan SC: deterministic, allergen-safe, affiliate-independent matching.
    const result = matchProducts({ stackItems, profile });
    return ok(result);
  });
}
