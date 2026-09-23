/**
 * Cross-section properties.
 *
 * Axis convention (Megson, "Aircraft Structures"): the member axis is z.
 * The section lies in the x–y plane with x horizontal (along the width b) and
 * y vertical (along the height h). Ixx is taken about the horizontal centroidal
 * axis, so it governs bending under a vertical (y-direction) load.
 *
 * All quantities are SI: m, m², m⁴.
 */

export interface RectangularSection {
  kind: "rectangular";
  /** Width along the section x-axis [m]. */
  b: number;
  /** Height along the section y-axis [m]. */
  h: number;
}

/**
 * Union of supported section shapes. Future members (circular tube,
 * thin-walled open, tape-spring arc, lenticular) extend this union and add a
 * case to `sectionProperties`; the solver only consumes `SectionProperties`.
 */
export type SectionShape = RectangularSection;

export interface SectionProperties {
  /** Cross-sectional area [m²]. */
  area: number;
  /** Second moment of area about the horizontal centroidal x-axis [m⁴]. */
  Ixx: number;
  /** Second moment of area about the vertical centroidal y-axis [m⁴]. */
  Iyy: number;
  /** Distance from the x-axis to the extreme fibre, i.e. for bending about x [m]. */
  cx: number;
  /** Distance from the y-axis to the extreme fibre, i.e. for bending about y [m]. */
  cy: number;
  /** Depth of the section in each bending plane [m] — used for slenderness. */
  depthY: number;
  depthX: number;
  /** Timoshenko shear coefficient κ [–] (5/6 for a solid rectangle). */
  kappa: number;
}

export function rectangularSection(b: number, h: number): RectangularSection {
  return { kind: "rectangular", b, h };
}

export function sectionProperties(section: SectionShape): SectionProperties {
  switch (section.kind) {
    case "rectangular": {
      const { b, h } = section;
      return {
        area: b * h,
        Ixx: (b * h ** 3) / 12,
        Iyy: (h * b ** 3) / 12,
        cx: h / 2,
        cy: b / 2,
        depthY: h,
        depthX: b,
        kappa: 5 / 6,
      };
    }
  }
}
