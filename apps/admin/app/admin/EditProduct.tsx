"use client";

// Editor for a product that already exists. Everything set when the product
// was added can be changed here: its type, name, prices, material, sizes and
// description, and for each colour its name, swatch, own description, and the
// label on every photo.

import { useEffect, useState } from "react";
import type { Product, ProductColor } from "@vaishnora/core/products";
import { itemType } from "@vaishnora/core/catalog";
import {
  ColorDraftCard, PhotoGuide, SizePicker, TypePicker, ViewSelect,
  emptyColor, nextView, releaseDrafts, sizesFor, uploadColor, uploadOne, type DraftColor,
} from "./form-parts";

type Patch = (data: Record<string, unknown>, done?: string) => Promise<boolean>;

export default function EditProduct({ product, onDone, onReload }: { product: Product; onDone: () => void; onReload: () => void }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const [category, setCategory] = useState(itemType(product.category).name);
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [salePrice, setSalePrice] = useState(product.salePrice != null ? String(product.salePrice) : "");
  const [fabric, setFabric] = useState(product.fabric ?? "");
  const [description, setDescription] = useState(product.description ?? "");
  const [inStock, setInStock] = useState(product.inStock);
  const [sizes, setSizes] = useState<string[]>(product.sizes ?? []);
  const [newColor, setNewColor] = useState<DraftColor | null>(null);

  const type = itemType(category);
  const colors = product.colors ?? [];

  // On open: move a legacy single image into an editable colour so it shows in
  // the panel and is never lost when more photos or colours are added.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (colors.length === 0 && product.imageUrl) {
        await fetch(`/api/admin/products/${product.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prepareEdit: true }),
        }).catch(() => {});
        if (!cancelled) onReload();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch: Patch = async (data, done) => {
    setError(""); setSaved(""); setBusy((b) => b || "Saving…");
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Update failed.");
      onReload();
      if (done) { setSaved(done); setTimeout(() => setSaved(""), 3000); }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy("");
    }
  };

  function chooseType(next: string) {
    setCategory(next);
    setSizes((prev) => sizesFor(next, prev));
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Give the product a name."); return; }
    if (!(Number(price) > 0)) { setError("Enter a price above zero."); return; }
    if (salePrice && !(Number(salePrice) > 0 && Number(salePrice) < Number(price))) { setError("The offer price must be lower than the price."); return; }
    await patch({
      name: name.trim(), category, price: Number(price), salePrice: salePrice === "" ? null : Number(salePrice),
      fabric: fabric.trim(), description: description.trim(), inStock, sizes: sizesFor(category, sizes),
    }, "Details saved ✦");
  }

  async function addPhotos(color: ProductColor, files: FileList | null) {
    if (!files || files.length === 0) return;
    setError("");
    try {
      const taken = color.images.map((i) => i.angle);
      const imageKeys = [];
      const list = Array.from(files);
      for (let i = 0; i < list.length; i++) {
        setBusy(`Uploading photo ${i + 1} of ${list.length}…`);
        const angle = nextView(category, taken);
        if (angle) taken.push(angle);
        imageKeys.push({ key: await uploadOne(list[i]), angle });
      }
      await patch({ addImages: { colorId: color.id, imageKeys } }, "Photos added ✦");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setBusy("");
    }
  }

  async function saveNewColor() {
    if (!newColor) return;
    if (!newColor.name.trim()) { setError("Name the new colour."); return; }
    if (newColor.images.length === 0) { setError("Add at least one photo of the new colour."); return; }
    setError("");
    try {
      const total = newColor.images.length;
      setBusy(`Uploading photo 1 of ${total}…`);
      const payload = await uploadColor(newColor, (n) => setBusy(`Uploading photo ${Math.min(n + 1, total)} of ${total}…`));
      if (await patch({ addColor: payload }, `"${payload.name}" added ✦`)) {
        releaseDrafts(newColor.images);
        setNewColor(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setBusy("");
    }
  }

  const working = !!busy;

  return (
    <div className="edit-panel">
      {/* ---- details ---- */}
      <form onSubmit={saveDetails} noValidate className="edit-details">
        <h4 className="form-step"><span>1</span> Kind of item</h4>
        <TypePicker value={category} onChange={chooseType} name={`type-${product.id}`} />

        <h4 className="form-step"><span>2</span> Details</h4>
        <div className="field">
          <label htmlFor={`n-${product.id}`}>Name</label>
          <input id={`n-${product.id}`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-grid">
          <div className="field">
            <label htmlFor={`p-${product.id}`}>Price (₹)</label>
            <input id={`p-${product.id}`} type="number" min="1" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor={`s-${product.id}`}>Offer price (₹, optional)</label>
            <input id={`s-${product.id}`} type="number" min="1" inputMode="numeric" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Leave empty for no offer" />
          </div>
          <div className="field">
            <label htmlFor={`f-${product.id}`}>{type.materialLabel} (optional)</label>
            <input id={`f-${product.id}`} value={fabric} onChange={(e) => setFabric(e.target.value)} placeholder={type.materialPlaceholder} />
          </div>
        </div>
        <label className="form-check">
          <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
          In stock and ready to sell
        </label>

        <SizePicker category={category} sizes={sizes} onChange={setSizes} />

        <div className="field">
          <label htmlFor={`d-${product.id}`}>Description</label>
          <textarea id={`d-${product.id}`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={type.descriptionPlaceholder} />
          <p className="form-hint">Shown for every colour, unless a colour below has its own description.</p>
        </div>

        <button className="btn btn-primary" disabled={working}>Save details</button>
      </form>

      {/* ---- colours ---- */}
      <h4 className="form-step"><span>3</span> Colours and photos</h4>
      {colors.length === 0 && <p className="form-hint">This product has no colours yet. Add one below to give it photos.</p>}

      {colors.map((c) => (
        <SavedColor
          key={c.id}
          color={c}
          category={category}
          disabled={working}
          canRemove={colors.length > 1}
          patch={patch}
          onAddPhotos={(files) => addPhotos(c, files)}
        />
      ))}

      {newColor ? (
        <>
          <ColorDraftCard
            category={category}
            color={newColor}
            idPrefix={`add-${product.id}`}
            title="New colour"
            onChange={setNewColor}
            onRemove={() => { releaseDrafts(newColor.images); setNewColor(null); }}
          />
          <button type="button" className="btn btn-primary" disabled={working} onClick={saveNewColor}>Save new colour</button>
        </>
      ) : (
        <button type="button" className="chip" disabled={working} onClick={() => setNewColor(emptyColor("#c49a4a"))}>+ Add another colour</button>
      )}

      {/* ---- status, kept next to the buttons that cause it ---- */}
      <div className="edit-status" aria-live="polite">
        {busy && <p className="form-notice">{busy}</p>}
        {saved && <p className="form-notice">{saved}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>

      <button type="button" className="chip" onClick={onDone}>Close editor</button>
    </div>
  );
}

// One colour that is already saved: edit its fields, relabel or delete photos, add more.
function SavedColor({
  color, category, disabled, canRemove, patch, onAddPhotos,
}: {
  color: ProductColor;
  category: string;
  disabled: boolean;
  canRemove: boolean;
  patch: Patch;
  onAddPhotos: (files: FileList | null) => void;
}) {
  const [name, setName] = useState(color.name);
  const [swatch, setSwatch] = useState(color.swatch);
  const [description, setDescription] = useState(color.description ?? "");
  const dirty = name !== color.name || swatch !== color.swatch || description !== (color.description ?? "");

  return (
    <fieldset className="color-card">
      <legend className="color-card-title">
        <span className="edit-swatch" style={{ background: swatch }} aria-hidden="true" />
        {color.name} · {color.images.length} photo{color.images.length === 1 ? "" : "s"}
      </legend>
      {canRemove && (
        <button
          type="button" className="chip color-card-remove" disabled={disabled}
          onClick={() => { if (confirm(`Remove the "${color.name}" colour and its photos?`)) patch({ deleteColorId: color.id }, "Colour removed"); }}
        >
          Remove this colour
        </button>
      )}

      <div className="color-card-row">
        <div className="field color-swatch-field">
          <label htmlFor={`sw-${color.id}`}>Swatch</label>
          <input id={`sw-${color.id}`} type="color" value={swatch.startsWith("#") && swatch.length === 7 ? swatch : "#7a1230"} onChange={(e) => setSwatch(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor={`cn-${color.id}`}>Colour name</label>
          <input id={`cn-${color.id}`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label htmlFor={`cd-${color.id}`}>Description for this colour (optional)</label>
        <textarea
          id={`cd-${color.id}`} rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Anything special about this colour. Leave empty to show the main description."
        />
      </div>

      {dirty && (
        <div className="color-card-actions">
          <button
            type="button" className="btn btn-primary" disabled={disabled}
            onClick={() => patch({ updateColor: { id: color.id, name, swatch, description } }, `"${name.trim() || color.name}" saved ✦`)}
          >
            Save this colour
          </button>
          <button type="button" className="chip" disabled={disabled} onClick={() => { setName(color.name); setSwatch(color.swatch); setDescription(color.description ?? ""); }}>
            Undo changes
          </button>
        </div>
      )}

      <div className="field">
        <label>Photos of this colour</label>
        <PhotoGuide category={category} />
        <div className="color-thumbs">
          {color.images.map((img) => (
            <div key={img.id} className="draft-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.angle} />
              <ViewSelect category={category} value={img.angle} disabled={disabled} onChange={(angle) => patch({ updateImage: { id: img.id, angle } }, "Photo label saved ✦")} />
              <button
                type="button" className="draft-thumb-remove" disabled={disabled} aria-label="Delete photo"
                onClick={() => { if (confirm("Delete this photo?")) patch({ deleteImageId: img.id }, "Photo deleted"); }}
              >×</button>
            </div>
          ))}
          <label className="draft-add">
            <span aria-hidden="true">+</span>
            <span className="draft-add-text">Add photos</span>
            <input type="file" accept="image/*" multiple hidden disabled={disabled} onChange={(e) => { onAddPhotos(e.target.files); e.currentTarget.value = ""; }} />
          </label>
        </div>
      </div>
    </fieldset>
  );
}
