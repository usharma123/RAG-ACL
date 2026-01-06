import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const addDocument = mutation({
  args: {
    tenantId: v.string(),
    sourceKey: v.string(),
    title: v.string(),
    rawText: v.string(),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => await ctx.db.insert("documents", args),
});

export const addChunks = mutation({
  args: {
    tenantId: v.string(),
    sourceKey: v.string(),
    docId: v.id("documents"),
    chunks: v.array(v.object({ chunkIndex: v.number(), text: v.string() })),
  },
  handler: async (ctx, args) => {
    const ids: string[] = [];
    for (const c of args.chunks) {
      const id = await ctx.db.insert("chunks", {
        tenantId: args.tenantId,
        sourceKey: args.sourceKey,
        docId: args.docId,
        chunkIndex: c.chunkIndex,
        text: c.text,
      });
      ids.push(id);
    }
    return ids; // important for FAISS mapping
  },
});

// List all documents for a tenant (for debugging/admin)
export const listDocuments = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();
  },
});

// List all chunks for a tenant (for debugging/admin)
export const listChunks = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chunks")
      .filter((q) => q.eq(q.field("tenantId"), args.tenantId))
      .collect();
  },
});
