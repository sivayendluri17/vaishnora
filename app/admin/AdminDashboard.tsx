"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";
import type { Product } from "@/lib/products";

type AdminProduct = Product & { active: boolean };
const categories = ["Sarees", "Dresses", "Ethnic Wear"];

export default function AdminDashboard({ adminName }: { adminName: string }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  // New product form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [price, setPrice] = useState("");
  const [fabric, setFabric] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    const res = await fetch("/api/admin/products");
    const body = await res.json().catch(() => ({}));
    if (res.ok) setProducts(body.products);
    else setError(body.error || "Couldn't load products.");
  }
  useEffect(() => { load(); }, []);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 2500);
  }

  async function uploadImage(f: File): Promise<string> {
    const res = await fetch("/api/admin/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: f.name, contentType: f.type }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Upload preparation failed.");
    const put = await fetch(body.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": f.type },
      body: f,
    });
    if (!put.ok) throw new Error("Photo upload failed.");
    return body.key;
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    try {
      const imageUrl = file ? await uploadImage(file) : null;
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, price: Number(price), fabric, description, imageUrl }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't create the product.");
      setName(""); setPrice(""); setFabric(""); setDescription(""); setFile(null);
      (document.getElementById("photo-input") as HTMLInputElement | null)?.value &&
        ((document.getElementById("photo-input") as HTMLInputElement).value = "");
      flash("Product added ✦");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  async function patch(id: string, data: Record<string, unknown>, msg: string) {
    setError("");
    const res = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) { flash(msg); await load(); }
    else setError((await res.json().catch(() => ({}))).error || "Update failed.");
  }

  async function removeProduct(id: string, productName: string) {
    if (!confirm(`Delete "${productName}" permanently? Hiding it (Hide button) is usually safer.`)) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) { flash("Product deleted"); await load(); }
    else setError("Delete failed.");
  }

  async function replacePhoto(id: string, f: File) {
    setError("");
    try {
      const imageUrl = await uploadImage(f);
      await patch(id, { imageUrl }, "Photo updated ✦");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Photo upload failed.");
    }
  }

  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow">Boutique management</span>
        <h2>Admin — welcome, {adminName.split(" ")[0]}</h2>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p style={{ color: "var(--gold-deep)" }}>{notice}</p>}

        {/* ===== Add product ===== */}
        <div className="summary-card" style={{ margin: "1.5rem 0 2.5rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Add a new product</h3>
          <form onSubmit={addProduct}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div className="field">
                <label htmlFor="p-name">Name</label>
                <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Rosewood Banarasi Silk Saree" />
              </div>
              <div className="field">
                <label htmlFor="p-cat">Category</label>
                <select id="p-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="p-price">Price (₹)</label>
                <input id="p-price" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="23999" />
              </div>
              <div className="field">
                <label htmlFor="p-fabric">Fabric</label>
                <input id="p-fabric" value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="Pure Katan silk, zari border" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="p-desc">Description</label>
              <textarea id="p-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Handwoven Banarasi silk in deep rosewood maroon…" />
            </div>
            <div className="field">
              <label htmlFor="photo-input">Photo</label>
              <input id="photo-input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Add product"}
            </button>
          </form>
        </div>

        {/* ===== Product list ===== */}
        <h3 style={{ marginBottom: "1rem" }}>Catalog ({products.length})</h3>
        {products.map((p) => (
          <div key={p.id} className="admin-row">
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={p.name} className="cart-thumb" style={{ objectFit: "cover" }} />
            ) : (
              <div className="cart-thumb" style={{ background: p.swatch ?? "var(--parchment)" }} />
            )}
            <div>
              <strong>{p.name}</strong>
              <div style={{ fontSize: "0.82rem", color: "var(--gold-deep)" }}>
                {p.category} {p.active ? "" : "· hidden from shop"}
              </div>
              <label style={{ fontSize: "0.8rem", cursor: "pointer", color: "var(--maroon)" }}>
                {p.imageUrl ? "Replace photo" : "Add photo"}
                <input
                  type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => e.target.files?.[0] && replacePhoto(p.id, e.target.files[0])}
                />
              </label>
            </div>
            <div className="admin-controls">
              <PriceEditor current={p.price} onSave={(v) => patch(p.id, { price: v }, "Price updated ✦")} />
              <span style={{ fontSize: "0.85rem" }}>{formatINR(p.price)}</span>
              <button className="chip" onClick={() => patch(p.id, { active: !p.active }, p.active ? "Hidden from shop" : "Visible in shop")}>
                {p.active ? "Hide" : "Show"}
              </button>
              <button className="chip" onClick={() => removeProduct(p.id, p.name)}>Delete</button>
            </div>
          </div>
        ))}
        {products.length === 0 && (
          <div className="empty-state"><p>No products yet — add your first saree above.</p></div>
        )}
      </div>
    </section>
  );
}

function PriceEditor({ current, onSave }: { current: number; onSave: (v: number) => void }) {
  const [value, setValue] = useState(String(current));
  useEffect(() => setValue(String(current)), [current]);
  const changed = Number(value) !== current && Number(value) > 0;
  return (
    <span style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
      <input
        type="number" min="1" value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ width: "110px", padding: "0.45em 0.7em" }}
        aria-label="Price in rupees"
      />
      {changed && (
        <button className="chip active" onClick={() => onSave(Number(value))}>Save</button>
      )}
    </span>
  );
}
