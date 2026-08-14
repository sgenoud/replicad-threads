/** @typedef { typeof import("replicad") } replicadLib */

/** @type {replicadLib} */
const { makeCylinder } = replicad;

// The import below is rewritten by scripts/dev-studio.js to point at the
// locally built bundle. Edit this file and reload the studio to see changes.
import { makeThread, metricThreadConfig } from "__THREADS_LIB__";

export const defaultParams = {
  thread: "M8",
  height: 30,
};

export const defaultName = "Threaded rod";

export default function main({ thread, height }) {
  const config = metricThreadConfig(thread, height);

  return makeThread(config)
    .translate([0, 0, 2])
    .fuse(makeCylinder(config.radius, height + 4), {
      optimization: "commonFace",
    });
}
