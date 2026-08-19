const nav = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About Us" },
  { href: "#services", label: "Services" },
  { href: "#company", label: "Company" },
  { href: "#contact", label: "Contact" },
];

const PhoneIcon = () => (
  <svg className="h-4 w-4 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.05 2a9 9 0 0 1 8 7.94" />
    <path d="M14.05 6A5 5 0 0 1 18 10" />
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MapPinIcon = () => (
  <svg className="h-4 w-4 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 4.99-5.54 10.19-7.4 11.9a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#060f24] text-white">
      <div className="pointer-events-none absolute -top-24 right-10 h-72 w-72 rounded-full bg-gold/10 blur-[110px]" />

      <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <a href="#home" className="group flex items-center gap-3" aria-label="SREEYALAXMI home">
              <img src="/assets/logo.jpeg" alt="SREEYALAXMI logo" className="h-11 w-11 rounded-xl object-contain" />
              <span className="leading-tight">
                <span className="block font-display text-base font-bold tracking-tight text-white">SREEYALAXMI</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">Financial Services</span>
              </span>
            </a>
            <p className="mt-6 font-display text-xl italic text-gold-soft">Always by Your Family's Side</p>
            <p className="font-bn mt-1 text-sm text-white/60">সর্বদা আপনার পরিবারের পাশে</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Navigate</p>
            <ul className="mt-5 space-y-3">
              {nav.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="text-sm font-medium text-white/70 transition-colors hover:text-gold">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/40">Contact</p>
            <a href="tel:8100395588" className="mt-5 flex items-center gap-3 text-sm font-medium text-white/70 transition-colors hover:text-gold">
              <PhoneIcon />
              8100395588
            </a>
            <p className="mt-4 flex items-center gap-3 text-sm font-medium text-white/70">
              <MapPinIcon />
              Uttarpara, West Bengal
            </p>
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-6 text-center">
          <p className="text-sm text-white/50">© SREEYALAXMI Financial Services Pvt. Ltd. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}