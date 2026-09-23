/**
 * Document factory, resolver and cached solve.
 *
 * The resolver is the seam between the general document and a specific
 * analysis: it checks that the document describes a configuration the solver
 * supports and maps it to the solver's plain input. Future analyses add their
 * own resolver next to this one.
 */
import { solveCantilever, type CantileverInput, type CantileverResult } from "@/lib/structures/cantilever";
import { getPreset } from "@/lib/structures/materials";
import { rectangularSection } from "@/lib/structures/section";
import { validateInput } from "@/lib/structures/validation";
import { assumptionChecks, worstStatus, type AssumptionCheck, type CheckStatus } from "@/lib/structures/validity";
import type {
  BeamGeometry,
  FixedSupport,
  LabDocument,
  MaterialEntity,
  PointForce,
  StaticBendingAnalysis,
} from "./schema";

export const IDS = {
  beam: "geo-beam-01",
  material: "mat-01",
  support: "con-fixed-01",
  load: "load-tip-01",
  analysis: "ana-static-01",
} as const;

/**
 * The starting example from the brief: L = 1 m, b = 30 mm, h = 5 mm,
 * E = 69 GPa, ρ = 2700 kg/m³, F = 100 N.
 */
export function createCantileverExample(): LabDocument {
  const preset = getPreset("al-6061-t6")!;
  return {
    schemaVersion: 1,
    name: "Cantilever study",
    geometry: [
      {
        id: IDS.beam,
        category: "geometry",
        kind: "beam",
        name: "Beam 01",
        visible: true,
        length: 1.0,
        section: rectangularSection(0.03, 0.005),
        materialId: IDS.material,
      },
    ],
    materials: [
      {
        id: IDS.material,
        category: "material",
        model: "isotropic-linear-elastic",
        name: preset.name,
        visible: true,
        presetId: preset.id,
        E: preset.E,
        rho: preset.rho,
        nu: preset.nu,
        strength: preset.strength,
      },
    ],
    constraints: [
      {
        id: IDS.support,
        category: "constraint",
        kind: "fixed",
        name: "Fixed Support",
        visible: true,
        at: { geometryId: IDS.beam, end: "start" },
      },
    ],
    loads: [
      {
        id: IDS.load,
        category: "load",
        kind: "point-force",
        name: "Tip Force",
        visible: true,
        at: { geometryId: IDS.beam, end: "end" },
        magnitude: 100,
        plane: "vertical",
      },
    ],
    analyses: [
      {
        id: IDS.analysis,
        category: "analysis",
        kind: "static",
        theory: "euler-bernoulli",
        name: "Static Bending",
        visible: true,
        geometryId: IDS.beam,
        constraintIds: [IDS.support],
        loadIds: [IDS.load],
      },
    ],
  };
}

export interface ResolvedStaticBending {
  analysis: StaticBendingAnalysis;
  beam: BeamGeometry;
  material: MaterialEntity;
  support: FixedSupport;
  load: PointForce;
  input: CantileverInput;
}

export type ResolveResult =
  | { ok: true; value: ResolvedStaticBending }
  | { ok: false; reason: string };

/**
 * Milestone 1 supports exactly one configuration: a beam fixed at its start
 * with a point force at its end. Visibility is display-only — a hidden load
 * still acts on the structure (hiding is not suppression).
 */
export function resolveStaticBending(doc: LabDocument): ResolveResult {
  const analysis = doc.analyses[0];
  if (!analysis) return { ok: false, reason: "No analysis defined." };
  const beam = doc.geometry.find((g) => g.id === analysis.geometryId);
  if (!beam) return { ok: false, reason: "The analysis references a missing beam." };
  const material = doc.materials.find((m) => m.id === beam.materialId);
  if (!material) return { ok: false, reason: "The beam has no material assigned." };
  const support = doc.constraints.find(
    (c) => analysis.constraintIds.includes(c.id) && c.kind === "fixed" && c.at.end === "start",
  );
  if (!support) return { ok: false, reason: "A fixed support at the beam root is required." };
  const load = doc.loads.find(
    (l) => analysis.loadIds.includes(l.id) && l.kind === "point-force" && l.at.end === "end",
  );
  if (!load) return { ok: false, reason: "A point force at the beam tip is required." };

  return {
    ok: true,
    value: {
      analysis,
      beam,
      material,
      support,
      load,
      input: {
        length: beam.length,
        section: beam.section,
        material: { E: material.E, rho: material.rho, nu: material.nu, strength: material.strength },
        load: { magnitude: load.magnitude, plane: load.plane },
      },
    },
  };
}

export interface SolvedDocument {
  resolved: ResolvedStaticBending;
  result: CantileverResult;
  checks: AssumptionCheck[];
  status: CheckStatus;
}

export type SolveOutcome = { ok: true; value: SolvedDocument } | { ok: false; reason: string };

const cache = new WeakMap<LabDocument, SolveOutcome>();

/** Solves the document's static analysis. Memoised per immutable document object. */
export function solveDocument(doc: LabDocument): SolveOutcome {
  const hit = cache.get(doc);
  if (hit) return hit;
  let outcome: SolveOutcome;
  const resolved = resolveStaticBending(doc);
  if (!resolved.ok) {
    outcome = resolved;
  } else {
    const issues = validateInput(resolved.value.input);
    if (issues.length > 0) {
      outcome = { ok: false, reason: issues.map((i) => i.message).join(" ") };
    } else {
      const result = solveCantilever(resolved.value.input);
      const simplified = getPreset(resolved.value.material.presetId)?.simplified ?? false;
      const checks = assumptionChecks(result, { simplifiedMaterial: simplified });
      outcome = {
        ok: true,
        value: { resolved: resolved.value, result, checks, status: worstStatus(checks) },
      };
    }
  }
  cache.set(doc, outcome);
  return outcome;
}
