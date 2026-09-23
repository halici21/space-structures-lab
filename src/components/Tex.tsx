import katex from "katex";
import { memo, useMemo } from "react";

/** KaTeX-rendered math. `display` centres it as a block equation. */
export const Tex = memo(function Tex({
  tex,
  display = false,
  className = "",
  label,
}: {
  tex: string;
  display?: boolean;
  className?: string;
  /** Plain-text reading for assistive technology. */
  label?: string;
}) {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false, displayMode: display, output: "html" }),
    [tex, display],
  );
  return (
    <span
      className={(display ? "tex-display block " : "tex ") + className}
      role={label ? "math" : undefined}
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});
