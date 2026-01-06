import { query } from "./_generated/server";
import { v } from "convex/values";

export const getMany = query({
  args: { ids: v.array(v.id("chunks")), tenantId: v.string() },
  handler: async (ctx, args) => {
    const out = [];
    for (const id of args.ids) {
      const c = await ctx.db.get(id);
      // Tenant isolation: only return chunks belonging to the requesting tenant
      if (c && c.tenantId === args.tenantId) out.push(c);
    }
    return out;
  },
});
