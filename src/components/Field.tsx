/**
 * Inspector field primitives.
 *
 * Grid: [label 1fr] [symbol 24px] [control 92px] [unit 44px]. Every row in
 * every inspector uses this grid, so labels, inputs and units line up across
 * sections.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  editableText,
  formatQuantity,
  fromDisplay,
  parseNumber,
  toDisplay,
  unitFor,
  type QuantityKind,
} from "@/core/units";
import { validateParameter, type ParameterKey } from "@/lib/structures/validation";
import { useLab } from "@/state/store";
import { Tex } from "./Tex";

const GRID = "grid grid-cols-[minmax(0,1fr)_24px_92px_44px] items-center gap-x-2";

export function SymbolTex({ tex }: { tex: string }) {
  return (
    <span className="text-center text-muted" aria-hidden>
      <Tex tex={tex} />
    </span>
  );
}

/** Positive-only parameters never step to or below zero. */
const POSITIVE_ONLY: ParameterKey[] = ["L", "b", "h", "E", "rho", "strength"];

/** Arrow-key step: one unit in the second significant digit; Shift = ×10. */
function stepFor(display: number, big: boolean): number {
  const a = Math.abs(display);
  const base = a === 0 ? 1 : 10 ** (Math.floor(Math.log10(a)) - 1);
  return big ? base * 10 : base;
}

const ERROR_DELAY_MS = 650;

export function NumberField({
  param,
  kind,
  label,
  symbol,
  value,
  testId,
}: {
  param: ParameterKey;
  kind: QuantityKind;
  label: string;
  symbol: string;
  /** Current SI value. */
  value: number;
  testId?: string;
}) {
  const system = useLab((s) => s.unitSystem);
  const unit = unitFor(kind, system);
  const setParameter = useLab((s) => s.setParameter);
  const beginEdit = useLab((s) => s.beginEdit);
  const setFieldError = useLab((s) => s.setFieldError);
  const storeError = useLab((s) => s.fieldErrors[param]);

  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  // A ref, not state: blur fires synchronously inside key handlers, before a
  // state update from the same event would be visible to it.
  const pendingError = useRef<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  // Reset the draft when the display unit changes so text and unit never disagree.
  useEffect(() => setDraft(null), [unit.id]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const showError = (msg: string | null, immediate = false) => {
    window.clearTimeout(timer.current);
    pendingError.current = msg;
    if (!msg) return setFieldError(param, null);
    if (immediate) setFieldError(param, msg);
    else timer.current = window.setTimeout(() => setFieldError(param, msg), ERROR_DELAY_MS);
  };

  const accept = (text: string) => {
    setDraft(text);
    const v = parseNumber(text);
    if (Number.isNaN(v)) return showError("Enter a number.");
    const si = fromDisplay(v, unit);
    const msg = validateParameter(param, si);
    if (msg) return showError(msg);
    showError(null);
    if (si !== value) setParameter(param, si);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (pendingError.current) showError(pendingError.current, true);
      else e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setDraft(null);
      showError(null);
      e.currentTarget.blur();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const current = draft !== null && !Number.isNaN(parseNumber(draft)) ? parseNumber(draft) : toDisplay(value, unit);
      let step = stepFor(current, e.shiftKey) * (e.key === "ArrowUp" ? 1 : -1);
      let next = current + step;
      while (POSITIVE_ONLY.includes(param) && next <= 0 && Math.abs(step) > 1e-15) {
        step /= 10;
        next = current + step;
      }
      if (param === "F" && next < 0) next = 0;
      accept(String(Number(next.toPrecision(10))));
    }
  };

  const error = storeError ?? null;
  const shown = draft ?? editableText(value, unit);

  return (
    <div className="py-[4px]">
      <div className={GRID}>
        <label htmlFor={id} className="min-w-0 text-muted">
          {label}
        </label>
        <SymbolTex tex={symbol} />
        <input
          id={id}
          className="input"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          value={shown}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? id + "-err" : undefined}
          data-testid={testId}
          data-param={param}
          onFocus={(e) => {
            beginEdit(param);
            // Keep an invalid draft on re-focus so the user can correct what they typed.
            if (!pendingError.current) setDraft(editableText(value, unit));
            e.currentTarget.select();
          }}
          onChange={(e) => accept(e.target.value)}
          onBlur={() => {
            if (pendingError.current) showError(pendingError.current, true);
            else setDraft(null);
          }}
          onKeyDown={onKeyDown}
        />
        <span className="truncate text-faint">{unit.symbol || "–"}</span>
      </div>
      {error && (
        <p id={id + "-err"} role="alert" className="mt-1 mr-[52px] text-right text-[11px] text-violated">
          {error}
        </p>
      )}
    </div>
  );
}

export function ReadoutRow({
  label,
  symbol,
  value,
  kind,
  aside,
  testId,
}: {
  label: ReactNode;
  symbol: string;
  value: number;
  kind: QuantityKind;
  aside?: ReactNode;
  testId?: string;
}) {
  const system = useLab((s) => s.unitSystem);
  const f = formatQuantity(value, kind, system);
  return (
    <div className={GRID + " min-h-[28px]"}>
      <span className="flex min-w-0 items-center gap-1.5 text-muted">
        <span className="min-w-0">{label}</span>
        {aside}
      </span>
      <SymbolTex tex={symbol} />
      <span className="num truncate pr-[8px] text-right text-fg" data-testid={testId}>
        {f.value}
      </span>
      <span className="truncate text-faint">{f.unit || "–"}</span>
    </div>
  );
}

export function SelectRow({
  label,
  value,
  onChange,
  children,
  testId,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  children: ReactNode;
  testId?: string;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,176px)] items-center gap-x-2 py-[4px]">
      <label htmlFor={id} className="min-w-0 text-muted">
        {label}
      </label>
      <select
        id={id}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
      >
        {children}
      </select>
    </div>
  );
}
