"use client";

// Building blocks shared by the "Add a new product" form and the product
// editor, so both ask the same questions in the same way.

import { useState } from "react";
import { ITEM_TYPES, attributesFor, itemType, viewLabel, viewOptions, type AttributeField } from "@vaishnora/core/catalog";
import { dominantColour, nearestColourName } from "@vaishnora/core/colour";

const DEFAULT_SWATCH = "#7a1230";

/**
 * Read the main colour of a photo in the browser: draw it small, take the
 * pixels, and let core/colour pick the dominant one and its nearest name.
 */
export async function detectColour(file: File): Promise<{ hex: string; name: string } | null> {
  try {
    // Ask the browser for a small, properly averaged copy first: drawing a
    // 4000px photo straight onto a 48px canvas keeps only a scatter of pixels.
    const bitmap = await createImageBitmap(file, { resizeWidth: 192, resizeHeight: 192, resizeQuality: "high" });
    const size = 48;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    // sample the middle 70% so the frame edge and props count less
    const w = bitmap.width, h = bitmap.height;
    ctx.drawImage(bitmap, w * 0.15, h * 0.15, w * 0.7, h * 0.7, 0, 0, size, size);
    bitmap.close();
    const hex = dominantColour(ctx.getImageData(0, 0, size, size).data);
    return { hex, name: nearestColourName(hex).name };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- uploads
const MAX_EDGE = 1600;        // longest side after shrinking: plenty for a 3:4 card and zoom
const JPEG_QUALITY = 0.86;
const MAX_INPUT_BYTES = 30 * 1024 * 1024;

/**
 * Make a phone photo web-ready before it leaves the browser: decode it
 * (including iPhone HEIC where the browser can), fix rotation, shrink to
 * MAX_EDGE and re-encode as JPEG. A 6 MB camera photo becomes ~300 KB, so
 * uploads are quick and product pages load fast. Files that are already small
 * JPEGs are returned untouched.
 */
export async function prepareImage(file: File): Promise<File> {
  const type = (file.type || "").toLowerCase();
  const isHeic = /heic|heif/.test(type) || /\.(heic|heif)$/i.test(file.name);
  if (!type.startsWith("image/") && !isHeic) throw new Error(`"${file.name}" is not a photo. Please choose a JPG or PNG.`);
  if (file.size > MAX_INPUT_BYTES) throw new Error(`"${file.name}" is larger than 30 MB. Please choose a smaller photo.`);

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    if (isHeic) {
      throw new Error(`"${file.name}" is an iPhone HEIC photo, which this browser cannot read. On the iPhone go to Settings > Camera > Formats and choose "Most Compatible", or share the photo as a JPEG, then try again.`);
    }
    throw new Error(`Couldn't read "${file.name}". Please try a JPG or PNG photo.`);
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const alreadyFine = scale === 1 && file.size < 600 * 1024 && (type === "image/jpeg" || type === "image/webp");
  if (alreadyFine) { bitmap.close(); return file; }

  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) { bitmap.close(); return file; }
  ctx.fillStyle = "#ffffff";          // transparent PNG areas become white, not black
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`Couldn't convert "${file.name}".`))), "image/jpeg", JPEG_QUALITY)
  );
  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}

async function putWithRetry(url: string, f: File): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const put = await fetch(url, { method: "PUT", headers: { "Content-Type": f.type }, body: f });
      if (put.ok) return;
      if (attempt === 2) throw new Error(`The photo service refused "${f.name}" (${put.status}).`);
    } catch (e) {
      if (attempt === 2) throw e instanceof Error ? e : new Error(`Couldn't upload "${f.name}".`);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
}

export async function uploadOne(raw: File): Promise<string> {
  const f = await prepareImage(raw);
  const res = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: f.name, contentType: f.type }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Couldn't prepare the upload. Check your connection and try again.");
  await putWithRetry(body.uploadUrl, f);
  return body.key;
}

// ---------------------------------------------------------------- drafts
export type DraftImage = { file: File; angle: string; preview: string };
export type DraftColor = { name: string; swatch: string; description: string; images: DraftImage[] };

export function emptyColor(swatch = "#7a1230"): DraftColor {
  return { name: "", swatch, description: "", images: [] };
}

/**
 * The next photo label to suggest: the first of this type's views that the
 * colour does not have yet. Saves picking "front, pallu, border" by hand when
 * photos are added in the usual order; any label can still be changed.
 */
export function nextView(category: string, taken: string[]): string {
  return itemType(category).views.find((v) => !taken.includes(v)) ?? "";
}

/**
 * Turn picked files into drafts. Each photo is converted first, so an iPhone
 * HEIC or a huge camera file is caught here with a clear message instead of
 * failing later during save. Returns the drafts that worked and the problems.
 */
export async function filesToDrafts(category: string, existing: string[], files: FileList | File[] | null): Promise<{ drafts: DraftImage[]; problems: string[] }> {
  if (!files) return { drafts: [], problems: [] };
  const taken = [...existing];
  const drafts: DraftImage[] = [];
  const problems: string[] = [];
  for (const raw of Array.from(files)) {
    try {
      const file = await prepareImage(raw);
      const angle = nextView(category, taken);
      if (angle) taken.push(angle);
      drafts.push({ file, angle, preview: URL.createObjectURL(file) });
    } catch (e) {
      problems.push(e instanceof Error ? e.message : `Couldn't read "${raw.name}".`);
    }
  }
  return { drafts, problems };
}

export function releaseDrafts(images: DraftImage[]): void {
  for (const im of images) URL.revokeObjectURL(im.preview);
}

/** Uploads a draft colour's photos and returns the payload the API expects. */
export async function uploadColor(c: DraftColor, onProgress?: (done: number) => void) {
  const imageKeys: { key: string; angle: string }[] = [];
  for (const im of c.images) {
    imageKeys.push({ key: await uploadOne(im.file), angle: im.angle });
    onProgress?.(imageKeys.length);
  }
  return { name: c.name.trim() || "Default", swatch: c.swatch, description: c.description.trim(), imageKeys };
}

// ---------------------------------------------------------------- type picker
export function TypePicker({ value, onChange, name }: { value: string; onChange: (category: string) => void; name: string }) {
  return (
    <div className="type-picker" role="radiogroup" aria-label="Kind of item">
      {ITEM_TYPES.map((t) => (
        <label key={t.name} className={`type-option ${value === t.name ? "is-selected" : ""}`}>
          <input type="radio" name={name} value={t.name} checked={value === t.name} onChange={() => onChange(t.name)} />
          <span className="type-option-name">{t.name}</span>
          <span className="type-option-hint">{t.hint}</span>
        </label>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- sizes
/** Renders nothing for item types that have no sizes (sarees, accessories). */
/**
 * Sizes the product comes in. Each type suggests its usual sizes; any size can
 * be typed as well ("1 ft", "2 ft", "Free size"). Shoppers must pick one of
 * these at purchase, so leave the list empty for one-size items.
 */
export function SizePicker({ category, sizes, onChange }: { category: string; sizes: string[]; onChange: (sizes: string[]) => void }) {
  const type = itemType(category);
  const [custom, setCustom] = useState("");
  const suggested = type.sizeGroups.flatMap((g) => g.values);
  const own = sizes.filter((v) => !suggested.includes(v));
  const toggle = (v: string) => onChange(sizes.includes(v) ? sizes.filter((x) => x !== v) : [...sizes, v]);
  const addCustom = () => {
    const v = custom.trim().replace(/\s+/g, " ").slice(0, 24);
    if (!v) return;
    if (!sizes.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...sizes, v]);
    setCustom("");
  };
  return (
    <div className="field">
      <label>Sizes available</label>
      <p className="form-hint">{type.sizeHint ?? "Tick every size you can supply, or type your own."} Shoppers choose one of these before buying; leave empty if the item comes in one size.</p>
      {type.sizeGroups.map((g) => (
        <div key={g.label} className="size-pick">
          <span className="size-pick-label">{g.label}</span>
          {g.values.map((s) => (
            <button key={s} type="button" className={`size-chip ${sizes.includes(s) ? "active" : ""}`} aria-pressed={sizes.includes(s)} onClick={() => toggle(s)}>
              {s}
            </button>
          ))}
        </div>
      ))}
      <div className="size-pick">
        <span className="size-pick-label">Your own</span>
        {own.map((s) => (
          <button key={s} type="button" className="size-chip active" aria-pressed="true" title="Remove this size" onClick={() => toggle(s)}>
            {s} ×
          </button>
        ))}
        <input
          className="size-custom"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
          placeholder="e.g. 1 ft, 2 ft, 6 inch, Free size"
          aria-label="Add your own size"
          maxLength={24}
        />
        <button type="button" className="chip" onClick={addCustom} disabled={!custom.trim()}>Add size</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- attributes
export type SpecForm = Record<string, string | string[]>;

/**
 * The questions for one item type: measurements as a number grid, then
 * choices, tick lists and short text. Everything is optional; an empty box
 * simply leaves that detail off the product page.
 */
export function SpecFields({ category, specs, onChange, idPrefix }: { category: string; specs: SpecForm; onChange: (next: SpecForm) => void; idPrefix: string }) {
  const fields = attributesFor(category);
  if (fields.length === 0) return null;
  const measurements = fields.filter((f) => f.group === "measurements");
  const details = fields.filter((f) => f.group === "details");
  const set = (key: string, value: string | string[]) => onChange({ ...specs, [key]: value });
  const str = (key: string) => (typeof specs[key] === "string" ? (specs[key] as string) : "");
  const list = (key: string) => (Array.isArray(specs[key]) ? (specs[key] as string[]) : []);

  const renderDetail = (f: AttributeField) => {
    const id = `${idPrefix}-${f.key}`;
    if (f.type === "select") {
      return (
        <div className="field" key={f.key}>
          <label htmlFor={id}>{f.label}</label>
          <select id={id} value={str(f.key)} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">Not specified</option>
            {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {f.hint && <p className="form-hint">{f.hint}</p>}
        </div>
      );
    }
    if (f.type === "multi") {
      const chosen = list(f.key);
      const toggle = (o: string) => set(f.key, chosen.includes(o) ? chosen.filter((x) => x !== o) : [...chosen, o]);
      return (
        <div className="field attr-multi" key={f.key}>
          <label>{f.label}</label>
          {f.hint && <p className="form-hint">{f.hint}</p>}
          <div className="size-pick">
            {f.options?.map((o) => (
              <button key={o} type="button" className={`size-chip ${chosen.includes(o) ? "active" : ""}`} aria-pressed={chosen.includes(o)} onClick={() => toggle(o)}>{o}</button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="field" key={f.key}>
        <label htmlFor={id}>{f.label}</label>
        <input id={id} list={f.suggestions?.length ? `${id}-list` : undefined} value={str(f.key)} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} maxLength={160} />
        {f.suggestions?.length ? <datalist id={`${id}-list`}>{f.suggestions.map((o) => <option key={o} value={o} />)}</datalist> : null}
        {f.hint && <p className="form-hint">{f.hint}</p>}
      </div>
    );
  };

  return (
    <div className="attrs">
      {measurements.length > 0 && (
        <div className="field">
          <label>Size and weight</label>
          <p className="form-hint">
            Shown on the product page so shoppers know what arrives. Leave a box empty to skip it.
            {measurements.some((f) => f.key === "packOf") && ' For a set, put the number of pieces in "Pack of" and the size of one piece in the measurements.'}
          </p>
          <div className="form-grid">
            {measurements.map((f) => (
              <div className="field" key={f.key}>
                <label htmlFor={`${idPrefix}-${f.key}`}>{f.label} ({f.unitName})</label>
                <input
                  id={`${idPrefix}-${f.key}`}
                  type="number" min="0" step={f.integer ? "1" : "0.1"} inputMode={f.integer ? "numeric" : "decimal"}
                  value={str(f.key)}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {details.length > 0 && (
        <div className="field">
          <label>Product details</label>
          <p className="form-hint">Answer what you know; every detail here appears under "Details" on the product page and helps shoppers decide.</p>
          <div className="form-grid">{details.filter((f) => f.type !== "multi").map(renderDetail)}</div>
          {details.filter((f) => f.type === "multi").map(renderDetail)}
        </div>
      )}
    </div>
  );
}

/** Form values -> request body. Numbers stay as text; the server parses and validates them. */
export function specsPayload(specs: SpecForm): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(specs)) {
    if (Array.isArray(v)) { if (v.length) out[k] = v; }
    else if (v !== "") out[k] = v;
  }
  return out;
}

/** Saved product -> form values. */
export function specsToForm(specs: Record<string, number | string | string[] | undefined> | null | undefined): SpecForm {
  const out: SpecForm = {};
  for (const [k, v] of Object.entries(specs ?? {})) {
    if (Array.isArray(v)) out[k] = v.map(String);
    else if (typeof v === "number" || typeof v === "string") out[k] = String(v);
  }
  return out;
}

/**
 * When the type changes, drop suggested sizes the new type does not offer
 * (S/M/L make no sense on a saree) but keep sizes the vendor typed themselves.
 */
export function sizesFor(category: string, sizes: string[]): string[] {
  const allowed = itemType(category).sizeGroups.flatMap((g) => g.values);
  const anySuggested = ITEM_TYPES.flatMap((t) => t.sizeGroups.flatMap((g) => g.values));
  return sizes.filter((s) => allowed.includes(s) || !anySuggested.includes(s));
}

// ---------------------------------------------------------------- photo label
export function ViewSelect({ category, value, onChange, disabled }: { category: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select className="view-select" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label="What this photo shows">
      <option value="">Not labelled</option>
      {viewOptions(category, value).map((v) => <option key={v} value={v}>{viewLabel(v)}</option>)}
    </select>
  );
}

export function PhotoGuide({ category }: { category: string }) {
  const type = itemType(category);
  return (
    <p className="form-hint">
      Good photos for {type.name.toLowerCase()}: {type.views.map(viewLabel).join(", ")}. The first photo is the one shown in the shop.
    </p>
  );
}

// ---------------------------------------------------------------- a colour not yet saved
export function ColorDraftCard({
  category, color, onChange, onRemove, title, idPrefix,
}: {
  category: string;
  color: DraftColor;
  onChange: (next: DraftColor) => void;
  onRemove?: () => void;
  title: string;
  idPrefix: string;
}) {
  const setImages = (images: DraftImage[]) => onChange({ ...color, images });
  const [problems, setProblems] = useState<string[]>([]);
  const [reading, setReading] = useState(false);
  const [detected, setDetected] = useState("");

  async function pick(files: File[]) {
    setProblems([]);
    setReading(true);
    try {
      const { drafts, problems: p } = await filesToDrafts(category, color.images.map((x) => x.angle), files);
      let next = { ...color, images: [...color.images, ...drafts] };
      // First photo of an unnamed colour: fill the swatch and name from the photo itself.
      if (drafts.length && color.images.length === 0 && !color.name.trim() && color.swatch === DEFAULT_SWATCH) {
        const found = await detectColour(drafts[0].file);
        if (found) { next = { ...next, name: found.name, swatch: found.hex }; setDetected(found.name); }
      }
      onChange(next);
      setProblems(p);
    } finally {
      setReading(false);
    }
  }

  return (
    <fieldset className="color-card">
      <legend className="color-card-title">{title}</legend>
      {onRemove && <button type="button" className="chip color-card-remove" onClick={onRemove}>Remove this colour</button>}

      <div className="color-card-row">
        <div className="field color-swatch-field">
          <label htmlFor={`${idPrefix}-swatch`}>Swatch</label>
          <input id={`${idPrefix}-swatch`} type="color" value={color.swatch} onChange={(e) => onChange({ ...color, swatch: e.target.value })} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor={`${idPrefix}-name`}>Colour name</label>
          <input id={`${idPrefix}-name`} value={color.name} onChange={(e) => onChange({ ...color, name: e.target.value })} placeholder="e.g. Ivory, Rosewood, Ruby Red" />
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-desc`}>Description for this colour (optional)</label>
        <textarea
          id={`${idPrefix}-desc`} rows={2} value={color.description}
          onChange={(e) => onChange({ ...color, description: e.target.value })}
          placeholder="Anything special about this colour. Leave empty to show the main description."
        />
      </div>

      <div className="field">
        <label>Photos of this colour</label>
        <PhotoGuide category={category} />
        <div className="color-thumbs">
          {color.images.map((im, ii) => (
            <div key={im.preview} className="draft-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.preview} alt="" />
              <ViewSelect category={category} value={im.angle} onChange={(angle) => setImages(color.images.map((x, i) => (i === ii ? { ...x, angle } : x)))} />
              <button
                type="button" className="draft-thumb-remove" aria-label="Remove photo"
                onClick={() => { releaseDrafts([im]); setImages(color.images.filter((_, i) => i !== ii)); }}
              >×</button>
            </div>
          ))}
          <label className={`draft-add ${reading ? "is-busy" : ""}`}>
            <span aria-hidden="true">{reading ? "…" : "+"}</span>
            <span className="draft-add-text">{reading ? "Preparing" : "Add photos"}</span>
            <input
              type="file" accept="image/*,.heic,.heif" multiple hidden
              onChange={(e) => {
                // Copy the list first: clearing the input empties its live FileList.
                const files = Array.from(e.target.files ?? []);
                e.currentTarget.value = "";
                void pick(files);
              }}
            />
          </label>
        </div>
        <p className="form-hint">Phone photos are fine: they are shrunk and converted to JPEG here before upload, so saving is quick.</p>
        {detected && <p className="form-notice">Colour read from the photo: <strong>{detected}</strong>. Change the name or swatch above if it is not right.</p>}
        {problems.map((p) => <p key={p} className="form-error" role="alert">{p}</p>)}
      </div>
    </fieldset>
  );
}
