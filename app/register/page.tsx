"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Divider from "@/components/Divider";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        identifier: data.get("identifier"),
        password: data.get("password"),
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Registration failed. Try again.");
    }
  }

  return (
    <div className="auth-card">
      <span className="eyebrow">Join Vaishnora</span>
      <h2>Create account</h2>
      <Divider />
      <form onSubmit={onSubmit}>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="field">
          <label htmlFor="name">Full name</label>
          <input id="name" name="name" required placeholder="Your name" />
        </div>
        <div className="field">
          <label htmlFor="identifier">Email or phone</label>
          <input id="identifier" name="identifier" required placeholder="you@example.com or 9876543210" />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" minLength={8} required placeholder="At least 8 characters" />
        </div>
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p style={{ marginTop: "1.4rem", fontSize: "0.92rem" }}>
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}
