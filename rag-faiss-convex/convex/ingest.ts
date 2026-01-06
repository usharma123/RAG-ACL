import { mutation } from "./_generated/server";
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
