"use client";

import { useEffect, useState } from "react";
import { formatINR } from "@vaishnora/core/format";
import { thumbnailFor } from "@vaishnora/core/products";
import type { Product } from "@vaishnora/core/products";
import { ITEM_TYPE_NAMES, itemType } from "@vaishnora/core/catalog";
import EditProduct from "./EditProduct";
import { ColorDraftCard, SizePicker, TypePicker, emptyColor, releaseDrafts, sizesFor, uploadColor, type DraftColor } from "./form-parts";

type AdminProduct = Product & { active: boolean };

const SWATCHES = ["#7a1230", "#c49a4a", "#1f6b3a", "#1d4e89", "#3a2530", "#b8325e"];

export default function AdminDashboard({ adminName, defaultCategory }: { adminName: string; defaultCategory?: string }) {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [category, setCategory] = useState(defaultCategory && ITEM_TYPE_NAMES.includes(defaultCategory) ? defaultCategory : ITEM_TYPE_NAMES[0]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [fabric, setFabric] = useState("");
  const [description, setDescription] = useState("");
  const [inStock, setInStock] = useState(true);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<DraftColor[]>([emptyColor()]);

  const type = itemType(category);

  async function load() {
    const res = await fetch("/api/admin/products");
    const body = await res.json().catch(() => ({}));
    if (res.ok) setProducts(body.products);
    else setError(body.error || "Couldn't load products.");
  }
  useEffect(() => { load(); }, []);

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(""), 3000); }

  function chooseType(next: string) {
    setCategory(next);
    setSizes((prev) => sizesFor(next, prev)); // drop sizes the new type does not have
  }

  function setColor(i: number, next: DraftColor) {
    setColors((prev) => prev.map((c, idx) => (idx === i ? next : c)));
  }

  function validate(): string {
    if (!name.trim()) return "Give the product a name.";
    if (!(Number(price) > 0)) return "Enter a price above zero.";
    if (salePrice && !(Number(salePrice) > 0 && Number(salePrice) < Number(price))) return "The offer price must be lower than the price.";
    const empty = colors.find((c) => c.images.length === 0);
    if (empty) {
      return colors.length === 1
        ? "Add at least one photo."
        : `"${empty.name.trim() || "The unnamed colour"}" has no photos yet. Add a photo or remove that colour.`;
    }
    if (colors.length > 1 && colors.some((c) => !c.name.trim())) return "Name each colour so shoppers can tell them apart.";
    return "";
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    const problem = validate();
    setError(problem);
    if (problem) return;

    const total = colors.reduce((n, c) => n + c.images.length, 0);
    let done = 0;
    setSaving(`Uploading photo 1 of ${total}…`);
    try {
      const payloadColors = [];
      for (const c of colors) {
        const before = done;
        payloadColors.push(await uploadColor(c, (n) => { done = before + n; setSaving(`Uploading photo ${Math.min(done + 1, total)} of ${total}…`); }));
      }
      setSaving("Saving…");
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), category, price: Number(price), salePrice: salePrice ? Number(salePrice) : null,
          inStock, sizes: sizesFor(category, sizes), fabric: fabric.trim(), description: description.trim(), colors: payloadColors,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Couldn't create the product.");

      colors.forEach((c) => releaseDrafts(c.images));
      setName(""); setPrice(""); setSalePrice(""); setFabric(""); setDescription("");
      setInStock(true); setSizes([]); setColors([emptyColor()]);
      flash(`"${name.trim()}" added to ${category} ✦`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving("");
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
        {notice && <p className="form-notice" role="status">{notice}</p>}

        {/* ===== Add product ===== */}
        <div className="summary-card" style={{ margin: "1.5rem 0 2.5rem" }}>
          <h3 style={{ marginBottom: "0.3rem" }}>Add a new product</h3>
          <p className="form-hint" style={{ marginBottom: "1.2rem" }}>Choose what you are adding first. The form below changes to ask only what that item needs.</p>

          <form onSubmit={addProduct} noValidate>
            <h4 className="form-step"><span>1</span> What are you adding?</h4>
            <TypePicker value={category} onChange={chooseType} name="new-type" />

            <h4 className="form-step"><span>2</span> Details</h4>
            <div className="field">
              <label htmlFor="p-name">Name</label>
              <input id="p-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={type.namePlaceholder} />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="p-price">Price (₹)</label>
                <input id="p-price" type="number" min="1" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="999" />
              </div>
              <div className="field">
                <label htmlFor="p-sale">Offer price (₹, optional)</label>
                <input id="p-sale" type="number" min="1" inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Leave empty for no offer" />
              </div>
              <div className="field">
                <label htmlFor="p-fabric">{type.materialLabel} (optional)</label>
                <input id="p-fabric" value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder={type.materialPlaceholder} />
              </div>
            </div>
            <label className="form-check">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
              In stock and ready to sell
            </label>

            <SizePicker category={category} sizes={sizes} onChange={setSizes} />

            <div className="field">
              <label htmlFor="p-desc">Description</label>
              <textarea id="p-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type.descriptionPlaceholder} />
              <p className="form-hint">Shown for every colour, unless a colour below has its own description.</p>
            </div>

            <h4 className="form-step"><span>3</span> Colours and photos</h4>
            <p className="form-hint">Add one card per colour. If the item comes in a single colour, one card is enough.</p>
            {colors.map((c, ci) => (
              <ColorDraftCard
                key={ci}
                category={category}
                color={c}
                idPrefix={`new-c${ci}`}
                title={colors.length > 1 ? `Colour ${ci + 1}` : "Colour"}
                onChange={(next) => setColor(ci, next)}
                onRemove={colors.length > 1 ? () => { releaseDrafts(c.images); setColors((prev) => prev.filter((_, i) => i !== ci)); } : undefined}
              />
            ))}
            <button type="button" className="chip" onClick={() => setColors((prev) => [...prev, emptyColor(SWATCHES[prev.length % SWATCHES.length])])}>
              + Add another colour
            </button>

            {error && <p className="form-error" role="alert" style={{ marginTop: "1.2rem" }}>{error}</p>}
            <button className="btn btn-primary" disabled={!!saving} style={{ display: "block", marginTop: "1.2rem" }}>
              {saving || "Add product"}
            </button>
          </form>
        </div>

        {/* ===== Catalog list ===== */}
        <h3 style={{ marginBottom: "1rem" }}>Catalog ({products.length})</h3>
        {products.map((p) => {
          const thumb = thumbnailFor(p);
          const open = editingId === p.id;
          return (
            <div key={p.id}>
              <div className="admin-row">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" className="cart-thumb" style={{ objectFit: "cover" }} />
                ) : (
                  <div className="cart-thumb" style={{ background: p.swatch ?? "var(--parchment)" }} />
                )}
                <div>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: "0.82rem", color: "var(--gold-deep)" }}>
                    {p.category} · {p.colors?.length || 0} colour{(p.colors?.length || 0) === 1 ? "" : "s"} · {formatINR(p.price)}{p.active ? "" : " · hidden"}
                  </div>
                </div>
                <div className="admin-controls">
                  <PriceEditor current={p.price} onSave={(v) => patch(p.id, { price: v }, "Price updated ✦")} />
                  <button className={`chip ${open ? "active" : ""}`} aria-expanded={open} onClick={() => setEditingId(open ? null : p.id)}>
                    {open ? "Close" : "Edit"}
                  </button>
                  <button className="chip" onClick={() => patch(p.id, { active: !p.active }, p.active ? "Hidden from the shop" : "Visible in the shop")}>
                    {p.active ? "Hide" : "Show"}
                  </button>
                  <button className="chip" onClick={() => removeProduct(p.id, p.name)}>Delete</button>
                </div>
              </div>
              {open && <EditProduct product={p} onDone={() => { setEditingId(null); load(); }} onReload={() => load()} />}
            </div>
          );
        })}
        {products.length === 0 && (
          <div className="empty-state"><p>No products yet. Add your first one above.</p></div>
        )}
      </div>
    </section>
  );
}

// Quick price change straight from the catalog row, without opening the editor.
function PriceEditor({ current, onSave }: { current: number; onSave: (v: number) => void }) {
  const [value, setValue] = useState(String(current));
  useEffect(() => setValue(String(current)), [current]);
  const changed = Number(value) !== current && Number(value) > 0;
  return (
    <span style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
      <input type="number" min="1" inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)}
        style={{ width: "100px", padding: "0.45em 0.7em" }} aria-label="Price in rupees" />
      {changed && <button className="chip active" onClick={() => onSave(Number(value))}>Save</button>}
    </span>
  );
}
