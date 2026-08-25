"use client";

import { useEffect, useState } from "react";

export default function SecurityPage() {
  const [info, setInfo] = useState<{ name: string; identifier: string; identifierKind: string } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // name edit
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");

  // password edit
  const [editingPw, setEditingPw] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  function flash(m: string) { setNotice(m); setTimeout(() => setNotice(""), 2500); }

  async function load() {
    const r = await fetch("/api/account/profile");
    if (r.status === 401) { setError("Please sign in."); return; }
    const d = await r.json();
    if (r.ok) { setInfo(d); setName(d.name); } else setError(d.error || "Couldn't load account.");
  }
  useEffect(() => { load(); }, []);

  async function saveName() {
    setError("");
    const r = await fetch("/api/account/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }),
    });
    const d = await r.json();
    if (r.ok) { setEditingName(false); flash("Name updated ✦"); load(); }
    else setError(d.error || "Couldn't update name.");
  }

  async function savePassword() {
    setError("");
    if (newPw !== confirmPw) { setError("New passwords don't match."); return; }
    const r = await fetch("/api/account/password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
    });
    const d = await r.json();
    if (r.ok) {
      setEditingPw(false); setCurPw(""); setNewPw(""); setConfirmPw("");
      flash("Password changed ✦");
    } else setError(d.error || "Couldn't change password.");
  }

  if (error && !info) return (
    <section className="section"><div className="container"><h2>Login &amp; security</h2><p className="form-error">{error}</p></div></section>
  );
  if (!info) return (
    <section className="section"><div className="container"><h2>Login &amp; security</h2><p style={{ color: "#6b5560" }}>Loading…</p></div></section>
  );

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 720 }}>
        <span className="eyebrow">Your account</span>
        <h2>Login &amp; security</h2>
        {error && <p className="form-error">{error}</p>}
        {notice && <p style={{ color: "var(--gold-deep)" }}>{notice}</p>}

        {/* Name row */}
        <div className="sec-row">
          <div className="sec-field">
            <strong>Name</strong>
            {editingName ? (
              <div className="sec-edit">
                <input value={name} onChange={(e) => setName(e.target.value)} />
                <button className="btn btn-primary" onClick={saveName}>Save</button>
                <button className="chip" onClick={() => { setEditingName(false); setName(info.name); }}>Cancel</button>
              </div>
            ) : (
              <span>{info.name}</span>
            )}
          </div>
          {!editingName && <button className="chip" onClick={() => setEditingName(true)}>Edit</button>}
        </div>

        {/* Identifier row (email or phone) — display only */}
        <div className="sec-row">
          <div className="sec-field">
            <strong>{info.identifierKind === "email" ? "Email" : "Mobile number"}</strong>
            <span>{info.identifier}</span>
            <small style={{ color: "#7c6470" }}>Used to sign in and recover your account.</small>
          </div>
        </div>

        {/* Password row */}
        <div className="sec-row">
          <div className="sec-field">
            <strong>Password</strong>
            {editingPw ? (
              <div className="sec-edit sec-edit-col">
                <input type="password" placeholder="Current password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
                <input type="password" placeholder="New password (min 8 chars)" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button className="btn btn-primary" onClick={savePassword}>Save password</button>
                  <button className="chip" onClick={() => { setEditingPw(false); setCurPw(""); setNewPw(""); setConfirmPw(""); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <span>••••••••</span>
            )}
          </div>
          {!editingPw && <button className="chip" onClick={() => setEditingPw(true)}>Edit</button>}
        </div>
      </div>
    </section>
  );
}
