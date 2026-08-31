function SegmentedControl({ options, value, onChange, className = "" }) {
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );

  return (
    <div className={`relative flex bg-gray-100 dark:bg-slate-700 rounded-full p-1 ${className}`}>
      <div
        className="absolute inset-y-1 left-1 rounded-full bg-white dark:bg-slate-600 shadow-sm transition-transform duration-300 ease-out"
        style={{
          width: `calc(${100 / options.length}% - 4px)`,
          transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 4}px))`,
        }}
        aria-hidden="true"
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${
            value === option.value
              ? "text-[#1E293B] dark:text-white"
              : "text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default SegmentedControl;
