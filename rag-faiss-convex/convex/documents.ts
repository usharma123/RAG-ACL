import { query } from "./_generated/server";
import { v } from "convex/values";

export const getMany = query({
  args: { ids: v.array(v.id("documents")), tenantId: v.string() },
  handler: async (ctx, args) => {
    const out = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (doc && doc.tenantId === args.tenantId) out.push(doc);
    }
    return out;
  },
});

export const get = query({
  args: { id: v.id("documents"), tenantId: v.string() },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (doc && doc.tenantId === args.tenantId) return doc;
    return null;
  },
});
