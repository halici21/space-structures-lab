import katex from "katex";
import { describe, expect, it } from "vitest";
import { rectangularSection } from "@/lib/structures/section";
import { rankDrivers } from "@/lib/structures/sensitivity";
import { proportionalityTex } from "./learn/explain";
import { PARAM_META, RESULT_META } from "./meta";

// A lost backslash turns "\nu" into newline + "u" and "\delta" into "delta"
// without any type or runtime error. These checks make that loud.
const CONTROL = /[\u0000-\u001f]/;

describe("TeX symbols", () => {
  const all = [...Object.values(PARAM_META), ...Object.values(RESULT_META)];

  it.each(all.map((m) => [m.label, m.symbol]))("%s symbol has no control characters", (_label, symbol) => {
    expect(CONTROL.test(symbol)).toBe(false);
  });

  it.each(all.map((m) => [m.label, m.symbol]))("%s symbol parses in KaTeX", (_label, symbol) => {
    expect(() => katex.renderToString(symbol, { throwOnError: true })).not.toThrow();
  });

  it("Greek symbols are TeX commands, not plain words", () => {
    expect(RESULT_META.tipDeflection.symbol).toBe(String.raw`\delta`);
    expect(PARAM_META.rho.symbol).toBe(String.raw`\rho`);
    expect(PARAM_META.nu.symbol).toBe(String.raw`\nu`);
  });

  it("generated proportionality renders", () => {
    const input = {
      length: 1,
      section: rectangularSection(0.03, 0.005),
      material: { E: 69e9, rho: 2700, nu: 0.33, strength: 276e6 },
      load: { magnitude: 100, plane: "vertical" as const },
    };
    const tex = proportionalityTex("tipDeflection", rankDrivers(input, "tipDeflection"));
    expect(tex.startsWith(String.raw`\delta \propto`)).toBe(true);
    expect(() => katex.renderToString(tex, { throwOnError: true })).not.toThrow();
  });
});
