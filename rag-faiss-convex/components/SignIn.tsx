import React, { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    
    try {
      await signIn("password", formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <h1>RAG-ACL</h1>
        <p>
          {flow === "signIn"
            ? "Sign in to access onboarding and company knowledge."
            : "Create an account to get started."}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            autoComplete={flow === "signIn" ? "current-password" : "new-password"}
          />
          <input name="flow" type="hidden" value={flow} />

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Loading..." : flow === "signIn" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <button
          type="button"
          className="link-button"
          onClick={() => {
            setFlow(flow === "signIn" ? "signUp" : "signIn");
            setError(null);
          }}
        >
          {flow === "signIn"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
