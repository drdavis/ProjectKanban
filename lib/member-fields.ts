import { z } from "zod";

export const memberFields = z.object({
  productId: z.uuid(),
  userId: z.string().trim().regex(/^[A-Za-z0-9_-]+$/).max(100),
  role: z.enum(["viewer", "editor", "remove"]),
});
export type MemberRole = Exclude<z.infer<typeof memberFields>["role"], "remove">;
