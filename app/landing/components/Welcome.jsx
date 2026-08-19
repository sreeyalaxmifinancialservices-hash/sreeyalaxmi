import SectionKicker from "./SectionKicker.jsx";

export default function Welcome() {
  return (
    <section id="welcome" className="relative overflow-hidden bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
        <div className="flex justify-center">
          <SectionKicker number="01" label="Welcome" />
        </div>
        <h2 data-reveal data-delay="0.05" className="mt-7 font-display text-3xl font-bold leading-tight tracking-tight text-navy sm:text-4xl lg:text-5xl">
          Welcome to SREEYALAXMI Financial Services Pvt. Ltd.
        </h2>
        <p data-reveal data-delay="0.1" className="mt-4 text-xl text-navy/80">
          <span className="font-bn font-medium text-gold">সর্বদা আপনার পরিবারের পাশে</span> <span className="text-[#64748B]">(Always by Your Family's Side)</span>
        </p>
        <p data-reveal data-delay="0.15" className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed" style={{ color: "#475569" }}>
          We are delighted to welcome you to the SREEYALAXMI family. Our commitment is to provide trusted, transparent, and customer-focused financial
          solutions that empower individuals, families, and businesses to achieve their financial goals. At SREEYALAXMI, we believe in building long-term
          relationships through integrity, innovation, and exceptional service. Together, let's create a future of financial security, growth, and
          prosperity.
        </p>
        <p data-reveal data-delay="0.2" className="mt-8 font-display text-2xl italic text-navy sm:text-3xl">
          Welcome aboard. Together, we grow
        </p>
        <div data-reveal data-delay="0.25" className="mx-auto mt-10 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent" />
      </div>
    </section>
  );
}