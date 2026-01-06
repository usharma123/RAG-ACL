import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "./_generated/dataModel";

// Custom password provider that captures ACL fields during signup
const CustomPassword = Password<DataModel>({
  profile(params) {
    return {
      email: params.email as string,
      // Set defaults for ACL - these can be updated by admin later
      role: (params.role as string) || "member",
      tenantId: (params.tenantId as string) || "acme",
      allowedSources: [], // Empty by default, admin assigns sources
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [CustomPassword],
});
