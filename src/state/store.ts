/**
 * Application store.
 *
 * `doc` is the physical model (SI, immutable updates). Everything else is
 * view or session state. Components read derived results through
 * `useSolved()`, which memoises the solve per document object.
 */
import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { UnitSystemId } from "@/core/units";
import type { BendingPlane, CantileverInput } from "@/lib/structures/cantilever";
import { getPreset, type MaterialPresetId } from "@/lib/structures/materials";
import type { ResponseKey } from "@/lib/structures/sensitivity";
import type { ParameterKey } from "@/lib/structures/validation";
import { createCantileverExample, resolveStaticBending, solveDocument } from "@/model/document";
import type { EntityId, LabDocument } from "@/model/schema";

export type Workspace = "model" | "physics" | "analyze" | "learn";
export type DockTab = "details" | "sensitivity" | "learn" | "assumptions";
export type DeformScale = "1" | "10" | "50" | "auto";
export type MobileSheet = "tree" | "inspector" | "results" | "learn" | null;
export type SweepParam = "L" | "h" | "b" | "E" | "F";
export type ChangeField = ParameterKey | "material" | "plane";

export interface ViewState {
  deformScale: DeformScale;
  showDeformed: boolean;
  showUndeformed: boolean;
  /** "auto" follows the workspace (on in Analyze). */
  contour: "auto" | "on" | "off";
  projection: "perspective" | "orthographic";
  showDimensions: boolean;
  showGrid: boolean;
  /** Re-frame the camera when an edit changes the model's size a lot. */
  autoFrame: boolean;
}

export interface OnboardingState {
  lengthChanged: boolean;
  stiffnessCompared: boolean;
  deformationInspected: boolean;
  whyOpened: boolean;
  dismissed: boolean;
  collapsed: boolean;
}

export interface CameraCommand {
  kind: "fit" | "reset" | "frame";
  target?: EntityId;
  nonce: number;
}

export interface ChangeReference {
  field: ChangeField;
  input: CantileverInput;
}

interface LabState {
  doc: LabDocument | null;
  selection: EntityId | null;
  hover: EntityId | null;
  workspace: Workspace;
  dockTab: DockTab;
  dockOpen: boolean;
  unitSystem: UnitSystemId;
  theme: "dark" | "light";
  view: ViewState;
  cameraCommand: CameraCommand | null;
  /** Model state before the current edit, for "what changed" explanations. */
  reference: ChangeReference | null;
  /** Snapshot taken when a field gains focus; promoted to `reference` on its first change. */
  pendingReference: ChangeReference | null;
  fieldErrors: Partial<Record<ParameterKey, string>>;
  onboarding: OnboardingState;
  sensitivity: { param: SweepParam; response: ResponseKey; logScale: boolean };
  treeExpanded: Record<string, boolean>;
  mobileSheet: MobileSheet;

  createExample(): void;
  resetProject(): void;
  select(id: EntityId | null): void;
  setHover(id: EntityId | null): void;
  setWorkspace(w: Workspace): void;
  setDockTab(t: DockTab): void;
  setDockOpen(open: boolean): void;
  setUnitSystem(u: UnitSystemId): void;
  setTheme(t: "dark" | "light"): void;
  setView(patch: Partial<ViewState>): void;
  camera(kind: CameraCommand["kind"], target?: EntityId): void;
  beginEdit(field: ChangeField): void;
  setParameter(key: ParameterKey, si: number): void;
  applyMaterialPreset(id: Exclude<MaterialPresetId, "custom">): void;
  setLoadPlane(plane: BendingPlane): void;
  toggleVisibility(id: EntityId): void;
  setFieldError(key: ParameterKey, message: string | null): void;
  markOnboarding(step: Exclude<keyof OnboardingState, "dismissed" | "collapsed">): void;
  setGuideCollapsed(collapsed: boolean): void;
  dismissOnboarding(): void;
  setSensitivity(patch: Partial<LabState["sensitivity"]>): void;
  toggleTree(section: string): void;
  setMobileSheet(s: MobileSheet): void;
}

const DEFAULT_VIEW: ViewState = {
  deformScale: "1",
  showDeformed: true,
  showUndeformed: true,
  contour: "auto",
  projection: "perspective",
  showDimensions: true,
  showGrid: true,
  autoFrame: true,
};

const DEFAULT_ONBOARDING: OnboardingState = {
  lengthChanged: false,
  stiffnessCompared: false,
  deformationInspected: false,
  whyOpened: false,
  dismissed: false,
  collapsed: false,
};

const WORKSPACE_DOCK: Record<Workspace, { tab: DockTab; open: boolean }> = {
  model: { tab: "details", open: false },
  physics: { tab: "details", open: false },
  analyze: { tab: "sensitivity", open: true },
  learn: { tab: "learn", open: true },
};

/** localStorage can throw (private mode, blocked storage); never let that break the app. */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

/**
 * Applies the theme to the document root. Called from the action itself (not
 * a React effect) so components that read CSS variables during render — the
 * 3D scene palette — already see the new theme's values.
 */
export function applyTheme(theme: "dark" | "light") {
  if (typeof document !== "undefined") document.documentElement.dataset.theme = theme;
}

function currentInput(doc: LabDocument | null): CantileverInput | null {
  if (!doc) return null;
  const r = resolveStaticBending(doc);
  return r.ok ? r.value.input : null;
}

/** Chooses the comparison baseline for an edit of `field`. */
function nextReference(
  s: Pick<LabState, "doc" | "reference" | "pendingReference">,
  field: ChangeField,
): Pick<LabState, "reference" | "pendingReference"> {
  if (s.pendingReference?.field === field) {
    return { reference: s.pendingReference, pendingReference: null };
  }
  if (s.reference?.field === field) return { reference: s.reference, pendingReference: null };
  const input = currentInput(s.doc);
  return { reference: input ? { field, input } : null, pendingReference: null };
}

function applyParameter(doc: LabDocument, key: ParameterKey, v: number): LabDocument {
  const beam = doc.geometry[0];
  if (!beam) return doc;
  switch (key) {
    case "L":
      return { ...doc, geometry: [{ ...beam, length: v }, ...doc.geometry.slice(1)] };
    case "b":
    case "h":
      return {
        ...doc,
        geometry: [{ ...beam, section: { ...beam.section, [key]: v } }, ...doc.geometry.slice(1)],
      };
    case "F":
      return { ...doc, loads: doc.loads.map((l, i) => (i === 0 ? { ...l, magnitude: v } : l)) };
    default: {
      return {
        ...doc,
        materials: doc.materials.map((m) => {
          if (m.id !== beam.materialId) return m;
          const base = getPreset(m.presetId);
          return {
            ...m,
            [key]: v,
            presetId: "custom",
            name: base ? `Custom (from ${base.shortName})` : m.name,
          };
        }),
      };
    }
  }
}

export const useLab = create<LabState>()(
  persist(
    (set, get) => ({
      doc: null,
      selection: null,
      hover: null,
      workspace: "model",
      dockTab: "details",
      dockOpen: false,
      unitSystem: "engineering",
      theme: "dark",
      view: DEFAULT_VIEW,
      cameraCommand: null,
      reference: null,
      pendingReference: null,
      fieldErrors: {},
      onboarding: DEFAULT_ONBOARDING,
      sensitivity: { param: "L", response: "tipDeflection", logScale: true },
      treeExpanded: { geometry: true, materials: true, constraints: true, loads: true, analyses: true },
      mobileSheet: null,

      createExample: () =>
        set({
          doc: createCantileverExample(),
          selection: "geo-beam-01",
          reference: null,
          pendingReference: null,
          fieldErrors: {},
          onboarding: DEFAULT_ONBOARDING,
          cameraCommand: { kind: "reset", nonce: Date.now() },
        }),

      resetProject: () =>
        set({
          doc: null,
          selection: null,
          hover: null,
          reference: null,
          pendingReference: null,
          fieldErrors: {},
          view: DEFAULT_VIEW,
          workspace: "model",
          dockOpen: false,
          dockTab: "details",
        }),

      select: (id) => set({ selection: id }),
      setHover: (id) => (get().hover === id ? undefined : set({ hover: id })),

      setWorkspace: (w) => set({ workspace: w, dockTab: WORKSPACE_DOCK[w].tab, dockOpen: WORKSPACE_DOCK[w].open }),
      setDockTab: (t) => set({ dockTab: t, dockOpen: true }),
      setDockOpen: (open) => set({ dockOpen: open }),
      setUnitSystem: (u) => set({ unitSystem: u }),
      setTheme: (t) => {
        applyTheme(t);
        set({ theme: t });
      },

      setView: (patch) =>
        set((s) => {
          const inspected =
            patch.deformScale !== undefined && patch.deformScale !== s.view.deformScale;
          return {
            view: { ...s.view, ...patch },
            onboarding: inspected ? { ...s.onboarding, deformationInspected: true } : s.onboarding,
          };
        }),

      camera: (kind, target) => set({ cameraCommand: { kind, target, nonce: Date.now() + Math.random() } }),

      beginEdit: (field) => {
        const input = currentInput(get().doc);
        set({ pendingReference: input ? { field, input } : null });
      },

      setParameter: (key, si) =>
        set((s) => {
          if (!s.doc) return {};
          const onboarding = { ...s.onboarding };
          if (key === "L") onboarding.lengthChanged = true;
          if (key === "h" || key === "b" || key === "E") onboarding.stiffnessCompared = true;
          const { [key]: _cleared, ...fieldErrors } = s.fieldErrors;
          return {
            ...nextReference(s, key),
            doc: applyParameter(s.doc, key, si),
            fieldErrors,
            onboarding,
          };
        }),

      applyMaterialPreset: (id) =>
        set((s) => {
          const preset = getPreset(id);
          const beam = s.doc?.geometry[0];
          if (!s.doc || !preset || !beam) return {};
          const { E: _e, rho: _r, nu: _n, strength: _st, ...fieldErrors } = s.fieldErrors;
          return {
            ...nextReference(s, "material"),
            fieldErrors,
            onboarding: { ...s.onboarding, stiffnessCompared: true },
            doc: {
              ...s.doc,
              materials: s.doc.materials.map((m) =>
                m.id === beam.materialId
                  ? {
                      ...m,
                      presetId: preset.id,
                      name: preset.name,
                      E: preset.E,
                      rho: preset.rho,
                      nu: preset.nu,
                      strength: preset.strength,
                    }
                  : m,
              ),
            },
          };
        }),

      setLoadPlane: (plane) =>
        set((s) => {
          if (!s.doc) return {};
          return {
            ...nextReference(s, "plane"),
            doc: { ...s.doc, loads: s.doc.loads.map((l, i) => (i === 0 ? { ...l, plane } : l)) },
          };
        }),

      toggleVisibility: (id) =>
        set((s) => {
          if (!s.doc) return {};
          const flip = <T extends { id: string; visible: boolean }>(xs: T[]) =>
            xs.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x));
          return {
            doc: {
              ...s.doc,
              geometry: flip(s.doc.geometry),
              constraints: flip(s.doc.constraints),
              loads: flip(s.doc.loads),
            },
          };
        }),

      setFieldError: (key, message) =>
        set((s) => {
          if ((s.fieldErrors[key] ?? null) === message) return {};
          const next = { ...s.fieldErrors };
          if (message) next[key] = message;
          else delete next[key];
          return { fieldErrors: next };
        }),

      markOnboarding: (step) =>
        set((s) => (s.onboarding[step] ? {} : { onboarding: { ...s.onboarding, [step]: true } })),
      dismissOnboarding: () => set((s) => ({ onboarding: { ...s.onboarding, dismissed: true } })),
      setGuideCollapsed: (collapsed) => set((s) => ({ onboarding: { ...s.onboarding, collapsed } })),
      setSensitivity: (patch) => set((s) => ({ sensitivity: { ...s.sensitivity, ...patch } })),
      toggleTree: (section) =>
        set((s) => ({ treeExpanded: { ...s.treeExpanded, [section]: !s.treeExpanded[section] } })),
      setMobileSheet: (sheet) => set({ mobileSheet: sheet }),
    }),
    {
      name: "ssl-lab-v1",
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      // New view/onboarding fields get their defaults when older saved state loads.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LabState>;
        return {
          ...current,
          ...p,
          view: { ...current.view, ...p.view },
          onboarding: { ...current.onboarding, ...p.onboarding },
        };
      },
      partialize: (s) => ({
        doc: s.doc,
        unitSystem: s.unitSystem,
        theme: s.theme,
        view: s.view,
        onboarding: s.onboarding,
        sensitivity: s.sensitivity,
        treeExpanded: s.treeExpanded,
      }),
    },
  ),
);

/** Solved view of the current document (memoised per document object). */
export function useSolved() {
  const doc = useLab((s) => s.doc);
  return doc ? solveDocument(doc) : null;
}

export function contourEnabled(view: ViewState, workspace: Workspace): boolean {
  return view.contour === "auto" ? workspace === "analyze" : view.contour === "on";
}
