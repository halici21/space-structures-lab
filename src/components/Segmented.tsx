import { useRef, type KeyboardEvent } from "react";

export interface SegOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
}

/** Single-choice segmented control with radio-group semantics and arrow-key navigation. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className = "",
  testId,
}: {
  value: T;
  options: readonly SegOption<T>[];
  onChange(v: T): void;
  label: string;
  className?: string;
  testId?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const enabled = options.filter((o) => !o.disabled);
    const i = enabled.findIndex((o) => o.value === value);
    const next = enabled[(i + (e.key === "ArrowRight" ? 1 : -1) + enabled.length) % enabled.length];
    if (next) {
      onChange(next.value);
      requestAnimationFrame(() =>
        ref.current?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus(),
      );
    }
  };
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className={"seg " + className}
      onKeyDown={onKey}
      data-testid={testId}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          data-value={o.value}
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
