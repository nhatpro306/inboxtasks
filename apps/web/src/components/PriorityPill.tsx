interface Props {
  priority: "low" | "medium" | "high";
}

const config = {
  high: {
    classes: "bg-danger/10 text-danger",
    dotClass: "bg-danger",
    label: "High",
  },
  medium: {
    classes: "bg-amber/10 text-amber",
    dotClass: "bg-amber",
    label: "Medium",
  },
  low: {
    classes: "bg-green/10 text-green",
    dotClass: "bg-green",
    label: "Low",
  },
};

export function PriorityPill({ priority }: Props) {
  const { classes, dotClass, label } = config[priority];
  return (
    <span
      aria-label={`${label} priority`}
      className={`inline-flex items-center gap-1.5 rounded-pill px-2 py-0.5 text-xs font-medium ${classes}`}
    >
      {/* Decorative dot — colour is supplementary; text label is the primary signal */}
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
