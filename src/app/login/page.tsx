"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

export default function LoginPage(): React.ReactElement {
  const [email, setEmail] = useState("customer@example.com");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      redirect: false,
    });
    setLoading(false);
    if (!res || res.error) {
      setError("Unknown email. Try customer@example.com or admin@example.com.");
      return;
    }
    window.location.href = "/";
  };

  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-xl font-semibold">Log in</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Enter <code>customer@example.com</code> or <code>admin@example.com</code>. Any password is accepted.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <label className="block text-sm font-medium">
          Email
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
