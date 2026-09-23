/**
 * Lab document schema.
 *
 * The document is the physical model only: geometry, physics and analysis
 * definitions, all in SI. View state (selection, camera, workspace, units)
 * lives in the store, never here.
 *
 * Every category is a discriminated union so future entity kinds (tube,
 * membrane, joint, prestress, modal, buckling…) can be added as new union
 * members without changing the document shape. Milestone 1 implements one
 * member of each union. The `*_KINDS` registries list the planned kinds so
 * the UI can show them as unavailable instead of pretending they exist.
 */
import type { BendingPlane } from "@/lib/structures/cantilever";
import type { MaterialPresetId } from "@/lib/structures/materials";
import type { SectionShape } from "@/lib/structures/section";

export type EntityId = string;

interface EntityBase {
  id: EntityId;
  name: string;
  visible: boolean;
}

// ---------------------------------------------------------------- geometry

export type GeometryKind = "beam" | "tube" | "plate" | "membrane" | "cable" | "boom" | "assembly";

export interface BeamGeometry extends EntityBase {
  category: "geometry";
  kind: "beam";
  /** Length along the member z-axis [m]. */
  length: number;
  section: SectionShape;
  materialId: EntityId;
}

export type GeometryEntity = BeamGeometry;

// ----------------------------------------------------------------- physics

export interface IsotropicMaterialEntity extends EntityBase {
  category: "material";
  model: "isotropic-linear-elastic";
  presetId: MaterialPresetId;
  /** Young's modulus [Pa]. */
  E: number;
  /** Density [kg/m³]. */
  rho: number;
  /** Poisson's ratio [–]. */
  nu: number;
  /** Reference strength for the linear-elastic check [Pa]. */
  strength: number;
}

export type MaterialEntity = IsotropicMaterialEntity;

/** A location on a 1D member: its start (z = 0) or end (z = L). */
export interface MemberEnd {
  geometryId: EntityId;
  end: "start" | "end";
}

export type ConstraintKind = "fixed" | "pinned" | "roller" | "spring" | "joint" | "damper";

export interface FixedSupport extends EntityBase {
  category: "constraint";
  kind: "fixed";
  at: MemberEnd;
}

export type ConstraintEntity = FixedSupport;

export type LoadKind = "point-force" | "distributed" | "moment" | "prestress" | "thermal";

export interface PointForce extends EntityBase {
  category: "load";
  kind: "point-force";
  at: MemberEnd;
  /** Force magnitude [N]. */
  magnitude: number;
  /** vertical = −y, lateral = −x (section axes). */
  plane: BendingPlane;
}

export type LoadEntity = PointForce;

// ---------------------------------------------------------------- analysis

export type AnalysisKind =
  | "static"
  | "modal"
  | "frf"
  | "buckling"
  | "nonlinear"
  | "deployment"
  | "thermal";

export interface StaticBendingAnalysis extends EntityBase {
  category: "analysis";
  kind: "static";
  theory: "euler-bernoulli";
  geometryId: EntityId;
  constraintIds: EntityId[];
  loadIds: EntityId[];
}

export type AnalysisEntity = StaticBendingAnalysis;

// ---------------------------------------------------------------- document

export type Entity = GeometryEntity | MaterialEntity | ConstraintEntity | LoadEntity | AnalysisEntity;
export type EntityCategory = Entity["category"];

export interface LabDocument {
  schemaVersion: 1;
  name: string;
  geometry: GeometryEntity[];
  materials: MaterialEntity[];
  constraints: ConstraintEntity[];
  loads: LoadEntity[];
  analyses: AnalysisEntity[];
}

export function allEntities(doc: LabDocument): Entity[] {
  return [...doc.geometry, ...doc.materials, ...doc.constraints, ...doc.loads, ...doc.analyses];
}

export function findEntity(doc: LabDocument, id: EntityId | null): Entity | undefined {
  if (!id) return undefined;
  return allEntities(doc).find((e) => e.id === id);
}

// ------------------------------------------------- capability registries

export interface KindInfo<K extends string> {
  kind: K;
  label: string;
  available: boolean;
  /** Roadmap milestone that introduces it, for unavailable kinds. */
  milestone?: string;
}

export const GEOMETRY_KINDS: KindInfo<GeometryKind>[] = [
  { kind: "beam", label: "Beam", available: true },
  { kind: "tube", label: "Tube", available: false, milestone: "M6" },
  { kind: "plate", label: "Plate", available: false, milestone: "M7" },
  { kind: "membrane", label: "Membrane", available: false, milestone: "M7" },
  { kind: "cable", label: "Cable", available: false, milestone: "M7" },
  { kind: "boom", label: "Boom", available: false, milestone: "M6" },
];

export const ANALYSIS_KINDS: KindInfo<AnalysisKind>[] = [
  { kind: "static", label: "Static bending", available: true },
  { kind: "modal", label: "Modal", available: false, milestone: "M2" },
  { kind: "frf", label: "FRF", available: false, milestone: "M3" },
  { kind: "buckling", label: "Buckling", available: false, milestone: "M4" },
  { kind: "nonlinear", label: "Nonlinear", available: false, milestone: "M9" },
  { kind: "deployment", label: "Deployment", available: false, milestone: "M9" },
];
