import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

export const add = mutation({
  args: {
    tenantId: v.string(),
    userId: v.id("users"),
    message: v.string(),
    answer: v.string(),
    allowedSources: v.array(v.string()),
    retrieved: v.array(
      v.object({
        sourceKey: v.string(),
        score: v.number(),
        docId: v.id("documents"),
        docTitle: v.string(),
        chunkId: v.id("chunks"),
        chunkIndex: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) =>
    await ctx.db.insert("queryLogs", { ...args, createdAt: Date.now() }),
});

export const addFeedback = mutation({
  args: {
    logId: v.id("queryLogs"),
    userId: v.id("users"),
    helpful: v.boolean(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.logId);
    if (!log) {
      throw new Error("Log not found");
    }
    
    // Check if user owns this log or is admin
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    const isAdmin = user.role === "admin";
    const isOwner = log.userId === args.userId;
    
    if (!isAdmin && !isOwner) {
      throw new Error("Not authorized to provide feedback on this query");
    }
    
    return await ctx.db.insert("feedback", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
