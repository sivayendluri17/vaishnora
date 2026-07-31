"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Divider from "@/components/Divider";
import IdentifierField from "@/components/IdentifierField";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onRequestCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const value = String(data.get("identifier") || "");
    const res = await fetch("/api/auth/forgot-password/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: value }),
    });
    setLoading(false);
    if (res.ok) {
      setIdentifier(value);
      setStep("confirm");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong. Try again.");
    }
  }

  async function onConfirmReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/forgot-password/confirm-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier,
        code: data.get("code"),
        password: data.get("password"),
      }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong. Try again.");
    }
  }

  if (step === "confirm") {
    return (
      <div className="auth-card">
        <span className="eyebrow">Reset password</span>
        <h2>Enter your code</h2>
        <Divider />
        <p style={{ fontSize: "0.92rem" }}>
          If an account exists for <strong>{identifier}</strong>, a 6-digit code was sent. Enter it
          below along with your new password.
        </p>
        <form onSubmit={onConfirmReset}>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="field">
            <label htmlFor="code">Reset code</label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              maxLength={6}
              required
              placeholder="6-digit code"
            />
          </div>
          <div className="field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              placeholder="At least 8 characters"
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <span className="eyebrow">Forgot password</span>
      <h2>Reset your password</h2>
      <Divider />
      <form onSubmit={onRequestCode}>
        {error && <p className="form-error" role="alert">{error}</p>}
        <IdentifierField />
        <button className="btn btn-primary" disabled={loading}>
          {loading ? "Sending…" : "Send code"}
        </button>
      </form>
      <p style={{ marginTop: "1.4rem", fontSize: "0.92rem" }}>
        <Link href="/login">Back to sign in</Link>
      </p>
    </div>
  );
}
