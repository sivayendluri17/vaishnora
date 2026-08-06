import Link from "next/link";

const INSTAGRAM_URL =
  "https://www.instagram.com/vaishnora_?igsh=MXdibnFsYWhsYjNhNw==&utm_source=ig_contact_invite";
const WHATSAPP_URL = "https://wa.me/message/SKY2OPYXT4YYH1";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <h3>Vaishnora</h3>
          <p style={{ color: "rgba(241,228,207,.75)", fontSize: "0.92rem" }}>
            Heritage Indian ethnic wear — handwoven sarees, festive dresses,
            and timeless craftsmanship.
          </p>
        </div>
        <div>
          <h3>Explore</h3>
          <p><Link href="/search">Shop all</Link></p>
          <p><Link href="/search?cat=Sarees">Sarees</Link></p>
          <p><Link href="/search?cat=Dresses">Dresses</Link></p>
        </div>
        <div>
          <h3>Account</h3>
          <p><Link href="/login">Sign in</Link></p>
          <p><Link href="/register">Create account</Link></p>
          <p><Link href="/cart">Your cart</Link></p>
        </div>
        <div>
          <h3>Reach us</h3>
          <p>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
              </svg>
              Reach us on Instagram
            </a>
          </p>
          <p>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="footer-social-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm5.8 14.13c-.24.68-1.4 1.3-1.94 1.38-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.65-.61-2.9-1.25-4.8-4.17-4.94-4.36-.15-.19-1.19-1.58-1.19-3.01 0-1.43.75-2.14 1.02-2.43.27-.29.58-.36.78-.36.19 0 .39 0 .56.01.18.01.42-.07.66.5.24.59.83 2.02.9 2.17.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.28-.12.55.16.27.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.17-.19.69-.8.87-1.08.18-.27.36-.22.6-.13.24.09 1.55.73 1.82.86.27.14.44.2.5.31.07.12.07.66-.17 1.34z"/>
              </svg>
              Message us on WhatsApp
            </a>
          </p>
        </div>
      </div>
      <p className="footer-note">© {new Date().getFullYear()} Vaishnora. Ethnic Wear • Sarees • Dresses</p>
    </footer>
  );
}
