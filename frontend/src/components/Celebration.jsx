import Confetti from "./Confetti";

// A bouncy, confetti-backed banner for "level up!" / "perfect!" moments.
// Purely presentational — the parent decides when to show/hide it (usually
// with a setTimeout matching its own round-advance delay).
function Celebration({ title, subtitle }) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-20">
      <Confetti count={30} />
      <div className="animate-bounce-in bg-white dark:bg-slate-800 rounded-3xl shadow-2xl ring-2 ring-amber-300 dark:ring-amber-400/50 px-8 py-5 text-center">
        <p className="text-2xl font-extrabold text-[#1E293B] dark:text-white">{title}</p>
        {subtitle && <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export default Celebration;
