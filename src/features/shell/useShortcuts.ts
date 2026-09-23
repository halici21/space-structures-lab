import { useEffect } from "react";
import { useLab, type DeformScale, type Workspace } from "@/state/store";

const WS: Record<string, Workspace> = { "1": "model", "2": "physics", "3": "analyze", "4": "learn" };
const SCALES: DeformScale[] = ["1", "10", "50", "auto"];

function isTyping(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/** Global shortcuts. Ignored while typing in a field; Esc defers to open popovers/dialogs. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      const s = useLab.getState();
      if (e.key === "Escape") {
        if (document.querySelector("[data-radix-popper-content-wrapper], [role=dialog]")) return;
        if (isTyping(e.target)) return;
        s.select(null);
        return;
      }
      if (isTyping(e.target) || !s.doc) return;
      const k = e.key.toLowerCase();
      if (WS[e.key]) s.setWorkspace(WS[e.key]!);
      else if (k === "f") s.camera("fit");
      else if (k === "h") s.camera("reset");
      else if (k === "p") s.setView({ projection: s.view.projection === "perspective" ? "orthographic" : "perspective" });
      else if (k === "d") {
        const i = SCALES.indexOf(s.view.deformScale);
        s.setView({ deformScale: SCALES[(i + 1) % SCALES.length]!, showDeformed: true });
      } else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
