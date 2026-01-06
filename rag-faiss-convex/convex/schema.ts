import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  // Extend the users table with ACL fields
  users: defineTable({
    // Convex Auth fields
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // ACL fields for RAG
    tenantId: v.string(),
    role: v.string(),
    allowedSources: v.array(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_tenant_email", ["tenantId", "email"]),

  documents: defineTable({
    tenantId: v.string(),
    sourceKey: v.string(), // source category key
    title: v.string(),
    rawText: v.string(),
    sourceUrl: v.optional(v.string()),
  }).index("by_tenant_source", ["tenantId", "sourceKey"]),

  chunks: defineTable({
    tenantId: v.string(),
    sourceKey: v.string(),
    docId: v.id("documents"),
    chunkIndex: v.number(),
    text: v.string(),
  }).index("by_doc", ["docId"]),

  queryLogs: defineTable({
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
    createdAt: v.number(),
  }).index("by_tenant_user", ["tenantId", "userId"]),

  feedback: defineTable({
    logId: v.id("queryLogs"),
    userId: v.id("users"),
    helpful: v.boolean(),
    comment: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_log", ["logId"]),
});
