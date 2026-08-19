"use client";
import { useEffect, useState } from "react";

const ShieldIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const HeartHandIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <path d="M12 5 9.04 7.96a2.17 2.17 0 0 0 0 3.08c.82.82 2.13.85 3 .07l2.07-1.9a2.82 2.82 0 0 1 3.79 0l2.96 2.66" />
    <path d="m18 15-2-2" />
    <path d="m15 18-2-2" />
  </svg>
);

const EyeIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const trustCards = [
  { delay: "1.1s", icon: <ShieldIcon />, label: "Trusted Financial Solutions" },
  { delay: "1.28s", icon: <HeartHandIcon />, label: "Customer Focused" },
  { delay: "1.46s", icon: <EyeIcon />, label: "Transparent Services" },
];

export default function Hero() {
  const [lines, setLines] = useState([{ opacity: 0, transform: "translateY(110%)" }, { opacity: 0, transform: "translateY(110%)" }]);

  useEffect(() => {
    let raf;
    raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setLines([
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 1, transform: "translateY(0)" },
        ]);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const lineStyle = (i) => ({
    opacity: lines[i]?.opacity ?? 0,
    transform: lines[i]?.transform ?? "translateY(110%)",
    transition: "transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.9s cubic-bezier(0.22,1,0.36,1)",
    transitionDelay: `${0.2 + i * 0.13}s`,
  });

  return (
    <section id="home" className="relative overflow-hidden bg-navy pb-28 pt-36 text-white sm:pt-40 lg:pb-36">
      <div className="pointer-events-none absolute -right-32 -top-24 h-[34rem] w-[34rem] rounded-full bg-gold/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 h-[30rem] w-[30rem] rounded-full bg-blue-500/10 blur-[120px]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-soft">
            SREEYALAXMI Financial Services Pvt. Ltd.
          </p>

          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            <span className="block overflow-hidden py-1">
              <span className="block" style={lineStyle(0)}>
                Always by Your
              </span>
            </span>
            <span className="block overflow-hidden py-1">
              <span className="block" style={lineStyle(1)}>
                Family's <span className="italic text-gold">Side</span>
              </span>
            </span>
          </h1>

          <p className="font-bn mt-5 text-2xl font-medium text-white/85 sm:text-3xl">সর্বদা আপনার পরিবারের পাশে</p>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            Trusted, transparent and customer-focused financial solutions — empowering individuals, families and businesses to achieve their goals
            with confidence.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#services"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-4 text-sm font-bold text-navy transition-all duration-300 hover:-translate-y-1 hover:bg-gold-soft"
            >
              Explore Our Services
              <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </a>
            <a
              href="#contact"
              className="group inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-7 py-4 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:border-gold hover:text-gold"
            >
              Contact Us
              <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7h10v10" />
                <path d="M7 17 17 7" />
              </svg>
            </a>
          </div>
        </div>

        <div className="relative">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
            <img src="/assets/hero.jpg" alt="A family sharing a joyful moment together" className="hero-img aspect-[4/5] w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/70 via-transparent to-transparent" />
          </div>

          <div className="absolute -bottom-6 left-1/2 flex w-[92%] -translate-x-1/2 flex-col gap-3 sm:-left-6 sm:w-auto sm:translate-x-0">
            {trustCards.map((c) => (
              <div
                key={c.label}
                className="trust-card flex items-center gap-3 rounded-2xl border border-white/40 bg-white/85 px-4 py-3 text-navy shadow-[0_12px_40px_rgb(6,15,36,0.25)] backdrop-blur-xl"
                style={{ animationDelay: c.delay }}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy text-gold">{c.icon}</span>
                <span className="text-sm font-bold">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}