interface Option<T extends string> {
  label: string;
  value: T;
}

interface Props<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ value, options, onChange }: Props<T>) {
  return (
    <div className="inline-flex rounded-btn border border-border bg-bg p-0.5 gap-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`text-sm px-3 py-1.5 rounded-[8px] font-medium transition-colors ${
            value === opt.value
              ? "bg-accent text-white shadow-sm"
              : "text-sub hover:text-text"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
