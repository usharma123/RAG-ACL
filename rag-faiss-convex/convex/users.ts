import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    tenantId: v.string(),
    email: v.string(),
    role: v.string(),
    allowedSources: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_tenant_email", (q) =>
        q.eq("tenantId", args.tenantId).eq("email", args.email),
      )
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("users", args);
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => await ctx.db.get(args.userId),
});
