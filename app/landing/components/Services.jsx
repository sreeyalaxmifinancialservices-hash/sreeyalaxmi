import SectionKicker from "./SectionKicker.jsx";

const services = [
  {
    title: "Microfinance",
    desc: "Empowering women, self-help groups (SHGs), and small entrepreneurs through affordable microfinance solutions.",
    icon: (
      <svg className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: "Personal Loan",
    desc: "Quick and hassle-free personal loans to meet education, medical, travel, wedding, and other personal financial needs.",
    icon: (
      <svg className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="14" x="2" y="5" rx="2" />
        <line x1="2" x2="22" y1="10" y2="10" />
      </svg>
    ),
  },
  {
    title: "Home Loan",
    desc: "Affordable home loans with competitive interest rates to help customers purchase, construct, or renovate their dream homes.",
    icon: (
      <svg className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    title: "Business Loan",
    desc: "Flexible financing solutions for MSMEs, startups, traders, and business owners to support business growth and expansion.",
    icon: (
      <svg className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        <rect width="20" height="14" x="2" y="6" rx="2" />
      </svg>
    ),
  },
  {
    title: "Insurance Services",
    desc: "Comprehensive Life, Health, Motor, and General Insurance solutions to protect individuals, families, and businesses.",
    icon: (
      <svg className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: "Financial Advisory",
    desc: "Professional guidance on loans, insurance, financial planning, and wealth protection to help customers make informed financial decisions.",
    icon: (
      <svg className="h-7 w-7 transition-transform duration-300 group-hover:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m11 17 2 2a1 1 0 1 0 3-3" />
        <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
        <path d="m21 3 1 11h-2" />
        <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
        <path d="M3 4h8" />
      </svg>
    ),
  },
];

export default function Services() {
  return (
    <section id="services" className="relative bg-[#F8FAFC] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <SectionKicker number="04" label="Our Services" />
          <h2 data-reveal data-delay="0.05" className="mt-6 font-display text-3xl font-bold leading-tight tracking-tight text-navy sm:text-4xl lg:text-5xl">
            Comprehensive financial solutions
          </h2>
          <p data-reveal data-delay="0.1" className="mt-3 text-base font-semibold text-gold">
            SREEYALAXMI Financial Services Pvt. Ltd.
          </p>
          <p data-reveal data-delay="0.15" className="mt-4 text-lg leading-relaxed" style={{ color: "#475569" }}>
            We provide comprehensive financial solutions designed to meet the diverse needs of individuals, families, entrepreneurs, and businesses.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <div key={s.title} data-reveal data-delay={(i % 3) * 0.08}>
              <article className="card-lift group flex h-full flex-col rounded-2xl border border-[#E2E8F0] bg-white p-8 transition-shadow duration-300 hover:shadow-[0_20px_50px_rgb(10,27,63,0.1)]">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-navy text-gold transition-all duration-300 group-hover:bg-gold group-hover:text-navy">
                  {s.icon}
                </span>
                <h3 className="mt-6 font-display text-2xl font-bold text-navy">{s.title}</h3>
                <p className="mt-3 flex-1 text-base leading-relaxed" style={{ color: "#475569" }}>
                  {s.desc}
                </p>
                <span className="mt-6 h-1 w-10 rounded-full bg-gold/30 transition-all duration-300 group-hover:w-16 group-hover:bg-gold" />
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}