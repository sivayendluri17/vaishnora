"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@/lib/format";
import { thumbnailFor } from "@/lib/products";
import type { Product } from "@/lib/products";
import EditProduct from "./EditProduct";

type AdminProduct = Product & { active: boolean };
const categories = ["Sarees", "Dresses", "Ethnic Wear"];
const angleOptions = ["front", "pallu", "border", "draped", "detail", "back"];
const letterSizes = ["S", "M", "L", "XL", "XXL", "XXXL"];
const numberSizes = ["32", "34", "36", "38", "40", "42"];

function toggleFrom(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

type DraftImage = { file: File; angle: string };
type DraftColor = { name: string; swatch: string; images: DraftImage[] };

export default function AdminDashboard({ adminName }: { adminName: string }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [price, setPrice] = useState("");
  const [fabric, setFabric] = useState("");
  const [description, setDescription] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [inStock, setInStock] = useState(true);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<DraftColor[]>([
    { name: "Default", swatch: "#7a1230", images: [] },
  ]);

  async function load() {
    const res = await fetch("/api/admin/products");
    const body = await res.json().catch(() => ({}));
    if (res.ok) setProducts(body.products);
    else setError(body.error || "Couldn't load products.");
  }
  useEffect(() => { load(); }, []);

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(""), 2500); }

  // ---- colour draft editing ----
  function setColor(i: number, patch: Partial<DraftColor>) {
    setColors((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function addColorGroup() {
    setColors((prev) => [...prev, { name: "", swatch: "#c49a4a", images: [] }]);
  }
  function removeColorGroup(i: number) {
    setColors((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addImages(ci: number, files: FileList | null) {
    if (!files) return;
    const newImgs: DraftImage[] = Array.from(files).map((file) => ({ file, angle: "" }));
    setColor(ci, { images: [...colors[ci].images, ...newImgs] });
  }
  function setAngle(ci: number, ii: number, angle: string) {
    setColor(ci, { images: colors[ci].images.map((im, idx) => (idx === ii ? { ...im, angle } : im)) });
  }
  function removeImage(ci: number, ii: number) {
    setColor(ci, { images: colors[ci].images.filter((_, idx) => idx !== ii) });
  }

  async function uploadOne(f: File): Promise<string> {
    const res = await fetch("/api/admin/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: f.name, contentType: f.type }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Upload prep failed.");
    const put = await fetch(body.uploadUrl, { method: "PUT", headers: { "Content-Type": f.type }, body: f });
    if (!put.ok) throw new Error("Photo upload failed.");
    return body.key;
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const hasPhoto = colors.some((c) => c.images.length > 0);
    if (!hasPhoto) { setError("Add at least one photo to a colour."); return; }
    setSaving(true);
    try {
      // upload every image, build the colours payload
      const payloadColors = [];
      for (const c of colors) {
        if (c.images.length === 0) continue;
        const imageKeys = [];
        for (const im of c.images) {
          const key = await uploadOne(im.file);
          imageKeys.push({ key, angle: im.angle });
        }
        payloadColors.push({ name: c.name || "Default", swatch: c.swatch, imageKeys });
      }
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, price: Number(price), salePrice: salePrice ? Number(salePrice) : null, inStock, sizes, fabric, description, colors: payloadColors }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Couldn't create product.");
      // reset
      setName(""); setPrice(""); setFabric(""); setDescription("");
      setColors([{ name: "Default", swatch: "#7a1230", images: [] }]);
      setSalePrice(""); setInStock(true); setSizes([]);
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
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (res.ok) { flash(msg); await load(); }
    else setError((await res.json().catch(() => ({}))).error || "Update failed.");
  }

  async function removeProduct(id: string, productName: string) {
    if (!confirm(`Delete "${productName}" permanently? Hiding it is usually safer.`)) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) { flash("Product deleted"); await load(); }
    else setError("Delete failed.");
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
                <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Butterfly Bloom Saree" />
              </div>
              <div className="field">
                <label htmlFor="p-cat">Category</label>
                <select id="p-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="p-price">Price (₹)</label>
                <input id="p-price" type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="999" />
              </div>
              <div className="field">
                <label htmlFor="p-fabric">Fabric</label>
                <input id="p-fabric" value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder="Soft Organza" />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
              <div className="field">
                <label htmlFor="p-sale">Offer price (₹, optional)</label>
                <input id="p-sale" type="number" min="1" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="e.g. 999" />
              </div>
              <div className="field" style={{ justifyContent: "flex-end" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} style={{ width: "auto" }} />
                  In stock
                </label>
              </div>
            </div>

            <div className="field">
              <label>Sizes (optional — for dresses/ethnic wear)</label>
              <div className="size-pick">
                <span className="size-pick-label">Letter</span>
                {letterSizes.map((s) => (
                  <button key={s} type="button" className={`size-chip ${sizes.includes(s) ? "active" : ""}`}
                    onClick={() => setSizes(toggleFrom(sizes, s))}>{s}</button>
                ))}
              </div>
              <div className="size-pick">
                <span className="size-pick-label">Numeric</span>
                {numberSizes.map((s) => (
                  <button key={s} type="button" className={`size-chip ${sizes.includes(s) ? "active" : ""}`}
                    onClick={() => setSizes(toggleFrom(sizes, s))}>{s}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="p-desc">Description</label>
              <textarea id="p-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Grace your wardrobe with this elegant saree…" />
            </div>

            {/* colour groups */}
            <label style={{ fontSize: "0.78rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--gold-deep)" }}>
              Colours &amp; photos
            </label>
            {colors.map((c, ci) => (
              <div key={ci} className="color-group">
                <div className="color-group-head">
                  <input
                    type="color" value={c.swatch}
                    onChange={(e) => setColor(ci, { swatch: e.target.value })}
                    aria-label="Colour swatch"
                    style={{ width: 40, height: 40, padding: 0, border: "none", background: "none", cursor: "pointer" }}
                  />
                  <input
                    value={c.name} onChange={(e) => setColor(ci, { name: e.target.value })}
                    placeholder="Colour name (e.g. Ivory)"
                    style={{ flex: 1 }}
                  />
                  {colors.length > 1 && (
                    <button type="button" className="chip" onClick={() => removeColorGroup(ci)}>Remove</button>
                  )}
                </div>

                <div className="color-thumbs">
                  {c.images.map((im, ii) => (
                    <div key={ii} className="draft-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(im.file)} alt="" />
                      <select value={im.angle} onChange={(e) => setAngle(ci, ii, e.target.value)} aria-label="Angle">
                        <option value="">angle…</option>
                        {angleOptions.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                      <button type="button" className="draft-thumb-remove" onClick={() => removeImage(ci, ii)} aria-label="Remove photo">×</button>
                    </div>
                  ))}
                  <label className="draft-add">
                    +
                    <input type="file" accept="image/*" multiple style={{ display: "none" }}
                      onChange={(e) => { addImages(ci, e.target.files); e.currentTarget.value = ""; }} />
                  </label>
                </div>
              </div>
            ))}
            <button type="button" className="chip" onClick={addColorGroup} style={{ marginBottom: "1.2rem" }}>+ Add another colour</button>

            <button className="btn btn-primary" disabled={saving} style={{ display: "block" }}>
              {saving ? "Uploading…" : "Add product"}
            </button>
          </form>
        </div>

        {/* ===== Catalog list ===== */}
        <h3 style={{ marginBottom: "1rem" }}>Catalog ({products.length})</h3>
        {products.map((p) => {
          const thumb = thumbnailFor(p);
          return (
            <div key={p.id}>
            <div className="admin-row">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt={p.name} className="cart-thumb" style={{ objectFit: "cover" }} />
              ) : (
                <div className="cart-thumb" style={{ background: p.swatch ?? "var(--parchment)" }} />
              )}
              <div>
                <strong>{p.name}</strong>
                <div style={{ fontSize: "0.82rem", color: "var(--gold-deep)" }}>
                  {p.category} · {p.colors?.length || 0} colour{(p.colors?.length || 0) === 1 ? "" : "s"} {p.active ? "" : "· hidden"}
                </div>
              </div>
              <div className="admin-controls">
                <PriceEditor current={p.price} onSave={(v) => patch(p.id, { price: v }, "Price updated ✦")} />
                <span style={{ fontSize: "0.85rem" }}>{formatINR(p.price)}</span>
                <button className="chip" onClick={() => patch(p.id, { active: !p.active }, p.active ? "Hidden" : "Visible")}>
                  {p.active ? "Hide" : "Show"}
                </button>
                <button className="chip" onClick={() => setEditingId(editingId === p.id ? null : p.id)}>
                  {editingId === p.id ? "Close" : "Edit"}
                </button>
                <button className="chip" onClick={() => removeProduct(p.id, p.name)}>Delete</button>
              </div>
            </div>
            {editingId === p.id && (
              <EditProduct product={p} onDone={() => { setEditingId(null); load(); }} onReload={() => load()} />
            )}
            </div>
          );
        })}
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
      <input type="number" min="1" value={value} onChange={(e) => setValue(e.target.value)}
        style={{ width: "100px", padding: "0.45em 0.7em" }} aria-label="Price" />
      {changed && <button className="chip active" onClick={() => onSave(Number(value))}>Save</button>}
    </span>
  );
}
