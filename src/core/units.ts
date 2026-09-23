/**
 * Units.
 *
 * The physical state is always SI. Units exist only at the display boundary:
 * `toDisplay` / `fromDisplay` convert, `formatQuantity` renders. Switching the
 * display system never touches the document.
 */

export type Dimension =
  | "length"
  | "area"
  | "inertia"
  | "force"
  | "axial"
  | "moment"
  | "pressure"
  | "density"
  | "mass"
  | "flexural"
  | "linearStiffness"
  | "angle"
  | "ratio";

export interface UnitDef {
  id: string;
  /** Display symbol. */
  symbol: string;
  /** SI value of one of this unit. */
  factor: number;
}

export const UNITS: Record<Dimension, readonly UnitDef[]> = {
  length: [
    { id: "m", symbol: "m", factor: 1 },
    { id: "cm", symbol: "cm", factor: 1e-2 },
    { id: "mm", symbol: "mm", factor: 1e-3 },
  ],
  area: [
    { id: "m2", symbol: "m²", factor: 1 },
    { id: "cm2", symbol: "cm²", factor: 1e-4 },
    { id: "mm2", symbol: "mm²", factor: 1e-6 },
  ],
  inertia: [
    { id: "m4", symbol: "m⁴", factor: 1 },
    { id: "cm4", symbol: "cm⁴", factor: 1e-8 },
    { id: "mm4", symbol: "mm⁴", factor: 1e-12 },
  ],
  force: [
    { id: "N", symbol: "N", factor: 1 },
    { id: "kN", symbol: "kN", factor: 1e3 },
  ],
  axial: [
    { id: "N", symbol: "N", factor: 1 },
    { id: "kN", symbol: "kN", factor: 1e3 },
    { id: "MN", symbol: "MN", factor: 1e6 },
  ],
  moment: [
    { id: "Nm", symbol: "N·m", factor: 1 },
    { id: "kNm", symbol: "kN·m", factor: 1e3 },
    { id: "Nmm", symbol: "N·mm", factor: 1e-3 },
  ],
  pressure: [
    { id: "Pa", symbol: "Pa", factor: 1 },
    { id: "kPa", symbol: "kPa", factor: 1e3 },
    { id: "MPa", symbol: "MPa", factor: 1e6 },
    { id: "GPa", symbol: "GPa", factor: 1e9 },
  ],
  density: [
    { id: "kgm3", symbol: "kg/m³", factor: 1 },
    { id: "gcm3", symbol: "g/cm³", factor: 1e3 },
  ],
  mass: [
    { id: "kg", symbol: "kg", factor: 1 },
    { id: "g", symbol: "g", factor: 1e-3 },
  ],
  flexural: [
    { id: "Nm2", symbol: "N·m²", factor: 1 },
    { id: "Nmm2", symbol: "N·mm²", factor: 1e-6 },
  ],
  linearStiffness: [
    { id: "Nm", symbol: "N/m", factor: 1 },
    { id: "Nmm", symbol: "N/mm", factor: 1e3 },
    { id: "kNm", symbol: "kN/m", factor: 1e3 },
  ],
  angle: [
    { id: "rad", symbol: "rad", factor: 1 },
    { id: "deg", symbol: "°", factor: Math.PI / 180 },
  ],
  ratio: [
    { id: "one", symbol: "", factor: 1 },
    { id: "pct", symbol: "%", factor: 1e-2 },
  ],
};

/**
 * A quantity kind is a physical dimension plus a role. Roles with the same
 * dimension (span vs. section dimension vs. displacement) may be displayed in
 * different units, as engineers do.
 */
export type QuantityKind =
  | "span"
  | "sectionDim"
  | "displacement"
  | "area"
  | "inertia"
  | "force"
  | "axialStiffness"
  | "moment"
  | "stress"
  | "modulus"
  | "density"
  | "mass"
  | "flexuralStiffness"
  | "tipStiffness"
  | "rotation"
  | "poisson"
  | "ratio";

export const KIND_DIMENSION: Record<QuantityKind, Dimension> = {
  span: "length",
  sectionDim: "length",
  displacement: "length",
  area: "area",
  inertia: "inertia",
  force: "force",
  axialStiffness: "axial",
  moment: "moment",
  stress: "pressure",
  modulus: "pressure",
  density: "density",
  mass: "mass",
  flexuralStiffness: "flexural",
  tipStiffness: "linearStiffness",
  rotation: "angle",
  poisson: "ratio",
  ratio: "ratio",
};

export type UnitSystemId = "engineering" | "si";

export type UnitPrefs = Record<QuantityKind, string>;

export const UNIT_SYSTEMS: Record<UnitSystemId, { label: string; prefs: UnitPrefs }> = {
  engineering: {
    label: "Engineering (mm · MPa)",
    prefs: {
      span: "m",
      sectionDim: "mm",
      displacement: "mm",
      area: "mm2",
      inertia: "mm4",
      force: "N",
      axialStiffness: "MN",
      moment: "Nm",
      stress: "MPa",
      modulus: "GPa",
      density: "kgm3",
      mass: "kg",
      flexuralStiffness: "Nm2",
      tipStiffness: "Nm",
      rotation: "deg",
      poisson: "one",
      ratio: "pct",
    },
  },
  si: {
    label: "SI base (m · Pa)",
    prefs: {
      span: "m",
      sectionDim: "m",
      displacement: "m",
      area: "m2",
      inertia: "m4",
      force: "N",
      axialStiffness: "N",
      moment: "Nm",
      stress: "Pa",
      modulus: "Pa",
      density: "kgm3",
      mass: "kg",
      flexuralStiffness: "Nm2",
      tipStiffness: "Nm",
      rotation: "rad",
      poisson: "one",
      ratio: "one",
    },
  },
};

export function unitFor(kind: QuantityKind, system: UnitSystemId): UnitDef {
  const dim = KIND_DIMENSION[kind];
  const id = UNIT_SYSTEMS[system].prefs[kind];
  const unit = UNITS[dim].find((u) => u.id === id);
  if (!unit) throw new Error(`Unit ${id} is not defined for ${dim}`);
  return unit;
}

export const toDisplay = (si: number, unit: UnitDef): number => si / unit.factor;
export const fromDisplay = (value: number, unit: UnitDef): number => value * unit.factor;

const SUPERSCRIPT: Record<string, string> = {
  "-": "⁻",
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
};

const superscript = (n: number) =>
  String(n)
    .split("")
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join("");

function stripZeros(s: string): string {
  return s.includes(".") ? s.replace(/\.?0+$/, "") : s;
}

/**
 * Formats a plain number with `sig` significant figures. Values outside
 * [1e-3, 1e6) switch to "m × 10ⁿ" so nothing ever renders as "0.000".
 */
export function formatNumber(value: number, sig = 4): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e-3 && abs < 1e6) {
    // Fixed notation with `sig` significant figures, never exponent form.
    const digits = Math.max(0, sig - 1 - Math.floor(Math.log10(abs)));
    return stripZeros(value.toFixed(Math.min(digits, 12)));
  }
  const exp = Math.floor(Math.log10(abs));
  let mantissa = value / 10 ** exp;
  let e = exp;
  if (Math.abs(Number(mantissa.toFixed(sig - 1))) >= 10) {
    mantissa /= 10;
    e += 1;
  }
  return `${stripZeros(mantissa.toFixed(sig - 1))} × 10${superscript(e)}`;
}

export interface FormattedQuantity {
  value: string;
  unit: string;
}

export function formatQuantity(
  si: number,
  kind: QuantityKind,
  system: UnitSystemId,
  sig = 4,
): FormattedQuantity {
  const unit = unitFor(kind, system);
  return { value: formatNumber(toDisplay(si, unit), sig), unit: unit.symbol };
}

export function formatQuantityText(
  si: number,
  kind: QuantityKind,
  system: UnitSystemId,
  sig = 4,
): string {
  const f = formatQuantity(si, kind, system, sig);
  if (!f.unit) return f.value;
  return f.unit === "%" || f.unit === "°" ? `${f.value}${f.unit}` : `${f.value} ${f.unit}`;
}

/**
 * Parses user input: accepts "1.5", "1,5" (decimal comma), "2e-3", "2E3",
 * surrounding spaces and thin-space digit groups. Returns NaN when not a number.
 */
export function parseNumber(text: string): number {
  const t = text.trim().replace(/[\s  ]/g, "").replace(",", ".");
  if (t === "" || !/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t)) return Number.NaN;
  return Number(t);
}

/** Editable text for an SI value in a given unit — full precision, no exponent glyphs. */
export function editableText(si: number, unit: UnitDef): string {
  const v = toDisplay(si, unit);
  if (!Number.isFinite(v)) return "";
  const rounded = Number(v.toPrecision(10));
  return String(rounded);
}
