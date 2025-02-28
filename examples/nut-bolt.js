/** @typedef { typeof import("replicad") } replicadLib */

/** @type {replicadLib} */
const { makeCylinder, drawPolysides } = replicad;

import {
  makeThread,
  trapezoidalThreadConfig,
  trapezoidalThreadConfigConjugate,
  metricThreadConfig,
} from "https://cdn.jsdelivr.net/npm/replicad-threads@latest/dist/studio/replicad-threads.js";

export const defaultParams = {
  height: 20,
  radius: 8,
  pitch: 2.5,
  tolerance: 0.1,
  metric: false,
};

export const defaultName = "Bolt and Nut";

export default function main({ pitch, radius, height, tolerance, metric }) {
  let config = {
    ...trapezoidalThreadConfig(pitch, 30, true),
    radius,
    height,
  };

  const diameter = Math.floor(radius * 2);
  const threadType = `M${diameter}`;
  if (metric) {
    config = metricThreadConfig(threadType, height);
  }
  const boltThread = makeThread(config);

  const boltHeight = 8;
  const baseRadius = Math.ceil(radius * 1.8);

  const bolt = boltThread
    .translate([0, 0, 2])
    .fuse(makeCylinder(config.radius, height + 4), {
      optimization: "commonFace",
    })
    .translate([0, 0, boltHeight])
    .fuse(
      drawPolysides(baseRadius, 6)
        .sketchOnPlane()
        .extrude(boltHeight)
        .chamfer(1, (e) => e.parallelTo("XY")),
    );

  const nutHeight = config.pitch * 2.5;

  let nutConfig = trapezoidalThreadConfigConjugate(config, tolerance);
  if (metric) {
    nutConfig = metricThreadConfig(threadType, nutHeight, false, tolerance);
  }
  const nutThread = makeThread({
    ...nutConfig,
    height: nutHeight,
  });

  const nut = drawPolysides(baseRadius, 6)
    .sketchOnPlane()
    .extrude(nutHeight + 4)
    .chamfer(1, (e) => e.parallelTo("XY"))
    .cut(makeCylinder(nutConfig.radius, nutHeight + 4))
    .fuse(nutThread.translate([0, 0, 2]));

  return [
    { shape: bolt, name: "Bolt" },
    { shape: nut, name: "Nut" },
  ];
}
