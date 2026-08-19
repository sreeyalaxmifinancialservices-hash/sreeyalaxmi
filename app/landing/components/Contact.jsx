import SectionKicker from "./SectionKicker.jsx";

const MapPinIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 4.99-5.54 10.19-7.4 11.9a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.05 2a9 9 0 0 1 8 7.94" />
    <path d="M14.05 6A5 5 0 0 1 18 10" />
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

export default function Contact() {
  return (
    <section id="contact" className="relative bg-[#F8FAFC] py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionKicker number="06" label="Get in Touch" />
        <h2 data-reveal data-delay="0.05" className="mt-6 font-display text-3xl font-bold leading-tight tracking-tight text-navy sm:text-4xl lg:text-5xl">
          Contact Us
        </h2>

        <div className="mt-12 flex justify-center">
          <div data-reveal className="w-full max-w-3xl">
            <div className="flex h-full flex-col rounded-[2rem] bg-navy p-8 text-white sm:p-10">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-gold">
                  <MapPinIcon />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Office Address</p>
                  <p className="mt-2 text-base leading-relaxed text-white/85">
                    209/2, DRISHTI APARTMENT 209 MAKHLA, 1 NO GOVT. COLONY, P.O:- Makhla SO, P.S:- UTTARPARA, District :- Hooghly, Pincode :- 712245
                  </p>
                </div>
              </div>

              <div className="mt-8 flex items-start gap-4 border-t border-white/10 pt-8">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/10 text-gold">
                  <PhoneIcon />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Office Phone</p>
                  <p className="mt-2 text-2xl font-bold">8100395588</p>
                </div>
              </div>

              <a
                href="tel:8100395588"
                className="group mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-7 py-4 text-sm font-bold text-navy transition-all duration-300 hover:-translate-y-1 hover:bg-gold-soft"
              >
                <PhoneIcon />
                Call Us
              </a>

              <div className="mt-auto pt-10">
                <p className="font-display text-xl italic text-gold-soft">Always by Your Family's Side</p>
                <p className="font-bn mt-1 text-sm text-white/60">সর্বদা আপনার পরিবারের পাশে</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}