import { useMemo } from "react";

export interface ScenePalette {
  background: string;
  beam: string;
  edge: string;
  accent: string;
  force: string;
  support: string;
  ghost: string;
  dimension: string;
  gridCell: string;
  gridSection: string;
  axisX: string;
  axisY: string;
  axisZ: string;
  axisLabel: string;
}

const css = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";

/** Scene colours derived from the active CSS theme tokens. */
export function useScenePalette(theme: "dark" | "light"): ScenePalette {
  return useMemo(() => {
    const dark = theme === "dark";
    return {
      background: css("--bg-viewport"),
      beam: dark ? "#aeb6c2" : "#9aa3af",
      edge: dark ? "#0b0d10" : "#3d4550",
      accent: css("--accent"),
      force: css("--force"),
      support: css("--support"),
      ghost: dark ? "#7d8796" : "#7a8492",
      dimension: css("--text-muted"),
      gridCell: dark ? "#2a3039" : "#d3d7dc",
      gridSection: dark ? "#3c4450" : "#b9bfc7",
      axisX: dark ? "#e0676b" : "#c9383d",
      axisY: dark ? "#6cc592" : "#2a8f55",
      axisZ: dark ? "#5b9dff" : "#1f6feb",
      axisLabel: dark ? "#0e1013" : "#ffffff",
    };
    // theme is the only input; the CSS variables change with it
  }, [theme]);
}
