/**
 * Contextual inspector: its content follows the selection. Every editable
 * value goes through NumberField (validated, SI in the store); every derived
 * value is read from the solved result, never recomputed here.
 */
import { AlertTriangle, X } from "lucide-react";
import type { ReactNode } from "react";
import { NumberField, ReadoutRow, SelectRow } from "@/components/Field";
import { Section } from "@/components/Section";
import { Segmented } from "@/components/Segmented";
import { UNIT_SYSTEMS, type UnitSystemId } from "@/core/units";
import type { BendingPlane } from "@/lib/structures/cantilever";
import { getPreset, MATERIAL_PRESETS, type MaterialPresetId } from "@/lib/structures/materials";
import type { CheckStatus } from "@/lib/structures/validity";
import type { SolvedDocument } from "@/model/document";
import { ANALYSIS_KINDS, findEntity, type Entity } from "@/model/schema";
import { useLab, useSolved, type DeformScale } from "@/state/store";
import { PanelTitle } from "../tree/ModelTree";
import { SectionSketch } from "./SectionSketch";

const KIND_LABEL: Record<Entity["category"], string> = {
  geometry: "Beam · rectangular section",
  material: "Material · isotropic, linear elastic",
  constraint: "Constraint",
  load: "Load",
  analysis: "Analysis",
};

export function Inspector({ showTitle = true }: { showTitle?: boolean }) {
  const doc = useLab((s) => s.doc);
  const selection = useLab((s) => s.selection);
  const select = useLab((s) => s.select);
  const solved = useSolved();
  const entity = doc ? findEntity(doc, selection) : undefined;

  return (
    <div className="flex h-full flex-col" data-testid="inspector">
      {showTitle && (
        <PanelTitle
          title={entity ? entity.name : "Inspector"}
          aside={
            entity ? (
              <button className="icon-btn -mr-1.5 h-6 w-6" aria-label="Clear selection (Esc)" title="Clear selection (Esc)" onClick={() => select(null)}>
                <X size={14} />
              </button>
            ) : null
          }
        />
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {!doc ? (
          <p className="p-3 text-muted">Nothing to inspect yet. Create a model to begin.</p>
        ) : !solved?.ok ? (
          <p className="p-3 text-violated">{solved?.reason}</p>
        ) : !entity ? (
          <ProjectInspector solved={solved.value} />
        ) : (
          <>
            <p className="border-b border-line px-3 py-1.5 text-[12.5px] text-faint">
              {!showTitle && <span className="mr-1.5 font-medium text-fg">{entity.name}</span>}
              {KIND_LABEL[entity.category]}
            </p>
            {entity.category === "geometry" && <BeamInspector solved={solved.value} />}
            {entity.category === "material" && <MaterialInspector solved={solved.value} standalone />}
            {entity.category === "constraint" && <SupportInspector solved={solved.value} />}
            {entity.category === "load" && <LoadInspector solved={solved.value} />}
            {entity.category === "analysis" && <AnalysisInspector solved={solved.value} />}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------- beam

function BeamInspector({ solved }: { solved: SolvedDocument }) {
  const { resolved, result } = solved;
  const { beam } = resolved;
  const plane = resolved.load.plane;
  const governsX = plane === "vertical";
  const badge = <span className="chip chip-accent h-4 px-1.5 text-[10px]">governs</span>;

  return (
    <>
      <Section title="Geometry">
        <NumberField param="L" kind="span" label="Length" symbol="L" value={beam.length} testId="field-L" />
        <NumberField param="b" kind="sectionDim" label="Width" symbol="b" value={beam.section.b} testId="field-b" />
        <NumberField param="h" kind="sectionDim" label="Height" symbol="h" value={beam.section.h} testId="field-h" />
        <SectionSketch b={beam.section.b} h={beam.section.h} plane={plane} />
      </Section>

      <MaterialInspector solved={solved} />

      <Section title="Section properties" defaultOpen={false}>
        <ReadoutRow label="Area" symbol="A" value={result.section.area} kind="area" testId="out-A" />
        <ReadoutRow
          label="About x–x"
          symbol="I_{xx}"
          value={result.section.Ixx}
          kind="inertia"
          aside={governsX ? badge : null}
          testId="out-Ixx"
        />
        <ReadoutRow
          label="About y–y"
          symbol="I_{yy}"
          value={result.section.Iyy}
          kind="inertia"
          aside={!governsX ? badge : null}
          testId="out-Iyy"
        />
        <ReadoutRow label="Extreme fibre" symbol="c" value={result.c} kind="sectionDim" />
        <p className="mt-1.5 text-[12px] leading-snug text-faint">
          I<sub>xx</sub> = bh³/12, I<sub>yy</sub> = hb³/12. The tip load is {governsX ? "vertical" : "lateral"}, so{" "}
          {governsX ? "Ixx" : "Iyy"} carries it.
        </p>
      </Section>

      <Section title="Derived" defaultOpen={false}>
        <ReadoutRow label="Axial stiffness" symbol="EA" value={result.EA} kind="axialStiffness" testId="out-EA" />
        <ReadoutRow label="Flexural stiffness" symbol="EI" value={result.EI} kind="flexuralStiffness" testId="out-EI" />
        <ReadoutRow label="Tip stiffness" symbol="k_{tip}" value={result.tipStiffness} kind="tipStiffness" testId="out-k" />
        <ReadoutRow label="Mass" symbol="m" value={result.mass} kind="mass" testId="out-mass" />
      </Section>
    </>
  );
}

// ------------------------------------------------------------------ material

export function MaterialInspector({ solved, standalone = false }: { solved: SolvedDocument; standalone?: boolean }) {
  const { material, beam } = solved.resolved;
  const applyPreset = useLab((s) => s.applyMaterialPreset);
  const preset = getPreset(material.presetId);
  const custom = material.presetId === "custom";
  const strengthLabel = preset?.strengthKind === "indicative" || custom ? "Strength (indicative)" : "Yield strength";

  return (
    <Section title="Material">
      <SelectRow
        label="Preset"
        value={material.presetId}
        onChange={(v) => v !== "custom" && applyPreset(v as Exclude<MaterialPresetId, "custom">)}
        testId="material-preset"
      >
        {MATERIAL_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.shortName}
          </option>
        ))}
        <option value="custom" disabled={!custom}>
          Custom{custom ? "" : " — edit any value"}
        </option>
      </SelectRow>
      {custom && <p className="mb-1 text-right text-[12px] text-faint">{material.name}</p>}
      <NumberField param="E" kind="modulus" label="Young's modulus" symbol="E" value={material.E} testId="field-E" />
      <NumberField param="rho" kind="density" label="Density" symbol="\rho" value={material.rho} testId="field-rho" />
      <NumberField param="nu" kind="poisson" label="Poisson's ratio" symbol="\nu" value={material.nu} testId="field-nu" />
      <NumberField param="strength" kind="stress" label={strengthLabel} symbol="\sigma_y" value={material.strength} testId="field-strength" />
      {preset?.simplified && (
        <p className="mt-2 flex gap-1.5 rounded-sm bg-[var(--caution-weak)] p-2 text-[12px] leading-snug text-caution" data-testid="cfrp-note">
          <AlertTriangle size={13} className="mt-px shrink-0" aria-hidden />
          <span>
            <b className="font-semibold">Simplified isotropic / educational.</b> {preset.note}
          </span>
        </p>
      )}
      <p className="mt-1.5 text-[12px] text-faint">
        ν is used only for the shear-deformation check (G = E/2(1+ν)).
        {standalone && <> Assigned to {beam.name}.</>}
      </p>
    </Section>
  );
}

// ------------------------------------------------------------------- support

function SupportInspector({ solved }: { solved: SolvedDocument }) {
  const { result, resolved } = solved;
  return (
    <>
      <Section title="Fixed support">
        <Fact label="Location">{resolved.beam.name} · root, z = 0</Fact>
        <Fact label="Restrains">all 6 DOF (u, v, w, θx, θy, θz)</Fact>
        <p className="mt-1.5 text-[12px] leading-snug text-faint">
          A clamp: no displacement and no rotation at the root, so v(0) = 0 and v′(0) = 0.
        </p>
      </Section>
      <Section title="Reactions">
        <ReadoutRow label="Shear force" symbol="R" value={result.rootShear} kind="force" testId="out-reaction" />
        <ReadoutRow label="Moment" symbol="M_R" value={result.rootMoment} kind="moment" testId="out-reaction-moment" />
        <p className="mt-1.5 text-[12px] leading-snug text-faint">
          Equilibrium of the whole beam: R = F and M<sub>R</sub> = F·L. They do not depend on E or the section.
        </p>
      </Section>
      <p className="px-3 py-2.5 text-[12px] text-faint">Pinned, spring and joint supports need the beam FEM solver (roadmap M8).</p>
    </>
  );
}

// ---------------------------------------------------------------------- load

const PLANE_OPTIONS: { value: BendingPlane; label: string }[] = [
  { value: "vertical", label: "−y  vertical" },
  { value: "lateral", label: "−x  lateral" },
];

function LoadInspector({ solved }: { solved: SolvedDocument }) {
  const { resolved } = solved;
  const setLoadPlane = useLab((s) => s.setLoadPlane);
  const plane = resolved.load.plane;
  return (
    <Section title="Tip force">
      <NumberField param="F" kind="force" label="Magnitude" symbol="F" value={resolved.load.magnitude} testId="field-F" />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-[3px]">
        <span className="text-muted">Direction</span>
        <Segmented label="Load direction" value={plane} options={PLANE_OPTIONS} onChange={setLoadPlane} testId="load-plane" />
      </div>
      <Fact label="Applied at">{resolved.beam.name} · free end, z = L</Fact>
      <Fact label="Bends about">
        {plane === "vertical" ? "x–x  (uses Ixx)" : "y–y  (uses Iyy)"}
      </Fact>
      <p className="mt-1.5 text-[12px] leading-snug text-faint">
        Static dead load: its direction stays fixed as the beam deflects.
      </p>
    </Section>
  );
}

// ------------------------------------------------------------------ analysis

const STATUS_CHIP: Record<CheckStatus, [string, string]> = {
  ok: ["chip-ok", "Within assumptions"],
  caution: ["chip-caution", "Near assumption limits"],
  violated: ["chip-violated", "Outside assumptions"],
  info: ["chip-info", "Solved"],
};

const SCALE_OPTIONS: { value: DeformScale; label: string }[] = [
  { value: "1", label: "1×" },
  { value: "10", label: "10×" },
  { value: "50", label: "50×" },
  { value: "auto", label: "Auto" },
];

function AnalysisInspector({ solved }: { solved: SolvedDocument }) {
  const view = useLab((s) => s.view);
  const setView = useLab((s) => s.setView);
  const setDockTab = useLab((s) => s.setDockTab);
  const [cls, text] = STATUS_CHIP[solved.status];
  const violated = solved.checks.filter((c) => c.status === "violated").length;
  const caution = solved.checks.filter((c) => c.status === "caution").length;

  return (
    <>
      <Section title="Static bending">
        <Fact label="Theory">Euler–Bernoulli beam</Fact>
        <Fact label="Solution">Closed form · updates live</Fact>
        <Fact label="Status">
          <span className={"chip " + cls}>{text}</span>
        </Fact>
        {(violated > 0 || caution > 0) && (
          <p className="mt-1 text-[12px] text-muted">
            {violated > 0 && <>{violated} violated</>}
            {violated > 0 && caution > 0 && " · "}
            {caution > 0 && <>{caution} near limit</>}.{" "}
            <button className="cursor-pointer text-accent-text underline-offset-2 hover:underline" onClick={() => setDockTab("assumptions")}>
              Review assumptions
            </button>
          </p>
        )}
      </Section>
      <Section title="Result display">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-[3px]">
          <span className="text-muted">Deformation</span>
          <Segmented label="Deformation display scale" value={view.deformScale} options={SCALE_OPTIONS} onChange={(v) => setView({ deformScale: v, showDeformed: true })} />
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 py-[3px]">
          <span className="text-muted">Stress contour</span>
          <Segmented
            label="Stress contour"
            value={view.contour}
            options={[
              { value: "auto", label: "Auto" },
              { value: "on", label: "On" },
              { value: "off", label: "Off" },
            ]}
            onChange={(v) => setView({ contour: v })}
          />
        </div>
        <p className="mt-1 text-[12px] text-faint">Auto shows the contour in the Analyze workspace.</p>
      </Section>
      <Section title="Analysis types">
        <ul className="space-y-0.5">
          {ANALYSIS_KINDS.map((k) => (
            <li key={k.kind} className="flex h-6 items-center justify-between">
              <span className={k.available ? "text-fg" : "text-faint"}>{k.label}</span>
              {k.available ? (
                <span className="chip chip-ok h-[18px] text-[10px]">Active</span>
              ) : (
                <span className="chip chip-info h-[18px] text-[10px]">Planned · {k.milestone}</span>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

// ------------------------------------------------------------------- project

function ProjectInspector({ solved }: { solved: SolvedDocument }) {
  const doc = useLab((s) => s.doc)!;
  const unitSystem = useLab((s) => s.unitSystem);
  const setUnitSystem = useLab((s) => s.setUnitSystem);
  const count = doc.geometry.length + doc.materials.length + doc.constraints.length + doc.loads.length + doc.analyses.length;
  return (
    <>
      <Section title="Project">
        <Fact label="Name">{doc.name}</Fact>
        <Fact label="Entities">{count}</Fact>
        <Fact label="Analysis">{solved.resolved.analysis.name}</Fact>
      </Section>
      <Section title="Units">
        <SelectRow label="Display" value={unitSystem} onChange={(v) => setUnitSystem(v as UnitSystemId)} testId="unit-system">
          {(Object.keys(UNIT_SYSTEMS) as UnitSystemId[]).map((id) => (
            <option key={id} value={id}>
              {UNIT_SYSTEMS[id].label}
            </option>
          ))}
        </SelectRow>
        <p className="mt-1 text-[12px] text-faint">Display only. The model is always stored in SI.</p>
      </Section>
      <p className="px-3 py-3 text-muted">Select an item in the tree, or click the beam, support or load in the viewport.</p>
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-h-[24px] grid-cols-[88px_minmax(0,1fr)] items-center gap-x-2">
      <span className="text-muted">{label}</span>
      <span className="min-w-0 text-fg">{children}</span>
    </div>
  );
}
