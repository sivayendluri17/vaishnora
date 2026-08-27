import Link from "next/link";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your Account — Vaishnora" };

const cards = [
  { href: "/account/orders", title: "Your Orders", desc: "Track, review, or reorder your past purchases", icon: "orders" },
  { href: "/account/security", title: "Login & Security", desc: "Edit your name, sign-in details, and password", icon: "security" },
  { href: "/account/addresses", title: "Your Addresses", desc: "Edit, add, or set a default delivery address", icon: "address" },
  { href: "/support", title: "Customer Support", desc: "Reach us on WhatsApp for help with anything", icon: "support" },
  { href: "/account/messages", title: "Your Messages", desc: "View replies and updates from Vaishnora", icon: "messages" },
];

function Icon({ name }: { name: string }) {
  const common = { width: 30, height: 30, fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "orders": return (<svg {...common}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>);
    case "security": return (<svg {...common}><path d="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z"/><circle cx="12" cy="11" r="2.5"/><path d="M12 13.5V16"/></svg>);
    case "address": return (<svg {...common}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M9 22V12h6v10"/></svg>);
    case "support": return (<svg {...common}><path d="M4 12a8 8 0 0 1 16 0v5a3 3 0 0 1-3 3h-2"/><rect x="2" y="12" width="4" height="6" rx="1"/><rect x="18" y="12" width="4" height="6" rx="1"/></svg>);
    case "messages": return (<svg {...common}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>);
    default: return null;
  }
}

export default async function AccountHub() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await verifyToken(token);
  if (!session) redirect("/login?next=/account");

  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow">Your account</span>
        <h2>Hello, {session.name.split(" ")[0]}</h2>
        <div className="acct-hub-grid">
          {cards.map((c) => (
            <Link key={c.href} href={c.href} className="acct-hub-card">
              <span className="acct-hub-icon"><Icon name={c.icon} /></span>
              <span className="acct-hub-text">
                <strong>{c.title}</strong>
                <span>{c.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
