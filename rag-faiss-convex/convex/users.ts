import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { auth } from "./auth";

// Available source keys in the system
export const AVAILABLE_SOURCES = [
  "gdrive",
  "confluence", 
  "slack",
  "notion",
  "public",
  "finance",
  "engineering",
  "hr",
] as const;

// Available roles
export const AVAILABLE_ROLES = ["member", "admin", "engineer", "finance", "hr"] as const;

// Helper to check if current user is admin
async function requireAdmin(ctx: any) {
  const userId = await auth.getUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }
  const user = await ctx.db.get(userId);
  if (!user || user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

// Get the currently authenticated user
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

// List all users (admin only)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      return [];
    }
    const currentUser = await ctx.db.get(userId);
    if (!currentUser || currentUser.role !== "admin") {
      return [];
    }
    
    // Get all users in the same tenant
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("tenantId"), currentUser.tenantId))
      .collect();
    
    return users;
  },
});

// Get available sources (for UI dropdowns)
export const getAvailableSources = query({
  args: {},
  handler: async () => {
    return [...AVAILABLE_SOURCES];
  },
});

// Get available roles (for UI dropdowns)
export const getAvailableRoles = query({
  args: {},
  handler: async () => {
    return [...AVAILABLE_ROLES];
  },
});

// Legacy create mutation - used by external systems
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
    if (existing) {
      await ctx.db.patch(existing._id, {
        role: args.role,
        allowedSources: args.allowedSources,
      });
      return existing._id;
    }
    return await ctx.db.insert("users", args);
  },
});

// Update a user's allowed sources (admin only)
export const updateSources = mutation({
  args: {
    userId: v.id("users"),
    allowedSources: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { allowedSources: args.allowedSources });
  },
});

// Update a user's role (admin only)
export const updateRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

// Update a user's role and sources together (admin only)
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    role: v.optional(v.string()),
    allowedSources: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const updates: Record<string, any> = {};
    if (args.role !== undefined) {
      updates.role = args.role;
    }
    if (args.allowedSources !== undefined) {
      updates.allowedSources = args.allowedSources;
    }
    
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.userId, updates);
    }
  },
});

// Make the first user an admin (one-time setup)
export const makeFirstAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if there are any admins in this tenant
    const existingAdmin = await ctx.db
      .query("users")
      .filter((q) => 
        q.and(
          q.eq(q.field("tenantId"), user.tenantId),
          q.eq(q.field("role"), "admin")
        )
      )
      .first();
    
    if (existingAdmin) {
      throw new Error("An admin already exists");
    }
    
    // Make this user the admin
    await ctx.db.patch(userId, { role: "admin" });
    return { success: true };
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => await ctx.db.get(args.userId),
});
