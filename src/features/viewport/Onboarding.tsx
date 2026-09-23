/**
 * First-run guide. Each step completes on a real user action (tracked in the
 * store), and each "Show me" focuses the control that performs it.
 */
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
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
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLInputElement>(`input[data-param="${param}"]`);
    el?.focus();
  });
}

/**
 * "panel" sits in the model-tree panel (desktop with the tree open) so it never
 * covers the model; "overlay" floats in the viewport's top-left corner.
 */
export function Onboarding({
  variant,
  forceCollapsed = false,
}: {
  variant: "panel" | "overlay";
  /** Header only (short viewport), regardless of the stored preference. */
  forceCollapsed?: boolean;
}) {
  const onboarding = useLab((s) => s.onboarding);
  const dismiss = useLab((s) => s.dismissOnboarding);
  const setCollapsed = useLab((s) => s.setGuideCollapsed);
  const select = useLab((s) => s.select);
  const setWorkspace = useLab((s) => s.setWorkspace);
  const setDockOpen = useLab((s) => s.setDockOpen);
  const collapsed = onboarding.collapsed || forceCollapsed;
  const solved = useSolved();
  const system = useLab((s) => s.unitSystem);
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
        focusParam("L");
      },
    },
    {
      id: "stiffnessCompared",
      title: "Watch stiffness change",
      hint: "Edit h or E, or swap the material.",
      show: () => {
        select(IDS.beam);
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

  return (
    <section
      className={
        variant === "overlay"
          ? "absolute top-2 left-2 rounded-md border border-line bg-panel/95 backdrop-blur-sm"
          : "mx-2 mb-2 rounded-md border border-line bg-raised/60"
      }
      style={variant === "overlay" ? { width: GUIDE_WIDTH } : undefined}
      aria-label="Getting started"
      data-testid="onboarding"
      data-variant={variant}
    >
      <header className="flex h-8 items-center gap-2 pr-1 pl-2.5">
        <span className="caps flex-1">Get started</span>
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
