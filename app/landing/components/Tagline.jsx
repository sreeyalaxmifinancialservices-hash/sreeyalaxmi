const items = [
  { text: "Always by Your Family's Side", bn: false },
  { text: "সর্বদা আপনার পরিবারের পাশে", bn: true },
];

function MarqueeItem({ text, bn }) {
  return (
    <span className="flex items-center">
      <span className={`px-8 font-display text-4xl font-bold tracking-tight sm:text-6xl ${bn ? "font-bn text-gold" : "text-white"}`}>{text}</span>
      <span className="text-gold/50">✦</span>
    </span>
  );
}

export default function Tagline() {
  return (
    <section id="tagline" className="relative overflow-hidden bg-navy py-24 text-white lg:py-28">
      <div className="animate-drift pointer-events-none absolute -left-20 top-0 h-96 w-96 rounded-full bg-gold/20 blur-[110px]" />
      <div className="animate-drift-slow pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-blue-500/15 blur-[110px]" />

      <div className="relative">
        <div className="flex w-max animate-marquee items-center">
          {[...Array(4)].map((_, i) => (
            <span key={i} className="flex">
              {items.map((it, j) => (
                <MarqueeItem key={j} {...it} />
              ))}
            </span>
          ))}
        </div>
        <p className="relative mt-12 text-center text-sm font-semibold uppercase tracking-[0.3em] text-white/50">
          SREEYALAXMI Financial Services Pvt. Ltd.
        </p>
      </div>
    </section>
  );
}