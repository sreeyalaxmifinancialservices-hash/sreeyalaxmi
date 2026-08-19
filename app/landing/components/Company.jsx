import SectionKicker from "./SectionKicker.jsx";

const CalendarIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4" />
    <path d="M16 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
    <path d="M8 14h.01" />
    <path d="M12 14h.01" />
    <path d="M16 14h.01" />
    <path d="M8 18h.01" />
    <path d="M12 18h.01" />
    <path d="M16 18h.01" />
  </svg>
);

const BuildingIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
    <path d="M10 6h4" />
    <path d="M10 10h4" />
    <path d="M10 14h4" />
    <path d="M10 18h4" />
  </svg>
);

const MapPinIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 4.99-5.54 10.19-7.4 11.9a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const overview = [
  { icon: <CalendarIcon />, label: "Date of Incorporation", value: "24 June 2024" },
  { icon: <BuildingIcon />, label: "Structure", value: "Private Limited Company, West Bengal" },
  { icon: <MapPinIcon />, label: "Registered Office", value: "Uttarpara, West Bengal" },
];

const paragraphs = [
  "SREEYALAXMI Financial Services Pvt. Ltd. is a financial services company committed to providing reliable, transparent, and customer-focused financial solutions. Our mission is to promote financial inclusion by making credit, insurance, and financial advisory services accessible to individuals, families, entrepreneurs, and small businesses.",
  "We strive to build long-term relationships with our customers through ethical business practices, quick service, and personalized financial solutions.",
  "The company is incorporated as a private limited company in West Bengal and is listed as an active company in the Ministry of Corporate Affairs (MCA) records.",
  "SREEYALAXMI Financial Services Pvt. Ltd. is a professionally managed financial services company committed to empowering individuals, families, entrepreneurs, and small businesses with reliable, transparent, and affordable financial solutions.",
  "Headquartered in Kolkata with its registered office in Uttarpara, West Bengal, the company offers a comprehensive range of services, including Microfinance, Personal Loans, Home Loans, Business Loans, and Insurance Solutions. Our customer-centric approach, quick processing, and ethical business practices enable us to meet the diverse financial needs of our clients efficiently.",
  "Driven by innovation and a dedicated team of professionals, SREEYALAXMI Financial Services strives to promote financial inclusion and sustainable economic growth while building long-term relationships based on trust, integrity, and excellence.",
];

export default function Company() {
  return (
    <section id="company" className="relative overflow-hidden bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionKicker number="03" label="About Company" />

        <div className="mt-8 grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div data-reveal className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[2rem] bg-navy p-8 text-white sm:p-10">
              <h2 className="font-display text-3xl font-bold leading-tight sm:text-4xl">Company Overview</h2>
              <p className="mt-3 text-lg font-semibold text-gold">SREEYALAXMI Financial Services Pvt. Ltd.</p>

              <div className="mt-8 space-y-5">
                {overview.map((item) => (
                  <div key={item.label} className="flex items-start gap-4 border-t border-white/10 pt-5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-gold">{item.icon}</span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">{item.label}</p>
                      <p className="mt-1 text-base font-semibold">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-2xl border border-gold/30 bg-gold/10 px-5 py-4">
                <p className="font-display text-lg italic text-gold-soft">Always by Your Family's Side</p>
                <p className="font-bn mt-1 text-sm text-white/70">সর্বদা আপনার পরিবারের পাশে</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {paragraphs.map((text, i) => (
              <p key={i} data-reveal data-delay={i * 0.04} className="text-base leading-[1.9] sm:text-lg" style={{ color: "#475569" }}>
                {text}
              </p>
            ))}
            <div data-reveal data-delay="0.1" className="mt-4 rounded-2xl border border-border-light bg-[#F8FAFC] px-6 py-6 text-center">
              <p className="font-display text-2xl font-bold text-navy">Always by Your Family's Side</p>
              <p className="font-bn mt-2 text-lg text-gold">সর্বদা আপনার পরিবারের পাশে</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}