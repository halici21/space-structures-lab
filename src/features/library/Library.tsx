/**
 * Space Structures Library — the product's direction, stated honestly.
 * Only the cantilever beam is modelled; every other entry is visibly
 * unavailable and cannot be opened.
 */
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { IDS } from "@/model/document";
import { useLab } from "@/state/store";

interface Entry {
  name: string;
  blurb: string;
  milestone: string;
}

const CATALOG: { category: string; entries: Entry[] }[] = [
  {
    category: "Deployables",
    entries: [
      { name: "Tape spring", blurb: "Curved thin strip; stores strain energy, snaps between states.", milestone: "M6" },
      { name: "Slit-tube boom", blurb: "Storable tubular mast (STEM) rolled flat onto a spool.", milestone: "M7" },
      { name: "TRAC boom", blurb: "Triangular rollable and collapsible composite boom.", milestone: "M7" },
      { name: "Lenticular boom", blurb: "Two bonded curved shells; high stiffness per stowed volume.", milestone: "M7" },
      { name: "Solar array", blurb: "Hinged or rolled panel wings with boom support.", milestone: "M7" },
    ],
  },
  {
    category: "Tension structures",
    entries: [
      { name: "Membrane", blurb: "Prestressed thin film; wrinkling and shape accuracy.", milestone: "M7" },
      { name: "Cable net", blurb: "Form-found cable network, e.g. mesh reflector support.", milestone: "M7" },
      { name: "Tensegrity", blurb: "Isolated struts held in a continuous tension network.", milestone: "M7" },
    ],
  },
  {
    category: "Precision structures",
    entries: [
      { name: "Optical bench", blurb: "Dimensionally stable platform for instruments.", milestone: "later" },
      { name: "Metering structure", blurb: "Holds optics at fixed separation under thermal load.", milestone: "later" },
      { name: "Isolation stage", blurb: "Attenuates disturbances between bus and payload.", milestone: "later" },
    ],
  },
];

export function LibraryDialog({ open, onOpenChange }: { open: boolean; onOpenChange(v: boolean): void }) {
  const doc = useLab((s) => s.doc);
  const createExample = useLab((s) => s.createExample);
  const select = useLab((s) => s.select);
  const setWorkspace = useLab((s) => s.setWorkspace);

  const openBeam = () => {
    if (!doc) createExample();
    else select(IDS.beam);
    setWorkspace("model");
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="pop fixed top-1/2 left-1/2 z-50 flex max-h-[min(640px,calc(100vh-32px))] w-[min(680px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col"
          data-testid="library"
        >
          <header className="flex items-start gap-3 border-b border-line px-4 py-3">
            <div className="flex-1">
              <Dialog.Title className="text-[14px] font-semibold">Space Structures Library</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-muted">
                Domain-aware structural primitives. This release models the cantilever beam only; the rest are planned and
                cannot be opened yet.
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-btn" aria-label="Close library">
              <X size={15} />
            </Dialog.Close>
          </header>

          <div className="min-h-0 overflow-y-auto px-4 py-3">
            <h3 className="caps mb-1.5">Available now</h3>
            <div className="mb-4 flex items-center gap-3 rounded-md border border-line bg-raised px-3 py-2.5">
              <div className="flex-1">
                <p className="font-medium text-fg">Cantilever beam</p>
                <p className="text-muted">Rectangular Euler–Bernoulli beam, fixed root, tip load. Static bending, Learn, sensitivity.</p>
              </div>
              <button className="btn btn-primary" onClick={openBeam} data-testid="library-open-beam">
                {doc ? "Go to beam" : "Create"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-x-5 gap-y-4 max-[640px]:grid-cols-1">
              {CATALOG.map((c) => (
                <section key={c.category}>
                  <h3 className="caps mb-1.5">{c.category}</h3>
                  <ul className="space-y-2">
                    {c.entries.map((e) => (
                      <li key={e.name} aria-disabled className="opacity-80">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-fg">{e.name}</span>
                          <span className="chip chip-info h-[18px] shrink-0 text-[10px]">
                            {e.milestone === "later" ? "Later" : `Planned · ${e.milestone}`}
                          </span>
                        </div>
                        <p className="text-[11.5px] leading-snug text-faint">{e.blurb}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
