"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Divider from "@/components/Divider";
import IdentifierField from "@/components/IdentifierField";

export default function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: data.get("identifier"),
        password: data.get("password"),
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(next);
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Sign in failed. Try again.");
    }
  }

  return (
    <div className="auth-card">
      <span className="eyebrow">Welcome back</span>
      <h2>Sign in</h2>
      <Divider />
      <form onSubmit={onSubmit}>
        {error && <p className="form-error" role="alert">{error}</p>}
        <IdentifierField />
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required placeholder="Your password" />
        </div>
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p style={{ marginTop: "1.4rem", fontSize: "0.92rem" }}>
        New to Vaishnora? <Link href="/register">Create an account</Link>
      </p>
    </div>
  );
}
