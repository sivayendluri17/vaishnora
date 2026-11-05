"use client";

import { useState } from "react";
import type { StaffMember } from "@vaishnora/core/people";
import type { Role } from "@vaishnora/core/roles";

const ROLE_LABEL: Record<Role, string> = { owner: "Owner", vendor: "Vendor", customer: "No access" };

export default function PeopleManager({ initial, selfId }: { initial: StaffMember[]; selfId: string }) {
  const [staff, setStaff] = useState(initial);
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<Role>("vendor");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(id: string, nextRole: Role) {
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch("/api/admin/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier: id, role: nextRole }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setError(body.error || "Couldn't update access."); return; }
      setStaff(body.staff ?? staff);
      setNotice(nextRole === "customer" ? `${body.member?.name ?? id} no longer has admin access.` : `${body.member?.name ?? id} is now a ${ROLE_LABEL[nextRole].toLowerCase()}.`);
      setIdentifier("");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="people">
      <form className="people-form" onSubmit={(e) => { e.preventDefault(); if (identifier.trim()) submit(identifier.trim(), role); }}>
        <h3>Give someone access</h3>
        <p className="people-hint">They must already have an account on the shop (the same email or phone they sign in with). Vendors see only their own products and never the customer&apos;s details.</p>
        <div className="people-form-row">
          <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Email or phone they signed up with" aria-label="Email or phone" autoComplete="off" />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} aria-label="Role">
            <option value="vendor">Vendor: own products only</option>
            <option value="owner">Owner: everything</option>
          </select>
          <button className="btn btn-primary" disabled={busy || !identifier.trim()}>{busy ? "Saving…" : "Grant access"}</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-notice" role="status">{notice}</p>}
      </form>

      <h3>Who has access ({staff.length})</h3>
      <div className="people-list">
        {staff.map((m) => (
          <div key={m.id} className="people-row">
            <div>
              <strong>{m.name}</strong>{m.id === selfId && <span className="people-you">you</span>}
              <div className="people-meta">{m.identifier} · {m.role === "vendor" ? `${m.productCount} product${m.productCount === 1 ? "" : "s"}` : "all products, orders, metrics and alarms"}</div>
            </div>
            <span className={`role-badge role-${m.role}`}>{ROLE_LABEL[m.role]}</span>
            {m.id !== selfId && (
              <div className="people-actions">
                {m.role === "vendor" && <button className="chip" disabled={busy} onClick={() => submit(m.identifier, "owner")}>Make owner</button>}
                {m.role === "owner" && <button className="chip" disabled={busy} onClick={() => submit(m.identifier, "vendor")}>Make vendor</button>}
                <button className="chip" disabled={busy} onClick={() => { if (confirm(`Remove admin access for ${m.name}?`)) submit(m.identifier, "customer"); }}>Remove access</button>
              </div>
            )}
          </div>
        ))}
        {staff.length === 0 && <div className="empty-state"><p>Nobody has admin access yet.</p></div>}
      </div>
    </div>
  );
}
