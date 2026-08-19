"use client";
import { useEffect, useState } from "react";

const links = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About Us" },
  { href: "#services", label: "Services" },
  { href: "#company", label: "Company" },
  { href: "#contact", label: "Contact" },
];

const PhoneIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.05 2a9 9 0 0 1 8 7.94" />
    <path d="M14.05 6A5 5 0 0 1 18 10" />
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-navy/5 bg-white/80 py-3 shadow-[0_8px_30px_rgb(10,27,63,0.06)] backdrop-blur-xl"
          : "bg-transparent py-5"
      }`}
      id="navbar"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 sm:px-8">
        <a href="#home" className="group flex items-center gap-3" aria-label="SREEYALAXMI home">
          <img src="/assets/logo.jpeg" alt="SREEYALAXMI logo" className="h-11 w-11 rounded-xl object-contain" />
          <span className="leading-tight">
            <span className={`block font-display text-base font-bold tracking-tight transition-colors duration-500 ${scrolled ? "text-navy" : "text-white"}`}>
              SREEYALAXMI
            </span>
            <span
              className={`block text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors duration-500 ${
                scrolled ? "text-[#64748B]" : "text-white/70"
              }`}
            >
              Financial Services
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-9 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`group relative text-sm font-semibold transition-colors duration-500 ${
                scrolled ? "text-navy/80 hover:text-navy" : "text-white/85 hover:text-white"
              }`}
            >
              {l.label}
              <span className="absolute -bottom-1.5 left-0 h-0.5 w-0 bg-gold transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="group hidden items-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-gold hover:text-navy sm:inline-flex"
          >
            Login
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </a>
          <button
            className="grid h-11 w-11 place-items-center rounded-xl border border-navy/10 text-navy lg:hidden"
            aria-label="Toggle menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      <div className={`overflow-hidden border-t border-navy/5 bg-white/95 backdrop-blur-xl lg:hidden ${open ? "" : "hidden"}`}>
        <div className="flex flex-col gap-1 px-6 py-5">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-semibold text-navy/80 transition-colors hover:bg-navy/5 hover:text-navy"
            >
              {l.label}
            </a>
          ))}
          <a
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-navy px-6 py-3 text-sm font-semibold text-white"
          >
            Login
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  );
}