"use client";

import { useEffect, useState } from "react";

const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra",
  "Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu",
  "Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
];

type Address = {
  id: string; fullName: string; mobile: string; pincode: string;
  addressLine1: string; addressLine2: string; landmark: string;
  city: string; state: string; isDefault: boolean;
};

const empty = {
  fullName: "", mobile: "", pincode: "", addressLine1: "", addressLine2: "",
  landmark: "", city: "", state: "Andhra Pradesh", isDefault: false,
};

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<any>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  function flash(m: string) { setNotice(m); setTimeout(() => setNotice(""), 2500); }
  function set(k: string, v: any) { setForm((f: any) => ({ ...f, [k]: v })); }

  async function load() {
    const r = await fetch("/api/account/addresses");
    if (r.status === 401) { setError("Please sign in to manage addresses."); return; }
    const d = await r.json();
    if (r.ok) setAddresses(d.addresses); else setError(d.error || "Couldn't load addresses.");
  }
  useEffect(() => { load(); }, []);

  function startAdd() { setForm(empty); setEditingId(null); setShowForm(true); }
  function startEdit(a: Address) { setForm(a); setEditingId(a.id); setShowForm(true); }

  async function save() {
    setError("");
    if (!form.fullName || !form.mobile || !form.pincode || !form.addressLine1 || !form.city || !form.state) {
      setError("Please fill all required fields."); return;
    }
    if (!/^\d{10}$/.test(form.mobile.replace(/\D/g, "").slice(-10))) { setError("Enter a valid 10-digit mobile."); return; }
    if (!/^\d{6}$/.test(form.pincode)) { setError("Enter a valid 6-digit pincode."); return; }

    const method = editingId ? "PATCH" : "POST";
    const body = editingId ? { ...form, id: editingId } : form;
    const r = await fetch("/api/account/addresses", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (r.ok) { setShowForm(false); flash(editingId ? "Address updated ✦" : "Address saved ✦"); load(); }
    else setError(d.error || "Couldn't save address.");
  }

  async function remove(id: string) {
    if (!confirm("Delete this address?")) return;
    const r = await fetch("/api/account/addresses", {
      method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
    });
    if (r.ok) { flash("Address removed"); load(); }
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 760 }}>
        <span className="eyebrow">Your account</span>
        <h2>Your addresses</h2>
        {error && <p className="form-error">{error}</p>}
        {notice && <p style={{ color: "var(--gold-deep)" }}>{notice}</p>}

        {addresses === null && !error && <p style={{ color: "#6b5560" }}>Loading…</p>}

        {addresses && (
          <div className="addr-grid">
            {addresses.map((a) => (
              <div key={a.id} className="addr-card">
                {a.isDefault && <span className="addr-default">Default</span>}
                <strong>{a.fullName}</strong>
                <p>{a.addressLine1}{a.addressLine2 ? ", " + a.addressLine2 : ""}</p>
                {a.landmark && <p>{a.landmark}</p>}
                <p>{a.city}, {a.state} - {a.pincode}</p>
                <p>Mobile: {a.mobile}</p>
                <div className="addr-actions">
                  <button className="chip" onClick={() => startEdit(a)}>Edit</button>
                  <button className="chip" onClick={() => remove(a.id)}>Delete</button>
                </div>
              </div>
            ))}
            <button className="addr-add" onClick={startAdd}>+ Add a new address</button>
          </div>
        )}

        {showForm && (
          <div className="summary-card" style={{ marginTop: "1.5rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>{editingId ? "Edit address" : "New address"}</h3>
            <div className="field"><label>Full name</label>
              <input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Enter name" /></div>
            <div className="field-row-2">
              <div className="field"><label>Mobile number</label>
                <input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="10-digit mobile" /></div>
              <div className="field"><label>Pincode</label>
                <input value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} maxLength={6} placeholder="6-digit pincode" /></div>
            </div>
            <div className="field"><label>Flat, house no., building</label>
              <input value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} placeholder="Flat / house / building" /></div>
            <div className="field"><label>Area, street, locality</label>
              <input value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} placeholder="Area, street, locality" /></div>
            <div className="field"><label>Landmark (optional)</label>
              <input value={form.landmark} onChange={(e) => set("landmark", e.target.value)} placeholder="Nearby landmark" /></div>
            <div className="field-row-2">
              <div className="field"><label>Town / city</label>
                <input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Town / city" /></div>
              <div className="field"><label>State</label>
                <select value={form.state} onChange={(e) => set("state", e.target.value)}>
                  {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </select></div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", margin: "0.5rem 0" }}>
              <input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} style={{ width: "auto" }} />
              Set as default address
            </label>
            <div style={{ display: "flex", gap: "0.7rem" }}>
              <button className="btn btn-primary" onClick={save}>{editingId ? "Update" : "Save"} address</button>
              <button className="chip" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
