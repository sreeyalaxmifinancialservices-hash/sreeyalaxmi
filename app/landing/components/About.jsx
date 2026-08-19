import SectionKicker from "./SectionKicker.jsx";

const aboutText =
  "There were many microfinance institutions active in rural India, but very few served India's urban population. To bridge this gap, SREEYALAXMI focused on the urban poor. This is a fast growing segment that is relatively new to India's microfinance industry. Our surveys and interaction with the urban poor show that they are exposed to enormous contingencies and are required to share their meagre resources with neighbors, friends, relatives and colleagues. Hence, there is a tremendous amount of bonding and affinity among them. We have also found that, contrary to popular belief, the urban poor are a stable population. Therefore, the significant difference between the urban and rural population is the lack of time and availability of space in cities. Our primary target customers are women because research has shown that they are a better population segment for microfinance. They are proven to spend a larger portion of their money on the welfare of their family and therefore create systemic changes needed to move their families out of poverty. The lending alternatives for poor women, besides MFIs, are comprised of moneylenders and other high cost, typically unreliable services. Our strategy, products and distribution methods began based on the results of an 18 month pilot program and an extensive market research study, both based in Kolkata, and has evolved over the past three years based on our findings and experience in each of our regions. From our research and experience, we have found that income is not a reliable determinant to establish economic status of the urban poor, so we also consider a variety of factors other such as housing, occupation, education, expenditure etc. Unlike in rural areas, a substantial portion of the urban poor are employees with salary income, working in the unorganized sector as housemaids or cooks and the organized sector in factories, hospitals, offices and hotels. The self-employed are mainly vendors, small shopkeepers, tailors, etc.";

export default function About() {
  return (
    <section id="about" className="relative overflow-hidden bg-[#F8FAFC] py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-start gap-14 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div data-reveal className="lg:sticky lg:top-28">
          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] border border-border-light shadow-[0_20px_60px_rgb(10,27,63,0.1)]">
              <img src="/assets/about.png" alt="A community of women supporting one another" className="hover-scale aspect-[4/5] w-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -right-4 hidden rounded-2xl border border-border-light bg-white px-6 py-5 shadow-[0_16px_40px_rgb(10,27,63,0.12)] sm:block">
              <p className="font-display text-3xl font-bold text-navy">Urban</p>
              <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#64748B" }}>
                Focused Microfinance
              </p>
            </div>
          </div>
        </div>

        <div>
          <SectionKicker number="02" label="About Us" />
          <h2 data-reveal data-delay="0.05" className="mt-6 font-display text-3xl font-bold leading-tight tracking-tight text-navy sm:text-4xl lg:text-5xl">
            Built for India's urban families
          </h2>
          <p data-reveal data-delay="0.1" className="mt-8 text-base leading-[1.9] sm:text-lg" style={{ color: "#475569" }}>
            {aboutText}
          </p>
        </div>
      </div>
    </section>
  );
}