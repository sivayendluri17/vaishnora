"use client";

// Email-or-phone input with a country code selector for phone mode.
// Submits a single hidden field named "identifier" so the existing
// login/register API routes keep working unchanged.

import { useState } from "react";

const countries = [
  { code: "+91", label: "🇮🇳 India (+91)" },
  { code: "+1", label: "🇺🇸 United States / Canada (+1)" },
  { code: "+44", label: "🇬🇧 United Kingdom (+44)" },
  { code: "+61", label: "🇦🇺 Australia (+61)" },
  { code: "+971", label: "🇦🇪 UAE (+971)" },
  { code: "+65", label: "🇸🇬 Singapore (+65)" },
  { code: "+60", label: "🇲🇾 Malaysia (+60)" },
  { code: "+49", label: "🇩🇪 Germany (+49)" },
  { code: "+33", label: "🇫🇷 France (+33)" },
  { code: "+39", label: "🇮🇹 Italy (+39)" },
  { code: "+34", label: "🇪🇸 Spain (+34)" },
  { code: "+31", label: "🇳🇱 Netherlands (+31)" },
  { code: "+353", label: "🇮🇪 Ireland (+353)" },
  { code: "+41", label: "🇨🇭 Switzerland (+41)" },
  { code: "+46", label: "🇸🇪 Sweden (+46)" },
  { code: "+47", label: "🇳🇴 Norway (+47)" },
  { code: "+45", label: "🇩🇰 Denmark (+45)" },
  { code: "+81", label: "🇯🇵 Japan (+81)" },
  { code: "+82", label: "🇰🇷 South Korea (+82)" },
  { code: "+86", label: "🇨🇳 China (+86)" },
  { code: "+852", label: "🇭🇰 Hong Kong (+852)" },
  { code: "+886", label: "🇹🇼 Taiwan (+886)" },
  { code: "+66", label: "🇹🇭 Thailand (+66)" },
  { code: "+84", label: "🇻🇳 Vietnam (+84)" },
  { code: "+63", label: "🇵🇭 Philippines (+63)" },
  { code: "+62", label: "🇮🇩 Indonesia (+62)" },
  { code: "+92", label: "🇵🇰 Pakistan (+92)" },
  { code: "+880", label: "🇧🇩 Bangladesh (+880)" },
  { code: "+94", label: "🇱🇰 Sri Lanka (+94)" },
  { code: "+977", label: "🇳🇵 Nepal (+977)" },
  { code: "+966", label: "🇸🇦 Saudi Arabia (+966)" },
  { code: "+974", label: "🇶🇦 Qatar (+974)" },
  { code: "+965", label: "🇰🇼 Kuwait (+965)" },
  { code: "+973", label: "🇧🇭 Bahrain (+973)" },
  { code: "+968", label: "🇴🇲 Oman (+968)" },
  { code: "+90", label: "🇹🇷 Türkiye (+90)" },
  { code: "+27", label: "🇿🇦 South Africa (+27)" },
  { code: "+234", label: "🇳🇬 Nigeria (+234)" },
  { code: "+254", label: "🇰🇪 Kenya (+254)" },
  { code: "+20", label: "🇪🇬 Egypt (+20)" },
  { code: "+55", label: "🇧🇷 Brazil (+55)" },
  { code: "+52", label: "🇲🇽 Mexico (+52)" },
  { code: "+54", label: "🇦🇷 Argentina (+54)" },
  { code: "+57", label: "🇨🇴 Colombia (+57)" },
  { code: "+64", label: "🇳🇿 New Zealand (+64)" },
];

export default function IdentifierField() {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [cc, setCc] = useState("+91");
  const [phone, setPhone] = useState("");

  const identifier =
    mode === "email" ? email.trim() : phone ? `${cc}${phone.replace(/\D/g, "")}` : "";

  return (
    <div className="field">
      <label>Sign in with</label>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <button
          type="button"
          className={`chip ${mode === "email" ? "active" : ""}`}
          onClick={() => setMode("email")}
        >
          Email
        </button>
        <button
          type="button"
          className={`chip ${mode === "phone" ? "active" : ""}`}
          onClick={() => setMode("phone")}
        >
          Phone
        </button>
      </div>

      {mode === "email" ? (
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          aria-label="Email address"
        />
      ) : (
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select
            value={cc}
            onChange={(e) => setCc(e.target.value)}
            aria-label="Country code"
            style={{ flex: "0 0 40%", minWidth: 0 }}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="Phone number"
            aria-label="Phone number"
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>
      )}

      {/* The value the form actually submits */}
      <input type="hidden" name="identifier" value={identifier} />
    </div>
  );
}
