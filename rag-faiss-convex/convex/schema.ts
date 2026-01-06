import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tenantId: v.string(),
    email: v.string(),
    role: v.string(),
    allowedSources: v.array(v.string()), // ["public","finance"]
  }).index("by_tenant_email", ["tenantId", "email"]),

  documents: defineTable({
    tenantId: v.string(),
    sourceKey: v.string(), // "public" | "finance"
    title: v.string(),
    rawText: v.string(),
  }).index("by_tenant_source", ["tenantId", "sourceKey"]),

  chunks: defineTable({
    tenantId: v.string(),
    sourceKey: v.string(),
    docId: v.id("documents"),
    chunkIndex: v.number(),
    text: v.string(),
  }).index("by_doc", ["docId"]),
});
