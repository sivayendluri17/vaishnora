"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";

const angleOptions = ["front", "pallu", "border", "draped", "detail", "back"];

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

export default function EditProduct({ product, onDone }: { product: Product; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // new colour draft
  const [newColorName, setNewColorName] = useState("");
  const [newColorSwatch, setNewColorSwatch] = useState("#c49a4a");

  async function patch(data: Record<string, unknown>) {
    setError(""); setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Update failed.");
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function addPhotosToColor(colorId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(""); setBusy(true);
    try {
      const imageKeys = [];
      for (const f of Array.from(files)) {
        const key = await uploadOne(f);
        imageKeys.push({ key, angle: "" });
      }
      await patch({ addImages: { colorId, imageKeys } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setBusy(false);
    }
  }

  async function addNewColor(files: FileList | null) {
    if (!files || files.length === 0) { setError("Pick at least one photo for the new colour."); return; }
    setError(""); setBusy(true);
    try {
      const imageKeys = [];
      for (const f of Array.from(files)) {
        const key = await uploadOne(f);
        imageKeys.push({ key, angle: "" });
      }
      await patch({ addColor: { name: newColorName || "New colour", swatch: newColorSwatch, imageKeys } });
      setNewColorName("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setBusy(false);
    }
  }

  return (
    <div className="edit-panel">
      {error && <p className="form-error" role="alert">{error}</p>}
      {busy && <p style={{ color: "var(--gold-deep)", fontSize: "0.85rem" }}>Working…</p>}

      {(product.colors || []).length === 0 && (
        <p style={{ fontSize: "0.85rem", color: "#6b5560" }}>
          This product has no colour variants yet — add one below to enable the gallery.
        </p>
      )}

      {(product.colors || []).map((c) => (
        <div key={c.id} className="edit-color">
          <div className="edit-color-head">
            <span className="edit-swatch" style={{ background: c.swatch }} />
            <strong>{c.name}</strong>
            <span style={{ fontSize: "0.78rem", color: "var(--gold-deep)" }}>{c.images.length} photo{c.images.length === 1 ? "" : "s"}</span>
            <button className="chip" style={{ marginLeft: "auto" }} disabled={busy}
              onClick={() => { if (confirm(`Remove the "${c.name}" colour and its photos?`)) patch({ deleteColorId: c.id }); }}>
              Remove colour
            </button>
          </div>
          <div className="edit-thumbs">
            {c.images.map((img) => (
              <div key={img.id} className="edit-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.angle} />
                <button className="edit-thumb-x" disabled={busy}
                  onClick={() => { if (confirm("Delete this photo?")) patch({ deleteImageId: img.id }); }}
                  aria-label="Delete photo">×</button>
              </div>
            ))}
            <label className="edit-add-photo">
              + add photos
              <input type="file" accept="image/*" multiple style={{ display: "none" }}
                onChange={(e) => { addPhotosToColor(c.id, e.target.files); e.currentTarget.value = ""; }} />
            </label>
          </div>
        </div>
      ))}

      {/* add a new colour */}
      <div className="edit-newcolor">
        <input type="color" value={newColorSwatch} onChange={(e) => setNewColorSwatch(e.target.value)}
          aria-label="New colour swatch" style={{ width: 38, height: 38, border: "none", background: "none", cursor: "pointer" }} />
        <input value={newColorName} onChange={(e) => setNewColorName(e.target.value)} placeholder="New colour name" style={{ flex: 1 }} />
        <label className="chip" style={{ cursor: "pointer" }}>
          + add colour with photos
          <input type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => { addNewColor(e.target.files); e.currentTarget.value = ""; }} />
        </label>
      </div>

      <button className="chip" onClick={onDone} style={{ marginTop: "0.8rem" }}>Close editor</button>
    </div>
  );
}
