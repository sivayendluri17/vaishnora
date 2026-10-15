"use client";

// Collapsible section for the product page (Fabric & care, Delivery, Size
// guide). Native <details> so it works without JavaScript and is keyboard
// accessible; the CSS only styles it.

export default function Accordion({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details className="accordion" open={defaultOpen}>
      <summary>
        <span>{title}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </summary>
      <div className="accordion-body">{children}</div>
    </details>
  );
}
