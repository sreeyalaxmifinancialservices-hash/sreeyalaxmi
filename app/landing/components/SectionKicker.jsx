export default function SectionKicker({ number, label, dark = false }) {
  return (
    <div data-reveal>
      <div className="flex items-center gap-3">
        <span className="font-display text-lg italic text-gold">{number}</span>
        <span className="h-px w-8 bg-gold/60" />
        <span className={`text-xs font-semibold uppercase tracking-[0.28em] ${dark ? "text-white/50" : "text-navy/50"}`}>{label}</span>
      </div>
    </div>
  );
}