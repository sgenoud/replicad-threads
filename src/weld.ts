import type { Face, Shell } from "replicad";
import { downcast, cast, GCWithScope, getOC } from "replicad";

export function weld(facesOrShells: (Face | Shell)[]): Shell {
  const oc = getOC();
  const r = GCWithScope();
  const shellBuilder = r(
    new oc.BRepBuilderAPI_Sewing(1e-6, true, true, true, false),
  );

  facesOrShells.forEach(({ wrapped }) => {
    shellBuilder.Add(wrapped);
  });

  shellBuilder.Perform(r(new oc.Message_ProgressRange_1()));

  const shell = cast(downcast(shellBuilder.SewedShape()));
  return shell as Shell;
}
