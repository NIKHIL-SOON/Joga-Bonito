// A chunky, tactile "arcade" button — solid bottom edge that compresses on
// press, instead of a flat rectangle. Used for primary actions inside games
// so they feel more like a game control than a form button.
const COLOR_STYLES = {
  blue: {
    bg: "bg-[#2563EB] hover:bg-[#1d4ed8] text-white",
    shadow: "shadow-[0_4px_0_0_#1447b8]",
  },
  emerald: {
    bg: "bg-emerald-500 hover:bg-emerald-600 text-white",
    shadow: "shadow-[0_4px_0_0_#047857]",
  },
  amber: {
    bg: "bg-amber-400 hover:bg-amber-500 text-white",
    shadow: "shadow-[0_4px_0_0_#b45309]",
  },
  rose: {
    bg: "bg-rose-500 hover:bg-rose-600 text-white",
    shadow: "shadow-[0_4px_0_0_#9f1239]",
  },
  neutral: {
    bg: "bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-[#1E293B] dark:text-white",
    shadow: "shadow-[0_4px_0_0_rgba(0,0,0,0.15)] dark:shadow-[0_4px_0_0_rgba(0,0,0,0.4)]",
  },
};

function GameButton({ color = "blue", className = "", children, disabled, ...props }) {
  const style = COLOR_STYLES[color] || COLOR_STYLES.blue;

  return (
    <button
      type="button"
      disabled={disabled}
      className={`game-btn inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${style.bg} ${
        disabled ? "" : style.shadow
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default GameButton;
