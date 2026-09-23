import * as Tooltip from "@radix-ui/react-tooltip";
import { useEffect, useState } from "react";
import { DesktopShell } from "@/features/shell/DesktopShell";
import { MobileShell } from "@/features/shell/MobileShell";
import { useShortcuts } from "@/features/shell/useShortcuts";

/** Below this width the CAD layout gives way to the viewport-first phone layout. */
const MOBILE_MAX = 767;

function useIsMobile() {
  const query = `(max-width: ${MOBILE_MAX}px)`;
  const [mobile, setMobile] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setMobile(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return mobile;
}

export function App() {
  const mobile = useIsMobile();
  useShortcuts();

  return <Tooltip.Provider delayDuration={350}>{mobile ? <MobileShell /> : <DesktopShell />}</Tooltip.Provider>;
}
