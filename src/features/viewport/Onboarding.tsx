/**
 * First-run guide. Each step completes on a real user action (tracked in the
 * store), and each "Show me" focuses the control that performs it.
 */
import { ArrowRight, Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect } from "react";
import { formatNumber, formatQuantityText } from "@/core/units";
import { solveCantilever } from "@/lib/structures/cantilever";
import { withParameter } from "@/lib/structures/sensitivity";
import { IDS } from "@/model/document";
import { useLab, useSolved, type OnboardingState } from "@/state/store";
import { lengthForDeflectionRatio } from "../learn/explain";

type Step = Exclude<keyof OnboardingState, "dismissed" | "collapsed">;

/** Width of the overlay card; the camera fit keeps this much space clear. */
export const GUIDE_WIDTH = 252;

function focusParam(param: string) {
  const focusWhenReady = (attempt: number) => {
    const el = document.querySelector<HTMLInputElement>(`input[data-param="${param}"]`);
    if (!el) return;
    if (el.closest("[inert]") || el.getBoundingClientRect().width === 0) {
      if (attempt < 30) requestAnimationFrame(() => focusWhenReady(attempt + 1));
      return;
    }
    el.focus();
  };
  requestAnimationFrame(() => focusWhenReady(0));
}

/**
 * "panel" sits in the model-tree panel (desktop with the tree open) so it never
 * covers the model; "overlay" floats in the viewport's top-left corner.
 */
export function Onboarding({
  variant,
  forceCollapsed = false,
  onShowInspector,
}: {
  variant: "panel" | "overlay";
  /** Header only (short viewport), regardless of the stored preference. */
  forceCollapsed?: boolean;
  onShowInspector?(): void;
}) {
  const onboarding = useLab((s) => s.onboarding);
  const dismiss = useLab((s) => s.dismissOnboarding);
  const setCollapsed = useLab((s) => s.setGuideCollapsed);
  const workspace = useLab((s) => s.workspace);
  const select = useLab((s) => s.select);
  const setWorkspace = useLab((s) => s.setWorkspace);
  const setDockOpen = useLab((s) => s.setDockOpen);
  const collapsed = onboarding.collapsed || forceCollapsed;
  const solved = useSolved();
  const system = useLab((s) => s.unitSystem);
  // A compact guide stays discoverable without covering the working scene.
  // Opening it is an explicit choice in each workspace.
  useEffect(() => {
    if (variant === "overlay") setCollapsed(true);
  }, [variant, workspace, setCollapsed]);
  if (onboarding.dismissed) return null;

  // Step 1 turns a violated small-deflection assumption into the first lesson.
  let lengthHint = "Edit L. Tip deflection scales with L³.";
  if (solved?.ok) {
    const r = solved.value.result;
    const Lnew = lengthForDeflectionRatio(r.input, r.EI);
    if (r.deflectionRatio > 0.1 && Number.isFinite(Lnew)) {
      const after = solveCantilever(withParameter(r.input, "L", Lnew));
      lengthHint =
        `δ/L is ${formatNumber(100 * r.deflectionRatio, 3)}% — far outside linear theory. ` +
        `Try L = ${formatQuantityText(Lnew, "span", system)}: δ/L falls to ${formatNumber(100 * after.deflectionRatio, 2)}%.`;
    }
  }

  const steps: { id: Step; title: string; hint: string; show(): void }[] = [
    {
      id: "lengthChanged",
      title: "Change beam length",
      hint: lengthHint,
      show: () => {
        select(IDS.beam);
        onShowInspector?.();
        focusParam("L");
      },
    },
    {
      id: "stiffnessCompared",
      title: "Watch stiffness change",
      hint: "Edit h or E, or swap the material.",
      show: () => {
        select(IDS.beam);
        onShowInspector?.();
        focusParam("h");
      },
    },
    {
      id: "deformationInspected",
      title: "Inspect deformation",
      hint: "Try 10×, 50× or Auto — exaggeration is always labelled.",
      show: () =>
        requestAnimationFrame(() =>
          document.querySelector<HTMLButtonElement>('[data-testid="deform-scale"] [aria-checked="true"]')?.focus(),
        ),
    },
    {
      id: "whyOpened",
      title: "Open a Why?",
      hint: "The ? beside a result explains what drives it.",
      show: () => {
        setDockOpen(true);
        requestAnimationFrame(() => document.querySelector<HTMLButtonElement>("[data-why]")?.focus());
      },
    },
  ];
  const done = steps.filter((s) => onboarding[s.id]).length;
  const next = steps.find((s) => !onboarding[s.id]);
  const firstExperiment =
    workspace === "model" && variant === "overlay" && collapsed && !forceCollapsed && !onboarding.lengthChanged &&
    solved?.ok && solved.value.result.deflectionRatio > 0.1;
  const suggestedLength = solved?.ok
    ? lengthForDeflectionRatio(solved.value.result.input, solved.value.result.EI)
    : Number.NaN;

  return (
    <section
      className={
        variant === "overlay"
          ? "absolute top-2 left-2 rounded-md border border-line bg-panel/95 backdrop-blur-sm"
          : "mx-2 mb-2 rounded-md border border-line bg-raised/60"
      }
      style={variant === "overlay" ? { width: collapsed && !firstExperiment ? "auto" : GUIDE_WIDTH } : undefined}
      aria-label="Getting started"
      data-testid="onboarding"
      data-variant={variant}
    >
      <header className="flex h-8 items-center gap-2 pr-1 pl-2.5">
        <span className="caps flex-1">{firstExperiment ? "First experiment" : variant === "overlay" && collapsed ? "Guide" : "Get started"}</span>
        <span className="num text-[11px] text-faint">{done}/4</span>
        <button
          className="icon-btn h-6 w-6"
          disabled={forceCollapsed}
          aria-label={collapsed ? "Expand guide" : "Collapse guide"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
        <button className="icon-btn h-6 w-6" aria-label="Dismiss guide" onClick={dismiss}>
          <X size={14} />
        </button>
      </header>
      {firstExperiment && Number.isFinite(suggestedLength) && (
        <button
          className="flex w-full cursor-pointer items-center justify-between gap-2 border-t border-line px-2.5 py-2 text-left text-[12px] text-fg hover:bg-hover focus-visible:bg-hover"
          onClick={steps[0]!.show}
          data-testid="guide-first-experiment"
        >
          <span>Try L = <span className="num font-semibold">{formatQuantityText(suggestedLength, "span", system)}</span></span>
          <ArrowRight size={14} className="shrink-0 text-accent-text" aria-hidden />
        </button>
      )}
      {!collapsed && (
        <ol className="px-1.5 pb-1.5">
          {steps.map((s, i) => {
            const complete = onboarding[s.id];
            const current = next?.id === s.id;
            return (
              <li key={s.id}>
                <button
                  className={
                    "flex w-full cursor-pointer items-start gap-2 rounded-sm px-1.5 py-1.5 text-left transition-colors hover:bg-hover " +
                    (current ? "bg-raised" : "")
                  }
                  onClick={s.show}
                  data-testid={`onboarding-${s.id}`}
                  data-complete={complete || undefined}
                >
                  <span
                    className={
                      "mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[10px] " +
                      (complete ? "border-ok bg-ok text-app" : current ? "border-accent text-accent-text" : "border-line-strong text-faint")
                    }
                    aria-hidden
                  >
                    {complete ? <Check size={11} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={"block " + (complete ? "text-muted line-through decoration-faint" : "text-fg")}>
                      {s.title}
                      <span className="sr-only">{complete ? " (done)" : ""}</span>
                    </span>
                    {current && <span className="block text-[11px] text-muted">{s.hint}</span>}
                  </span>
                </button>
              </li>
            );
          })}
          {done === 4 && (
            <li className="flex items-center justify-between gap-2 px-1.5 pt-1.5">
              <span className="text-muted">All four done.</span>
              <button className="btn" onClick={() => setWorkspace("learn")}>
                Open Learn
              </button>
            </li>
          )}
        </ol>
      )}
    </section>
  );
}
