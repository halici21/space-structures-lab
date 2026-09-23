import { ChevronRight } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

/** Collapsible inspector section with a compact caps header. */
export function Section({
  title,
  children,
  aside,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-b border-line">
      <div className="flex h-9 items-center gap-1 pr-3 pl-1.5">
        <button
          type="button"
          className="flex h-8 flex-1 cursor-pointer items-center gap-1 rounded-sm text-left"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
        >
          <ChevronRight
            size={13}
            className="text-faint transition-transform duration-150"
            style={{ transform: open ? "rotate(90deg)" : undefined }}
            aria-hidden
          />
          <span className="caps">{title}</span>
        </button>
        {aside}
      </div>
      <div id={id} hidden={!open} className="px-3 pb-3">
        {children}
      </div>
    </section>
  );
}
