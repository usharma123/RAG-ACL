import { query } from "./_generated/server";
import { v } from "convex/values";

export const getMany = query({
  args: { ids: v.array(v.id("chunks")) },
  handler: async (ctx, args) => {
    const out = [];
    for (const id of args.ids) {
      const c = await ctx.db.get(id);
      if (c) out.push(c);
    }
    return out;
  },
});
