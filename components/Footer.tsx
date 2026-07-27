import Link from "next/link";

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
          <h3>Contact</h3>
          <p><a href="mailto:hello@vaishnora.com">hello@vaishnora.com</a></p>
          <p style={{ color: "rgba(241,228,207,.75)", fontSize: "0.92rem" }}>
            Instagram &amp; WhatsApp coming soon
          </p>
        </div>
      </div>
      <p className="footer-note">© {new Date().getFullYear()} Vaishnora. Ethnic Wear • Sarees • Dresses</p>
    </footer>
  );
}
