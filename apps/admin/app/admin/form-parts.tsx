"use client";

// Building blocks shared by the "Add a new product" form and the product
// editor, so both ask the same questions in the same way.

import { ITEM_TYPES, itemType, viewLabel, viewOptions } from "@vaishnora/core/catalog";

// ---------------------------------------------------------------- uploads
export async function uploadOne(f: File): Promise<string> {
  const res = await fetch("/api/admin/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: f.name, contentType: f.type }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Couldn't prepare the upload.");
  const put = await fetch(body.uploadUrl, { method: "PUT", headers: { "Content-Type": f.type }, body: f });
  if (!put.ok) throw new Error(`Couldn't upload ${f.name}.`);
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

export function filesToDrafts(category: string, existing: string[], files: FileList | null): DraftImage[] {
  if (!files) return [];
  const taken = [...existing];
  return Array.from(files).map((file) => {
    const angle = nextView(category, taken);
    if (angle) taken.push(angle);
    return { file, angle, preview: URL.createObjectURL(file) };
  });
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
export function SizePicker({ category, sizes, onChange }: { category: string; sizes: string[]; onChange: (sizes: string[]) => void }) {
  const type = itemType(category);
  if (type.sizeGroups.length === 0) return null;
  const toggle = (v: string) => onChange(sizes.includes(v) ? sizes.filter((x) => x !== v) : [...sizes, v]);
  return (
    <div className="field">
      <label>Sizes available</label>
      {type.sizeHint && <p className="form-hint">{type.sizeHint}</p>}
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
    </div>
  );
}

/** Keep only the sizes that exist for a type, e.g. when switching Dresses -> Sarees. */
export function sizesFor(category: string, sizes: string[]): string[] {
  const allowed = itemType(category).sizeGroups.flatMap((g) => g.values);
  return sizes.filter((s) => allowed.includes(s));
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
          <label className="draft-add">
            <span aria-hidden="true">+</span>
            <span className="draft-add-text">Add photos</span>
            <input
              type="file" accept="image/*" multiple hidden
              onChange={(e) => {
                setImages([...color.images, ...filesToDrafts(category, color.images.map((x) => x.angle), e.target.files)]);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </fieldset>
  );
}
